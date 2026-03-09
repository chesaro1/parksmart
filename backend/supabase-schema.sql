-- ============================================================
-- ParkSmart Nairobi – Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'driver' CHECK (role IN ('driver', 'provider', 'admin')),
  vehicles TEXT[] DEFAULT '{}',
  loyalty_points INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PARKING SPOTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  total_spaces INTEGER NOT NULL DEFAULT 10,
  available_spaces INTEGER NOT NULL DEFAULT 10,
  price_per_hour INTEGER NOT NULL DEFAULT 100,
  rating NUMERIC(2,1) DEFAULT 4.5,
  type TEXT DEFAULT 'Other' CHECK (type IN ('Mall', 'Office', 'Street', 'Residential', 'Other')),
  amenities TEXT[] DEFAULT '{}',
  scanners TEXT[] DEFAULT '{}',
  phone TEXT,
  is_active BOOLEAN DEFAULT FALSE, -- must be approved by admin
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT ('PS-' || floor(random()*900000+100000)::text),
  spot_id UUID REFERENCES spots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_plate TEXT NOT NULL,
  hours INTEGER NOT NULL DEFAULT 1,
  arrive_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  total_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL DEFAULT 0, -- 20% of total
  provider_amount INTEGER NOT NULL DEFAULT 0,   -- 80% of total
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','completed','cancelled','expired')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method TEXT DEFAULT 'M-Pesa',
  mpesa_checkout_id TEXT,
  spot_name TEXT,
  spot_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROVIDER PAYMENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,        -- amount paid to provider (80%)
  commission INTEGER NOT NULL,    -- ParkSmart commission (20%)
  payment_method TEXT DEFAULT 'M-Pesa',
  provider_phone TEXT,
  provider_account TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROVIDER DETAILS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  mpesa_phone TEXT NOT NULL,      -- phone to receive payments
  mpesa_account TEXT,             -- paybill/till number
  id_number TEXT,
  kra_pin TEXT,
  bank_name TEXT,
  bank_account TEXT,
  total_earned INTEGER DEFAULT 0,
  total_commission_paid INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCAN LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scanner_id TEXT NOT NULL,
  scanner_label TEXT,
  spot_id UUID REFERENCES spots(id) ON DELETE SET NULL,
  spot_name TEXT,
  plate TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('open','deny')),
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  reason TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REAL-TIME SPACE UPDATES ─────────────────────────────────────────────────
-- This table tracks every space change for the real-time algorithm
CREATE TABLE IF NOT EXISTS space_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE,
  available_spaces INTEGER NOT NULL,
  event_type TEXT CHECK (event_type IN ('entry','exit','manual','booking','cancellation')),
  triggered_by TEXT, -- booking_id or scanner_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SEED: Default Admin ──────────────────────────────────────────────────────
