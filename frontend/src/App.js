require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || "parksmart-secret-2024";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service role key (backend only)
);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST","PUT","DELETE"] },
  transports: ["websocket","polling"],
  pingTimeout: 60000,
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// ─── Scanner registry (in-memory for speed) ──────────────────────────────────
const scannerRegistry = new Map();


// ─── SETUP: Create/reset admin (only works if no admin exists or for existing admin) ──
app.post("/api/setup/admin", async (req, res) => {
  const { secretKey, email, password } = req.body;
  if (secretKey !== (process.env.SETUP_SECRET || "parksmart-setup-2024"))
    return res.status(403).json({ error: "Invalid setup key" });
  const hash = await bcrypt.hash(password, 10);
  const { data: existing } = await supabase.from("users").select("id").eq("email", email).single();
  if (existing) {
    await supabase.from("users").update({ password_hash: hash, role: "admin" }).eq("email", email);
    return res.json({ message: "Admin password updated" });
  }
  await supabase.from("users").insert({ full_name: "ParkSmart Admin", email, phone: "+254 700 000 000", password_hash: hash, role: "admin" });
  res.json({ message: "Admin account created" });
});

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get("/health", async (_, res) => {
  const { count } = await supabase.from("spots").select("*", { count: "exact", head: true });
  res.json({ status: "ok", uptime: process.uptime(), spots: count, connections: io.engine.clientsCount });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { fullName, email, phone, password, role = "driver" } = req.body;
  if (!fullName || !email || !phone || !password)
    return res.status(400).json({ error: "All fields required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be 6+ characters" });
  if (!["driver","provider"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const { data: existing } = await supabase.from("users").select("id").eq("email", email.toLowerCase()).single();
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const { data: user, error } = await supabase.from("users").insert({
    full_name: fullName.trim(), email: email.toLowerCase().trim(),
    phone: phone.trim(), password_hash: passwordHash, role,
    is_verified: false,
  }).select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,created_at").single();

  if (error) return res.status(500).json({ error: "Registration failed" });

  // Generate and send OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  await supabase.from("otp_codes").insert({ user_id: user.id, email: email.toLowerCase(), otp_hash: await bcrypt.hash(otp, 8), expires_at: expiresAt, type: "verify" });

  // Send OTP via Supabase email (uses built-in SMTP)
  await supabase.auth.admin.sendRawEmail({
    to: email.toLowerCase(),
    subject: "ParkSmart — Verify your account",
    html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;background:#0A0F1E;color:#F0F4FF;border-radius:16px">
      <h2 style="color:#00E5A0;margin:0 0 8px">ParkSmart 🅿️</h2>
      <p style="color:#6B7A99;margin:0 0 20px">Welcome, ${fullName.split(" ")[0]}! Your verification code:</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#00E5A0;text-align:center;padding:16px;background:#111827;border-radius:12px;margin-bottom:20px">${otp}</div>
      <p style="color:#6B7A99;font-size:13px;margin:0">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>`,
  }).catch(() => {}); // Silently fail if email not configured — OTP still works via SMS

  // Also log OTP to console in dev (replace with real SMS in prod)
  if (process.env.NODE_ENV !== "production") console.log(`[OTP] ${email}: ${otp}`);

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user, requiresVerification: true });
});

// ── Send OTP (for registration verification or phone verification) ────────────
app.post("/api/auth/send-otp", authLimiter, async (req, res) => {
  const { email, phone, type = "verify" } = req.body;
  if (!email && !phone) return res.status(400).json({ error: "Email or phone required" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Find user
  let userQuery = supabase.from("users").select("id,full_name,email,phone");
  if (email) userQuery = userQuery.eq("email", email.toLowerCase());
  else userQuery = userQuery.eq("phone", phone);
  const { data: user } = await userQuery.single();
  if (!user) return res.status(404).json({ error: "Account not found" });

  await supabase.from("otp_codes").insert({ user_id: user.id, email: user.email, phone: user.phone, otp_hash: await bcrypt.hash(otp, 8), expires_at: expiresAt, type });

  // Send via email
  if (email || user.email) {
    await supabase.auth.admin.sendRawEmail({
      to: user.email,
      subject: type === "verify" ? "ParkSmart — Verify your account" : "ParkSmart — Your login code",
      html: `<div style="font-family:sans-serif;padding:24px;background:#0A0F1E;color:#F0F4FF;border-radius:16px;max-width:400px">
        <h2 style="color:#00E5A0">ParkSmart 🅿️</h2>
        <p style="color:#6B7A99">Your ${type === "verify" ? "verification" : "login"} code:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#00E5A0;text-align:center;padding:16px;background:#111827;border-radius:12px;margin-bottom:16px">${otp}</div>
        <p style="color:#6B7A99;font-size:13px">Expires in 10 minutes.</p>
      </div>`,
    }).catch(() => {});
  }

  if (process.env.NODE_ENV !== "production") console.log(`[OTP] ${user.email || user.phone}: ${otp}`);
  res.json({ message: `OTP sent to ${email ? "your email" : "your phone"}`, userId: user.id });
});

// ── Verify OTP ────────────────────────────────────────────────────────────────
app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ error: "userId and otp required" });

  const { data: codes } = await supabase.from("otp_codes")
    .select("*").eq("user_id", userId).eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(5);

  if (!codes?.length) return res.status(400).json({ error: "OTP expired or not found. Request a new one." });

  // Check against all recent valid codes
  let matched = null;
  for (const code of codes) {
    const valid = await bcrypt.compare(otp, code.otp_hash);
    if (valid) { matched = code; break; }
  }
  if (!matched) return res.status(400).json({ error: "Incorrect OTP. Please try again." });

  // Mark used
  await supabase.from("otp_codes").update({ used: true }).eq("id", matched.id);
  // Mark user as verified
  await supabase.from("users").update({ is_verified: true, updated_at: new Date().toISOString() }).eq("id", userId);

  const { data: user } = await supabase.from("users").select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,wallet_balance,created_at").eq("id", userId).single();
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user, message: "Account verified successfully" });
});

// ── Google OAuth callback ─────────────────────────────────────────────────────
// Called after Supabase Google OAuth succeeds — exchanges Supabase session for ParkSmart JWT
app.post("/api/auth/google", async (req, res) => {
  const { accessToken, role = "driver" } = req.body;
  if (!accessToken) return res.status(400).json({ error: "accessToken required" });

  // Verify the Supabase access token
  const { data: { user: supaUser }, error } = await supabase.auth.getUser(accessToken);
  if (error || !supaUser) return res.status(401).json({ error: "Invalid Google token" });

  const email = supaUser.email?.toLowerCase();
  const fullName = supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || email.split("@")[0];

  // Find or create user in our users table
  let { data: user } = await supabase.from("users").select("*").eq("email", email).single();

  if (!user) {
    const { data: newUser } = await supabase.from("users").insert({
      full_name: fullName, email, phone: "", password_hash: "", role,
      is_verified: true, // Google accounts are pre-verified
    }).select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,created_at").single();
    user = newUser;
  }

  if (!user) return res.status(500).json({ error: "Failed to create account" });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const { data: user } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).single();
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const { data: user } = await supabase.from("users").select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,notifications,created_at").eq("id", req.user.userId).single();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.put("/api/auth/me", requireAuth, async (req, res) => {
  const { fullName, phone, vehicles, notifications, currentPassword, newPassword } = req.body;
  const updates = {};
  if (fullName) updates.full_name = fullName.trim();
  if (phone) updates.phone = phone.trim();
  if (vehicles !== undefined) updates.vehicles = vehicles;
  if (notifications !== undefined) updates.notifications = notifications;
  updates.updated_at = new Date().toISOString();

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: "Current password required" });
    const { data: user } = await supabase.from("users").select("password_hash").eq("id", req.user.userId).single();
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Current password incorrect" });
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  const { data: updated } = await supabase.from("users").update(updates).eq("id", req.user.userId)
    .select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,notifications").single();
  res.json({ user: updated, message: "Profile updated" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPOTS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/spots", async (req, res) => {
  const { area, type, search } = req.query;
  let query = supabase.from("spots").select("*").eq("is_active", true).eq("is_approved", true);
  if (area) query = query.ilike("area", `%${area}%`);
  if (type) query = query.eq("type", type);
  if (search) query = query.or(`name.ilike.%${search}%,area.ilike.%${search}%,address.ilike.%${search}%`);
  const { data: spots, error } = await query.order("rating", { ascending: false });
  if (error) return res.status(500).json({ error: "Failed to load spots" });
  res.json({ spots: spots || [], total: spots?.length || 0, timestamp: Date.now() });
});

app.get("/api/spots/:id", async (req, res) => {
  const { data: spot } = await supabase.from("spots").select("*").eq("id", req.params.id).single();
  if (!spot) return res.status(404).json({ error: "Spot not found" });
  res.json(spot);
});

// Returns the specific spot numbers currently taken at a location (active confirmed bookings)
app.get("/api/spots/:id/taken", async (req, res) => {
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("spot_number, arrive_at, expires_at")
    .eq("spot_id", req.params.id)
    .eq("status", "confirmed")
    .not("spot_number", "is", null)
    .gt("expires_at", now); // only bookings that haven't expired yet
  const takenSpots = (bookings || [])
    .map(b => b.spot_number)
    .filter(Boolean);
  res.json({ taken: takenSpots });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKINGS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/bookings", requireAuth, async (req, res) => {
  const { spotId, hours, arriveAt, startTime, endTime, vehiclePlate, spotNumber, paymentMethod } = req.body;
  if (!spotId || !hours || !vehiclePlate)
    return res.status(400).json({ error: "spotId, hours, vehiclePlate required" });

  // ── FIX 3: Atomic optimistic-lock decrement prevents double-booking ──────────
  // First read the spot
  const { data: spot } = await supabase.from("spots").select("*").eq("id", spotId).single();
  if (!spot) return res.status(404).json({ error: "Spot not found" });
  if (!spot.is_active || !spot.is_approved) return res.status(404).json({ error: "Spot not available" });
  if (spot.available_spaces <= 0) return res.status(409).json({ error: "This spot is full. Please choose another." });

  // Atomic decrement: only succeeds if available_spaces still equals what we read.
  // If a concurrent request already decremented it, this update matches 0 rows → conflict.
  const { data: claimed, error: claimErr } = await supabase
    .from("spots")
    .update({ available_spaces: spot.available_spaces - 1, updated_at: new Date().toISOString() })
    .eq("id", spotId)
    .eq("available_spaces", spot.available_spaces) // optimistic lock
    .select("id,available_spaces,total_spaces")
    .single();

  if (claimErr || !claimed) {
    return res.status(409).json({ error: "This spot was just taken by someone else. Please refresh and try again." });
  }

  // ── FIX: Validate specific spot number isn't already booked ─────────────────
  if (spotNumber) {
    const now = new Date().toISOString();
    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id")
      .eq("spot_id", spotId)
      .eq("spot_number", spotNumber)
      .eq("status", "confirmed")
      .gt("expires_at", now)
      .limit(1)
      .single();

    if (conflicting) {
      // Rollback the space we just claimed since we can't use it
      await supabase.from("spots")
        .update({ available_spaces: spot.available_spaces, updated_at: new Date().toISOString() })
        .eq("id", spotId);
      return res.status(409).json({ error: `Spot #${spotNumber} was just booked by someone else. Please pick a different spot.` });
    }
  }

  // ── FIX 1: Use parseFloat (not parseInt) so 1.5hr stays 1.5hr ───────────────
  const hoursFloat = parseFloat(parseFloat(hours).toFixed(4));
  const total = Math.round((spot.price_per_hour || 0) * hoursFloat);
  const commission = Math.round(total * 0.20);
  const providerAmount = total - commission;

  // FIX: Treat HH:MM as Nairobi time (UTC+3) regardless of server timezone.
  // Render runs in UTC, so d.setHours() would interpret 09:30 as 09:30 UTC
  // (= 12:30 EAT on the user's phone). We offset by +3 hours to get the
  // correct UTC equivalent of the Nairobi local time the user entered.
  const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3
  const resolveTime = (hhMM) => {
    if (!hhMM) return null;
    // If it's already a full ISO string, use it directly
    if (hhMM.includes("T") || hhMM.includes("Z")) return new Date(hhMM).toISOString();
    const [h, m] = hhMM.split(":").map(Number);
    // Build today's date in UTC, then subtract 3h to get UTC equivalent of EAT time
    const now = new Date();
    // Start of today in Nairobi: midnight EAT = 21:00 UTC previous day
    const todayNairobiMidnightUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - NAIROBI_OFFSET_MS
    );
    const d = new Date(todayNairobiMidnightUTC.getTime() + h * 3600000 + m * 60000);
    // If that time is more than 1 min in the past, push to tomorrow
    if (d.getTime() < Date.now() - 60000) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  };

  const arriveAtISO = arriveAt || resolveTime(startTime) || new Date().toISOString();
  const arriveMs = new Date(arriveAtISO).getTime();

  // expires_at uses hoursFloat — so a 90-min booking expires in exactly 90 minutes
  const expiresAt = endTime
    ? (() => {
        const iso = resolveTime(endTime);
        if (iso && new Date(iso).getTime() <= arriveMs)
          return new Date(new Date(iso).getTime() + 24 * 3600000).toISOString();
        return iso || new Date(arriveMs + hoursFloat * 3600000).toISOString();
      })()
    : new Date(arriveMs + hoursFloat * 3600000).toISOString();

  const bookingId = "PS-" + Math.floor(100000 + Math.random() * 900000);

  const { data: booking, error } = await supabase.from("bookings").insert({
    id: bookingId,
    spot_id: spotId,
    user_id: req.user.userId,
    provider_id: spot.provider_id,
    vehicle_plate: vehiclePlate.toUpperCase(),
    hours: hoursFloat,
    arrive_at: arriveAtISO,
    expires_at: expiresAt,
    total_amount: total,
    commission_amount: commission,
    provider_amount: providerAmount,
    spot_name: spot.name,
    spot_address: spot.address,
    spot_number: spotNumber || null,
    payment_method: paymentMethod || "M-Pesa",
    // Wallet payments are instant — mark as paid immediately
    payment_status: paymentMethod === "wallet" ? "paid" : "pending",
  }).select("*").single();

  if (error) {
    // Rollback the claimed space so it's not lost
    await supabase.from("spots")
      .update({ available_spaces: spot.available_spaces, updated_at: new Date().toISOString() })
      .eq("id", spotId);
    return res.status(500).json({ error: "Booking failed. Your spot has been released." });
  }

  // Broadcast real-time update to ALL clients immediately
  io.emit("spot:updated", { spotId, available: claimed.available_spaces, total: claimed.total_spaces });

  res.status(201).json({ booking });
});

app.get("/api/bookings/me", requireAuth, async (req, res) => {
  const { data: bookings } = await supabase.from("bookings").select("*")
    .eq("user_id", req.user.userId).order("created_at", { ascending: false });
  res.json({ bookings: bookings || [] });
});

app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", req.params.id).single();
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.user_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

  const { data: updated } = await supabase.from("bookings").update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", req.params.id).select("*").single();

  // Release the reserved spot — restore available_spaces
  const { data: spot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", booking.spot_id).single();
  if (spot) {
    const newAvail = Math.min(spot.total_spaces || 999, (spot.available_spaces || 0) + 1);
    await supabase.from("spots").update({ available_spaces: newAvail }).eq("id", booking.spot_id);
    io.emit("spot:updated", { spotId: booking.spot_id, available: newAvail, total: spot.total_spaces });
  }

  res.json({ message: "Booking cancelled", booking: updated });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/payments/mpesa/stkpush", requireAuth, authLimiter, async (req, res) => {
  const { phone, amount, bookingId } = req.body;
  if (!phone || !amount || !bookingId) return res.status(400).json({ error: "phone, amount, bookingId required" });

  const checkoutId = "ws_CO_" + Date.now();

  // Simulate M-Pesa (replace with real Daraja API in production)
  setTimeout(async () => {
    const { data: booking } = await supabase.from("bookings").update({
      payment_status: "paid", mpesa_checkout_id: checkoutId, updated_at: new Date().toISOString()
    }).eq("id", bookingId).select("*").single();

    if (booking) {
      // Update loyalty points
      const { data: user } = await supabase.from("users").select("loyalty_points").eq("id", booking.user_id).single();
      const newPoints = (user?.loyalty_points || 0) + Math.floor(booking.total_amount / 10);
      await supabase.from("users").update({ loyalty_points: newPoints }).eq("id", booking.user_id);

      // Create provider payment record
      if (booking.provider_id) {
        await supabase.from("provider_payments").insert({
          provider_id: booking.provider_id,
          booking_id: bookingId,
          amount: booking.provider_amount,
          commission: booking.commission_amount,
          status: "paid",
          paid_at: new Date().toISOString(),
        });
        // Update provider total earned
        const { data: pd } = await supabase.from("provider_details").select("total_earned,total_commission_paid").eq("provider_id", booking.provider_id).single();
        if (pd) {
          await supabase.from("provider_details").update({
            total_earned: (pd.total_earned||0) + booking.provider_amount,
            total_commission_paid: (pd.total_commission_paid||0) + booking.commission_amount,
          }).eq("provider_id", booking.provider_id);
        }
      }

      // Broadcast updated spot availability
      const { data: spot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", booking.spot_id).single();
      if (spot) io.emit("spot:updated", { spotId: booking.spot_id, available: spot.available_spaces, total: spot.total_spaces });

      io.to(`user:${booking.user_id}`).emit("payment:confirmed", { bookingId, checkoutId });
    }
  }, 3000);

  res.json({ CheckoutRequestID: checkoutId, ResponseCode: "0", ResponseDescription: "Success" });
});

// POST /api/payments/overstay — manual overstay payment trigger (fallback if STK auto-push fails)
app.post("/api/payments/overstay", requireAuth, authLimiter, async (req, res) => {
  const { overstayId, phone } = req.body;
  if (!overstayId) return res.status(400).json({ error: "overstayId required" });

  const { data: overstay } = await supabase.from("overstay_payments")
    .select("*").eq("id", overstayId).eq("user_id", req.user.userId).single();
  if (!overstay) return res.status(404).json({ error: "Overstay record not found" });
  if (overstay.status === "paid") return res.status(400).json({ error: "Already paid" });

  const payPhone = phone || (await supabase.from("users").select("phone").eq("id", req.user.userId).single()).data?.phone;
  const checkoutId = "OS_CO_" + Date.now();

  // Simulate M-Pesa STK push — replace with real Daraja in prod
  setTimeout(async () => {
    await supabase.from("overstay_payments")
      .update({ status:"paid", checkout_id:checkoutId, paid_at:new Date().toISOString() })
      .eq("id", overstayId);
    await supabase.from("bookings")
      .update({ status:"completed", updated_at:new Date().toISOString() })
      .eq("id", overstay.booking_id);

    // Restore space
    const { data: spot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", overstay.spot_id).single();
    if (spot) {
      const newAvail = Math.min(spot.total_spaces||999, (spot.available_spaces||0)+1);
      await supabase.from("spots").update({ available_spaces: newAvail }).eq("id", overstay.spot_id);
      await supabase.from("space_events").insert({ spot_id:overstay.spot_id, available_spaces:newAvail, event_type:"exit", triggered_by:"overstay-payment" });
      io.emit("spot:updated", { spotId:overstay.spot_id, available:newAvail, total:spot.total_spaces });
    }

    // Signal gate to open
    io.to(`scanner:${overstay.scanner_id}`).emit("gate:open", { plate:overstay.plate, overstayId, reason:"Overstay payment confirmed" });

    // Notify user
    io.to(`user:${overstay.user_id}`).emit("overstay:paid", {
      overstayId, bookingId:overstay.booking_id,
      minutes:overstay.minutes, charge:overstay.amount,
      plate:overstay.plate,
    });
  }, 5000);

  res.json({ CheckoutRequestID: checkoutId, ResponseCode: "0", message: `STK push sent to ${payPhone}` });
});
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/wallet — returns current balance
app.get("/api/wallet", requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("wallet_balance")
    .eq("id", req.user.userId)
    .single();
  res.json({ balance: user?.wallet_balance || 0 });
});

// POST /api/wallet/topup — add funds (from M-Pesa or manual)
app.post("/api/wallet/topup", requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: "Valid amount required" });

  const { data: user } = await supabase
    .from("users").select("wallet_balance").eq("id", req.user.userId).single();
  const current = user?.wallet_balance || 0;
  const newBalance = current + Math.round(Number(amount));

  const { data: updated } = await supabase
    .from("users")
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", req.user.userId)
    .select("wallet_balance").single();

  res.json({ balance: updated?.wallet_balance || newBalance, message: "Wallet topped up" });
});

