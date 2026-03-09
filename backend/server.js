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
  }).select("id,full_name,email,phone,role,vehicles,loyalty_points,is_premium,created_at").single();

  if (error) return res.status(500).json({ error: "Registration failed" });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user });
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

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKINGS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/bookings", requireAuth, async (req, res) => {
  const { spotId, hours, arriveAt, vehiclePlate } = req.body;
  if (!spotId || !hours || !vehiclePlate)
    return res.status(400).json({ error: "spotId, hours, vehiclePlate required" });

  const { data: spot } = await supabase.from("spots").select("*").eq("id", spotId).single();
  if (!spot) return res.status(404).json({ error: "Spot not found" });
  if (spot.available_spaces <= 0) return res.status(409).json({ error: "Spot is full" });

  const total = spot.price_per_hour * parseInt(hours);
  const commission = Math.round(total * 0.20); // 20% commission
  const providerAmount = total - commission;    // 80% to provider
  const expiresAt = new Date(Date.now() + parseInt(hours) * 3600000).toISOString();
  const bookingId = "PS-" + Math.floor(100000 + Math.random() * 900000);

  const { data: booking, error } = await supabase.from("bookings").insert({
    id: bookingId,
    spot_id: spotId,
    user_id: req.user.userId,
    provider_id: spot.provider_id,
    vehicle_plate: vehiclePlate.toUpperCase(),
    hours: parseInt(hours),
    arrive_at: arriveAt || new Date().toISOString(),
    expires_at: expiresAt,
    total_amount: total,
    commission_amount: commission,
    provider_amount: providerAmount,
    spot_name: spot.name,
    spot_address: spot.address,
  }).select("*").single();

  if (error) return res.status(500).json({ error: "Booking failed" });
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

  // Broadcast real-time availability update
  const { data: spot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", booking.spot_id).single();
  if (spot) io.emit("spot:updated", { spotId: booking.spot_id, available: spot.available_spaces, total: spot.total_spaces });

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

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER ROUTES
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

  // Find valid booking
  const { data: booking } = await supabase.from("bookings")
    .select("*").eq("spot_id", scanner.spotId)
    .eq("payment_status","paid").eq("status","confirmed")
    .ilike("vehicle_plate", plate.toUpperCase().replace(/\s/g,"") + "%")
    .gt("expires_at", timestamp).limit(1).single();

  const { data: spot } = await supabase.from("spots").select("*").eq("id", scanner.spotId).single();

  const log = {
    scanner_id: scannerId, scanner_label: scanner.label,
    spot_id: scanner.spotId, spot_name: spot?.name || "Unknown",
    plate: plate.toUpperCase(), action: booking ? "open" : "deny",
    booking_id: booking?.id || null,
    reason: booking ? "Valid booking" : "No valid booking",
  };
  await supabase.from("scan_logs").insert(log);
  io.to("dashboard").emit("scan:event", { ...log, timestamp });

  if (booking) {
    if (scanner.role === "exit") {
      await supabase.from("bookings").update({ status:"completed", updated_at:timestamp }).eq("id", booking.id);
      await supabase.from("space_events").insert({ spot_id:scanner.spotId, available_spaces:(spot?.available_spaces||0)+1, event_type:"exit", triggered_by:scannerId });
    }
    io.to(`user:${booking.user_id}`).emit("gate:opened", { scannerId, spotName:spot?.name, plate, timestamp });
    // Broadcast updated availability
    const { data: updatedSpot } = await supabase.from("spots").select("available_spaces,total_spaces").eq("id", scanner.spotId).single();
    if (updatedSpot) io.emit("spot:updated", { spotId:scanner.spotId, available:updatedSpot.available_spaces, total:updatedSpot.total_spaces });
  }

  return { action: booking?"open":"deny", booking, scanner, timestamp, reason: log.reason };
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
  socket.on("user:join", async (userId) => {
    socket.join(`user:${userId}`);
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