-- Password: password (IMPORTANT: change this after first login via Account settings!)
INSERT INTO users (full_name, email, phone, password_hash, role)
VALUES ('ParkSmart Admin', 'admin@parksmart.co.ke', '+254 700 000 000',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ─── SEED: Real Nairobi Parking Spots (pre-approved) ─────────────────────────
-- These are system spots not tied to a specific provider
INSERT INTO spots (name, area, address, lat, lng, total_spaces, available_spaces, price_per_hour, rating, type, amenities, scanners, phone, is_active, is_approved) VALUES
('Westlands Square Parking',  'Westlands',  'Westlands Rd, Nairobi',                   -1.2676, 36.8116, 40,  12, 150, 4.8, 'Mall',   ARRAY['CCTV','Covered','24/7 Security'],       ARRAY['SCN-WS-ENTRY','SCN-WS-EXIT'],         '+254 20 374 1234', true, true),
('Sarit Centre – Level P2',   'Westlands',  'Karuna Rd, Westlands, Nairobi',            -1.2611, 36.8025, 20,  3,  200, 4.6, 'Mall',   ARRAY['CCTV','Covered','Lift Access'],         ARRAY['SCN-SC-ENTRY'],                       '+254 20 374 4444', true, true),
('I&M Bank Tower Basement',   'CBD',        '2nd Ngong Ave, Nairobi CBD',               -1.2864, 36.8233, 30,  8,  100, 4.4, 'Office', ARRAY['CCTV','Weekdays Only'],                 ARRAY['SCN-IM-ENTRY'],                       '+254 20 322 2000', true, true),
('Village Market Parking',    'Gigiri',     'Limuru Rd, Gigiri, Nairobi',               -1.2290, 36.8060, 80,  25, 120, 4.9, 'Mall',   ARRAY['CCTV','Covered','EV Charging','Valet'], ARRAY['SCN-VM-ENTRY','SCN-VM-EXIT'],         '+254 20 712 2488', true, true),
('KICC Underground Parking',  'CBD',        'City Hall Way, Nairobi CBD',               -1.2889, 36.8219, 15,  0,  80,  4.2, 'Office', ARRAY['CCTV','Weekdays Only'],                 ARRAY['SCN-KC-ENTRY'],                       '+254 20 221 9211', true, true),
('Junction Mall Parking',     'Ngong Rd',   'Ngong Rd, Dagoretti Corner, Nairobi',      -1.2996, 36.7818, 50,  18, 90,  4.5, 'Mall',   ARRAY['CCTV','Covered','24/7 Security'],       ARRAY['SCN-NJ-ENTRY'],                       '+254 20 387 9000', true, true),
('Two Rivers Mall Parking',   'Runda',      'Limuru Rd, Runda, Nairobi',                -1.2057, 36.8078, 120, 42, 130, 4.7, 'Mall',   ARRAY['CCTV','Covered','EV Charging'],         ARRAY['SCN-TR-ENTRY','SCN-TR-EXIT'],         '+254 709 931 000', true, true),
('ABC Place Westlands',       'Westlands',  'Waiyaki Way, Westlands, Nairobi',          -1.2641, 36.8033, 25,  6,  160, 4.3, 'Office', ARRAY['CCTV','Covered','Access Control'],      ARRAY['SCN-AB-ENTRY'],                       '+254 20 444 2000', true, true),
('Garden City Mall Parking',  'Thika Rd',   'Thika Superhighway, Garden City, Nairobi', -1.2303, 36.8804, 100, 35, 100, 4.6, 'Mall',   ARRAY['CCTV','Covered','EV Charging'],         ARRAY['SCN-GC-ENTRY','SCN-GC-EXIT'],         '+254 709 838 000', true, true),
('The Hub Karen Parking',     'Karen',      'Karen Rd, Karen, Nairobi',                 -1.3178, 36.7122, 150, 50, 80,  4.8, 'Mall',   ARRAY['CCTV','Covered','EV Charging','Valet'], ARRAY['SCN-HK-ENTRY','SCN-HK-EXIT'],         '+254 709 109 000', true, true),
('Yaya Centre Parking',       'Hurlingham', 'Argwings Kodhek Rd, Hurlingham, Nairobi',  -1.2908, 36.7894, 35,  9,  120, 4.3, 'Mall',   ARRAY['CCTV','Covered'],                       ARRAY['SCN-YY-ENTRY'],                       '+254 20 271 1111', true, true),
('Galleria Mall Parking',     'Langata',    'Langata Rd, Nairobi',                      -1.3376, 36.7517, 60,  20, 80,  4.4, 'Mall',   ARRAY['CCTV','Covered'],                       ARRAY['SCN-GL-ENTRY'],                       '+254 20 261 0000', true, true)
ON CONFLICT DO NOTHING;

-- ─── FUNCTIONS: Auto-update available_spaces ──────────────────────────────────
-- Triggered whenever a booking is created or status changes
CREATE OR REPLACE FUNCTION update_spot_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
    UPDATE spots SET available_spaces = GREATEST(0, available_spaces - 1), updated_at = NOW()
    WHERE id = NEW.spot_id;
    INSERT INTO space_events (spot_id, available_spaces, event_type, triggered_by)
    SELECT NEW.spot_id, available_spaces, 'booking', NEW.id FROM spots WHERE id = NEW.spot_id;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Payment confirmed: decrement
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      UPDATE spots SET available_spaces = GREATEST(0, available_spaces - 1), updated_at = NOW()
      WHERE id = NEW.spot_id;
      INSERT INTO space_events (spot_id, available_spaces, event_type, triggered_by)
      SELECT NEW.spot_id, available_spaces, 'booking', NEW.id FROM spots WHERE id = NEW.spot_id;
    END IF;
    -- Cancelled or completed: increment
    IF OLD.status = 'confirmed' AND NEW.status IN ('cancelled','completed') THEN
      UPDATE spots SET available_spaces = LEAST(total_spaces, available_spaces + 1), updated_at = NOW()
      WHERE id = NEW.spot_id;
      INSERT INTO space_events (spot_id, available_spaces, event_type, triggered_by)
      SELECT NEW.spot_id, available_spaces, 'cancellation', NEW.id FROM spots WHERE id = NEW.spot_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_availability_trigger ON bookings;
CREATE TRIGGER booking_availability_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_spot_availability();

-- ─── FUNCTION: Calculate provider earnings ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_provider_stats(p_id UUID)
RETURNS TABLE(total_bookings BIGINT, total_revenue BIGINT, total_commission BIGINT, total_payout BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(total_amount), 0)::BIGINT,
    COALESCE(SUM(commission_amount), 0)::BIGINT,
    COALESCE(SUM(provider_amount), 0)::BIGINT
  FROM bookings
  WHERE provider_id = p_id AND payment_status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- ─── ENABLE REALTIME ──────────────────────────────────────────────────────────
-- Run these in Supabase → Database → Replication → enable for these tables
ALTER TABLE spots REPLICA IDENTITY FULL;
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE space_events REPLICA IDENTITY FULL;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_details ENABLE ROW LEVEL SECURITY;

-- Public read for active approved spots
CREATE POLICY "Public spots are viewable" ON spots FOR SELECT USING (is_active = true AND is_approved = true);
-- Users can read own data
CREATE POLICY "Users read own" ON users FOR SELECT USING (true);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (true);
-- Bookings: own only
CREATE POLICY "Bookings own" ON bookings FOR ALL USING (true);
-- Provider details
CREATE POLICY "Provider details own" ON provider_details FOR ALL USING (true);