// POST /api/wallet/deduct — deduct funds for a booking payment
app.post("/api/wallet/deduct", requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: "Valid amount required" });

  const { data: user } = await supabase
    .from("users").select("wallet_balance").eq("id", req.user.userId).single();
  const current = user?.wallet_balance || 0;
  const deduction = Math.round(Number(amount));

  if (current < deduction)
    return res.status(400).json({ error: "Insufficient wallet balance" });

  const newBalance = current - deduction;
  const { data: updated } = await supabase
    .from("users")
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", req.user.userId)
    .select("wallet_balance").single();

  res.json({ balance: updated?.wallet_balance ?? newBalance, message: "Payment deducted from wallet" });
});

// POST /api/wallet/refund — refund funds back to wallet (on cancellation / early exit)
app.post("/api/wallet/refund", requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) < 0)
    return res.status(400).json({ error: "Valid amount required" });

  const { data: user } = await supabase
    .from("users").select("wallet_balance").eq("id", req.user.userId).single();
  const current = user?.wallet_balance || 0;
  const newBalance = current + Math.round(Number(amount));

  const { data: updated } = await supabase
    .from("users")
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", req.user.userId)
    .select("wallet_balance").single();

  res.json({ balance: updated?.wallet_balance || newBalance, message: "Refund added to wallet" });
});
// ═══════════════════════════════════════════════════════════════════════════════

// Register as provider (save business details)
app.post("/api/provider/register", requireAuth, requireRole("provider","admin"), async (req, res) => {
  const { businessName, mpesaPhone, mpesaAccount, idNumber, kraPin } = req.body;
  if (!businessName || !mpesaPhone) return res.status(400).json({ error: "Business name and M-Pesa phone required" });

  const { data, error } = await supabase.from("provider_details").upsert({
    provider_id: req.user.userId,
    business_name: businessName,
    mpesa_phone: mpesaPhone,
    mpesa_account: mpesaAccount,
    id_number: idNumber,
    kra_pin: kraPin,
    updated_at: new Date().toISOString(),
  }).select("*").single();

  if (error) return res.status(500).json({ error: "Failed to save provider details" });
  res.json({ provider: data, message: "Provider details saved" });
});

// Get provider details
app.get("/api/provider/me", requireAuth, requireRole("provider","admin"), async (req, res) => {
  const { data } = await supabase.from("provider_details").select("*").eq("provider_id", req.user.userId).single();
  res.json({ provider: data });
});

// Add a parking spot (provider)
app.post("/api/provider/spots", requireAuth, requireRole("provider","admin"), async (req, res) => {
  const { name, area, address, lat, lng, totalSpaces, pricePerHour, type, amenities, phone } = req.body;
  if (!name || !area || !address || !lat || !lng || !totalSpaces || !pricePerHour)
    return res.status(400).json({ error: "All spot fields required" });

  const { data: spot, error } = await supabase.from("spots").insert({
    provider_id: req.user.userId,
    name, area, address,
    lat: parseFloat(lat), lng: parseFloat(lng),
    total_spaces: parseInt(totalSpaces),
    available_spaces: parseInt(totalSpaces),
    price_per_hour: parseInt(pricePerHour),
    type: type || "Other",
    amenities: amenities || [],
    phone: phone || "",
    is_active: false,   // pending admin approval
    is_approved: false,
  }).select("*").single();

  if (error) return res.status(500).json({ error: "Failed to add spot" });
  res.status(201).json({ spot, message: "Spot submitted for approval" });
});

// Get provider's own spots
app.get("/api/provider/spots", requireAuth, requireRole("provider","admin"), async (req, res) => {
  const { data: spots } = await supabase.from("spots").select("*").eq("provider_id", req.user.userId).order("created_at", { ascending: false });
  res.json({ spots: spots || [] });
});

// Update spot availability manually (scanner triggers this)
app.put("/api/provider/spots/:id/availability", requireAuth, async (req, res) => {
  const { available } = req.body;
  const { data: spot } = await supabase.from("spots").select("provider_id,total_spaces").eq("id", req.params.id).single();
  if (!spot) return res.status(404).json({ error: "Spot not found" });

  const newAvail = Math.max(0, Math.min(spot.total_spaces, parseInt(available)));
  await supabase.from("spots").update({ available_spaces: newAvail, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  await supabase.from("space_events").insert({ spot_id: req.params.id, available_spaces: newAvail, event_type: "manual", triggered_by: req.user.userId });

  io.emit("spot:updated", { spotId: req.params.id, available: newAvail, total: spot.total_spaces });
  res.json({ message: "Availability updated", available: newAvail });
});

// Provider dashboard stats
app.get("/api/provider/dashboard", requireAuth, requireRole("provider","admin"), async (req, res) => {
  const providerId = req.user.userId;
  const [spotsRes, bookingsRes, paymentsRes, carsRes] = await Promise.all([
    supabase.from("spots").select("id,name,available_spaces,total_spaces,is_approved,is_active").eq("provider_id", providerId),
    supabase.from("bookings").select("id,total_amount,commission_amount,provider_amount,created_at,status,payment_status,vehicle_plate,spot_name,hours").eq("provider_id", providerId).eq("payment_status","paid").order("created_at",{ascending:false}).limit(20),
    supabase.from("provider_details").select("*").eq("provider_id", providerId).single(),
    supabase.from("bookings").select("vehicle_plate,spot_name,arrive_at,expires_at,hours").eq("provider_id", providerId).eq("status","confirmed").eq("payment_status","paid"),
  ]);

  const bookings = bookingsRes.data || [];
  const totalRevenue = bookings.reduce((s,b)=>s+b.total_amount,0);
  const totalCommission = bookings.reduce((s,b)=>s+b.commission_amount,0);
  const totalPayout = bookings.reduce((s,b)=>s+b.provider_amount,0);

  res.json({
    spots: spotsRes.data || [],
    recentBookings: bookings,
    providerDetails: paymentsRes.data,
    carsCurrentlyParked: carsRes.data || [],
    stats: { totalBookings: bookings.length, totalRevenue, totalCommission, totalPayout },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/dashboard", requireAuth, requireRole("admin"), async (req, res) => {
  const [usersRes, spotsRes, bookingsRes, pendingRes, providerPayRes] = await Promise.all([
    supabase.from("users").select("id,full_name,email,role,created_at").order("created_at",{ascending:false}),
    supabase.from("spots").select("*").order("created_at",{ascending:false}),
    supabase.from("bookings").select("*").eq("payment_status","paid").order("created_at",{ascending:false}).limit(50),
    supabase.from("spots").select("*").eq("is_approved",false),
    supabase.from("provider_payments").select("commission").eq("status","paid"),
  ]);

  const bookings = bookingsRes.data || [];
  const totalRevenue = bookings.reduce((s,b)=>s+b.total_amount,0);
  const totalCommission = bookings.reduce((s,b)=>s+b.commission_amount,0);

  // Per-provider breakdown
  const providers = (usersRes.data||[]).filter(u=>u.role==="provider");
  const providerStats = await Promise.all(providers.map(async p => {
    const { data: pb } = await supabase.from("bookings").select("total_amount,commission_amount,provider_amount").eq("provider_id",p.id).eq("payment_status","paid");
    const { data: pd } = await supabase.from("provider_details").select("business_name,mpesa_phone").eq("provider_id",p.id).single();
    const { data: ps } = await supabase.from("spots").select("id,name").eq("provider_id",p.id);
    const rev = (pb||[]).reduce((s,b)=>s+b.total_amount,0);
    const comm = (pb||[]).reduce((s,b)=>s+b.commission_amount,0);
    const payout = (pb||[]).reduce((s,b)=>s+b.provider_amount,0);
    return { ...p, businessName:pd?.business_name, mpesaPhone:pd?.mpesa_phone, spots:ps||[], totalRevenue:rev, commission:comm, payout, bookingCount:(pb||[]).length };
  }));

  res.json({
    stats: {
      totalUsers: (usersRes.data||[]).filter(u=>u.role==="driver").length,
      totalProviders: providers.length,
      totalSpots: (spotsRes.data||[]).length,
      activeSpots: (spotsRes.data||[]).filter(s=>s.is_active&&s.is_approved).length,
      pendingApprovals: (pendingRes.data||[]).length,
      totalRevenue,
      totalCommission,
      totalBookings: bookings.length,
    },
    recentBookings: bookings.slice(0,20),
    pendingSpots: pendingRes.data || [],
    providerStats,
    allUsers: usersRes.data || [],
  });
});

// Approve / reject spot
app.put("/api/admin/spots/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const { approved } = req.body;
  const { data } = await supabase.from("spots").update({
    is_approved: approved, is_active: approved, updated_at: new Date().toISOString()
  }).eq("id", req.params.id).select("*").single();
  if (approved) io.emit("spots:refresh");
  res.json({ spot: data, message: approved ? "Spot approved" : "Spot rejected" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER / GATE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

async function processScan(scannerId, plate) {
  const scanner = scannerRegistry.get(scannerId);
  const timestamp = new Date().toISOString();
  if (!scanner) return { action:"deny", reason:"Unknown scanner ID", plate, scannerId, timestamp };

  const cleanPlate = plate.toUpperCase().replace(/\s/g,"");

  // 1. Look for a valid non-expired booking first
  const { data: booking } = await supabase.from("bookings")
    .select("*").eq("spot_id", scanner.spotId)
    .eq("payment_status","paid").eq("status","confirmed")
    .ilike("vehicle_plate", cleanPlate + "%")
    .gt("expires_at", timestamp).limit(1).single();

  // 2. If no valid booking, check if there's an EXPIRED booking (overstay scenario)
  let overstayBooking = null;
  let overstayMinutes = 0;
  let overstayCharge = 0;

  if (!booking) {
    const { data: expired } = await supabase.from("bookings")
      .select("*").eq("spot_id", scanner.spotId)
      .eq("payment_status","paid").eq("status","confirmed")
      .ilike("vehicle_plate", cleanPlate + "%")
      .lte("expires_at", timestamp).limit(1).single();

    if (expired) {
      overstayBooking = expired;
      const expiredMs = new Date(expired.expires_at).getTime();
      const nowMs = new Date(timestamp).getTime();
      overstayMinutes = Math.ceil((nowMs - expiredMs) / 60000);

      // Get spot price to calculate overstay fee
      const { data: spotData } = await supabase.from("spots")
        .select("price_per_hour").eq("id", scanner.spotId).single();
      const ratePerMin = (spotData?.price_per_hour || 100) / 60;
      overstayCharge = Math.ceil(overstayMinutes * ratePerMin);
    }
  }

  const { data: spot } = await supabase.from("spots").select("*").eq("id", scanner.spotId).single();

  // Determine action
  let action, reason;
  if (booking) {
    action = "open";
    reason = "Valid booking";
  } else if (overstayBooking && scanner.role === "exit") {
    // Allow exit for overstay but flag it — charge will be collected
    action = "open";
    reason = `Overstay: ${overstayMinutes} min past booking. Charge: KES ${overstayCharge}`;
  } else {
    action = "deny";
    reason = overstayBooking
      ? `Session expired. Overstay: ${overstayMinutes} min. Pay KES ${overstayCharge} to exit.`
      : "No valid booking found";
  }

  const log = {
    scanner_id: scannerId, scanner_label: scanner.label,
    spot_id: scanner.spotId, spot_name: spot?.name || "Unknown",
    plate: plate.toUpperCase(), action,
    booking_id: booking?.id || overstayBooking?.id || null,
    reason,
  };
  await supabase.from("scan_logs").insert(log);
  io.to("dashboard").emit("scan:event", { ...log, timestamp });

  const activeBooking = booking || overstayBooking;

  if (booking && scanner.role === "exit") {
    // ── Normal exit: valid booking, not expired ────────────────────────────────
    await supabase.from("bookings")
      .update({ status:"completed", updated_at:timestamp })
      .eq("id", booking.id);
    const newAvail = Math.min((spot?.total_spaces||999), (spot?.available_spaces||0)+1);
    await supabase.from("spots").update({ available_spaces: newAvail }).eq("id", scanner.spotId);
    await supabase.from("space_events").insert({ spot_id:scanner.spotId, available_spaces:newAvail, event_type:"exit", triggered_by:scannerId });
    io.to(`user:${booking.user_id}`).emit("gate:opened", { scannerId, spotName:spot?.name, plate, timestamp, overstay:null });
    const { data: updatedSpot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", scanner.spotId).single();
    if (updatedSpot) io.emit("spot:updated", { spotId:scanner.spotId, available:updatedSpot.available_spaces, total:updatedSpot.total_spaces });

  } else if (overstayBooking && scanner.role === "exit") {
    // ── Overstay exit: gate STAYS CLOSED — user must pay first via M-Pesa ─────
    // Get user phone for STK push
    const { data: overstayUser } = await supabase.from("users")
      .select("phone, full_name").eq("id", overstayBooking.user_id).single();

    // Store the pending overstay payment so we can open gate after confirmation
    const overstayId = "OS-" + Date.now();
    await supabase.from("overstay_payments").insert({
      id: overstayId,
      booking_id: overstayBooking.id,
      user_id: overstayBooking.user_id,
      spot_id: scanner.spotId,
      scanner_id: scannerId,
      plate: plate.toUpperCase(),
      minutes: overstayMinutes,
      amount: overstayCharge,
      status: "pending",
      created_at: timestamp,
    }).select();

    // Trigger STK push to user's phone automatically
    if (overstayUser?.phone) {
      const checkoutId = "OS_CO_" + Date.now();
      // Fire M-Pesa STK push (simulate — replace with real Daraja in prod)
      setTimeout(async () => {
        // On payment success — open the gate and mark overstay paid
        await supabase.from("overstay_payments")
          .update({ status:"paid", checkout_id:checkoutId, paid_at:new Date().toISOString() })
          .eq("id", overstayId);
        await supabase.from("bookings")
          .update({ status:"completed", updated_at:new Date().toISOString() })
          .eq("id", overstayBooking.id);
        const newAvail = Math.min((spot?.total_spaces||999), (spot?.available_spaces||0)+1);
        await supabase.from("spots").update({ available_spaces: newAvail }).eq("id", scanner.spotId);
        await supabase.from("space_events").insert({ spot_id:scanner.spotId, available_spaces:newAvail, event_type:"exit", triggered_by:scannerId });
        const { data: updatedSpot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", scanner.spotId).single();
        if (updatedSpot) io.emit("spot:updated", { spotId:scanner.spotId, available:updatedSpot.available_spaces, total:updatedSpot.total_spaces });
        // Signal gate hardware to open
        io.to(`scanner:${scannerId}`).emit("gate:open", { plate, overstayId, reason:"Overstay payment confirmed" });
        // Notify user — gate is now open
        io.to(`user:${overstayBooking.user_id}`).emit("overstay:paid", {
          overstayId, bookingId:overstayBooking.id,
          minutes:overstayMinutes, charge:overstayCharge,
          spotName:spot?.name, plate:plate.toUpperCase(),
        });
      }, 5000); // 5s simulated M-Pesa delay — replace with real callback in prod
    }

    // Notify user immediately: payment required, STK sent to their phone
    io.to(`user:${overstayBooking.user_id}`).emit("overstay:payment_required", {
      overstayId,
      bookingId: overstayBooking.id,
      minutes: overstayMinutes,
      charge: overstayCharge,
      spotName: spot?.name,
      plate: plate.toUpperCase(),
      phone: overstayUser?.phone || "",
      message: `M-Pesa payment request sent to ${overstayUser?.phone}. Check your phone and enter your PIN.`,
    });

  } else if (overstayBooking && scanner.role !== "exit") {
    // ── Entry scanner — alert user and deny ────────────────────────────────────
    io.to(`user:${overstayBooking.user_id}`).emit("overstay:alert", {
      bookingId: overstayBooking.id,
      minutes: overstayMinutes,
      charge: overstayCharge,
      spotName: spot?.name,
      plate: plate.toUpperCase(),
    });
  } else if (booking && scanner.role !== "exit") {
    // ── Entry scan: valid booking — just notify ────────────────────────────────
    io.to(`user:${booking.user_id}`).emit("gate:opened", { scannerId, spotName:spot?.name, plate, timestamp, overstay:null });
  }

  return {
    action,
    booking: activeBooking,
    scanner, timestamp, reason,
    overstay: overstayBooking ? { minutes:overstayMinutes, charge:overstayCharge } : null,
  };
}

// Load scanners from DB on startup
async function loadScanners() {
  const { data: spots } = await supabase.from("spots").select("id,name,scanners").eq("is_active",true);
  if (!spots) return;
  spots.forEach(spot => {
    (spot.scanners||[]).forEach(scannerId => {
      const role = scannerId.includes("EXIT") ? "exit" : "entry";
      scannerRegistry.set(scannerId, { spotId: spot.id, label: `${spot.name} – ${role}`, role });
    });
  });
  console.log(`[Scanners] Loaded ${scannerRegistry.size} scanners`);
}

app.post("/api/scan", async (req, res) => {
  const { scannerId, plate, apiKey } = req.body;
  if (apiKey !== (process.env.SCANNER_API_KEY || "parksmart-scanner-key"))
    return res.status(401).json({ error: "Invalid API key" });
  const result = await processScan(scannerId, plate);
  res.json(result);
});

app.get("/api/scanlogs", requireAuth, async (req, res) => {
  const { spotId, limit=50 } = req.query;
  let query = supabase.from("scan_logs").select("*").order("scanned_at",{ascending:false}).limit(parseInt(limit));
  if (spotId) query = query.eq("spot_id", spotId);
  const { data } = await query;
  res.json({ logs: data || [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME AVAILABILITY ALGORITHM
// Uses Supabase real-time + periodic sync as fallback
// ═══════════════════════════════════════════════════════════════════════════════

// Subscribe to Supabase real-time changes on spots table
function setupRealtimeSync() {
  supabase.channel("spots-changes")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spots" }, (payload) => {
      const spot = payload.new;
      io.emit("spot:updated", { spotId: spot.id, available: spot.available_spaces, total: spot.total_spaces });
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, (payload) => {
      const booking = payload.new;
      if (booking.payment_status === "paid") {
        io.to(`user:${booking.user_id}`).emit("payment:confirmed", { bookingId: booking.id });
      }
    })
    .subscribe();

  console.log("[Realtime] Supabase real-time sync active");
}

// Periodic full sync every 30s as fallback
setInterval(async () => {
  const { data: spots } = await supabase.from("spots").select("id,available_spaces,total_spaces").eq("is_active",true);
  if (spots) spots.forEach(s => io.emit("spot:updated", { spotId:s.id, available:s.available_spaces, total:s.total_spaces }));
}, 30000);

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  // ── FIX 2: On every join (including reconnects) send a fresh spots snapshot ──
  socket.on("user:join", async (userId) => {
    socket.join(`user:${userId}`);
    // Store userId on socket so we can re-send snapshot on reconnect
    socket.data.userId = userId;
    const { data: spots } = await supabase.from("spots").select("*").eq("is_active",true).eq("is_approved",true);
    socket.emit("spots:snapshot", spots || []);
  });

  // Client can explicitly request a fresh snapshot (e.g. after coming back online)
  socket.on("spots:request_snapshot", async () => {
    const { data: spots } = await supabase.from("spots").select("*").eq("is_active",true).eq("is_approved",true);
    socket.emit("spots:snapshot", spots || []);
  });

  socket.on("scanner:register", (scannerId) => {
    const scanner = scannerRegistry.get(scannerId);
    if (!scanner) { socket.emit("scanner:error", { error:`Unknown scanner: ${scannerId}` }); return; }
    scanner.socketId = socket.id;
    scannerRegistry.set(scannerId, scanner);
    socket.join(`scanner:${scannerId}`);
    socket.emit("scanner:ready", { scannerId, label:scanner.label, spotId:scanner.spotId, role:scanner.role });
    io.to("dashboard").emit("scanner:status", { scannerId, label:scanner.label, online:true });
  });

  socket.on("scan:plate", async ({ scannerId, plate }) => {
    const result = await processScan(scannerId, plate);
    socket.emit(result.action==="open" ? "gate:open" : "gate:deny", { plate, booking:result.booking, reason:result.reason, timestamp:result.timestamp });
  });

  socket.on("dashboard:join", async () => {
    socket.join("dashboard");
    const { data: spots } = await supabase.from("spots").select("*");
    const { data: logs } = await supabase.from("scan_logs").select("*").order("scanned_at",{ascending:false}).limit(30);
    socket.emit("dashboard:snapshot", { scanners:[...scannerRegistry.entries()].map(([id,s])=>({id,...s,online:!!s.socketId})), recentLogs:logs||[], spots:spots||[] });
  });

  socket.on("spots:refresh", async () => {
    const { data: spots } = await supabase.from("spots").select("*").eq("is_active",true).eq("is_approved",true);
    socket.emit("spots:snapshot", spots || []);
  });

  socket.on("disconnect", () => {
    for (const [id, scanner] of scannerRegistry) {
      if (scanner.socketId === socket.id) { scanner.socketId = null; io.to("dashboard").emit("scanner:status", { scannerId:id, online:false }); }
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`\n🅿️  ParkSmart v2 → http://localhost:${PORT}`);
  await loadScanners();
  setupRealtimeSync();
});

module.exports = { app, server, io };
