import fs from "fs";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as XLSX from "xlsx";
import multer from "multer";

dotenv.config();

console.log("Environment check:");
console.log("- SUPABASE_URL:", (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) ? "Defined" : "MISSING");
console.log("- SUPABASE_ANON_KEY:", (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) ? "Defined" : "MISSING");
console.log("- SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Defined" : "MISSING");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- VERCEL:", process.env.VERCEL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client Helper
const getSupabaseClient = () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const key = serviceKey || anonKey || "";

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
};

// Test Supabase connection on startup
(async () => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.error("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.");
      return;
    }
    const { data, error } = await client.from("inventory").select("id").limit(1);
    if (error) {
      console.error("Supabase connection test failed:", error.message);
    } else {
      console.log("Supabase connection test successful.");
    }
  } catch (err) {
    console.error("Unexpected error during Supabase connection test:", err);
  }
})();

// Egress Tracking State (Simple in-memory for this demo, but could be DB-backed)
let monthlyEgressBytes = 0;
const EGRESS_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const EGRESS_WARNING_THRESHOLD = 0.8; // 80%

const app = express();
const PORT = 3000;

// Helper to check if a Supabase error is due to a missing table
const isSupabaseTableMissing = (error: any) => {
  if (!error) return false;
  const msg = error.message || "";
  return error.code === '42P01' || 
    msg.includes("schema cache") || 
    (msg.includes("relation") && msg.includes("does not exist")) ||
    msg.includes("Could not find the table");
};

async function startServer() {
  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage() });

  // Request Logging Middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Migration: Set branch_id = 1 for existing data that has no branch_id
  const runMigration = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    console.log("Running branch migration...");
    const tables = ["inventory", "journal", "assets", "menu_items", "purchases"];
    
    // Check if damaged_stock column exists in inventory
    try {
      const { data: columns, error: colError } = await client.rpc('get_column_exists', { 
        t_name: 'inventory', 
        c_name: 'damaged_stock' 
      });
      // If RPC doesn't exist, we'll try a direct query or just ignore and let the update fail if column missing
      // For now, let's just try to add it if it might be missing
      await client.rpc('add_column_if_missing', {
        t_name: 'inventory',
        c_name: 'damaged_stock',
        c_type: 'NUMERIC DEFAULT 0'
      });
      await client.rpc('add_column_if_missing', {
        t_name: 'inventory',
        c_name: 'category',
        c_type: "TEXT DEFAULT 'Raw Material' CHECK (category IN ('Raw Material', 'Cleaning'))"
      });
      await client.rpc('add_column_if_missing', {
        t_name: 'inventory',
        c_name: 'used_stock',
        c_type: "NUMERIC DEFAULT 0"
      });
    } catch (e) {
      // Ignore RPC errors
    }

    for (const table of tables) {
      try {
        const { error } = await client.from(table).update({ branch_id: 1 }).is("branch_id", null);
        if (error) console.error(`Migration error for table ${table}:`, error.message);
      } catch (e) {
        console.error(`Migration exception for table ${table}:`, e);
      }
    }
    console.log("Branch migration complete.");
  };
  runMigration();

  // Egress Tracking Middleware
  app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function (data) {
      try {
        if (data) {
          const size = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
          monthlyEgressBytes += size;
        }
      } catch (e) {
        console.error("Error tracking egress:", e);
      }
      return oldSend.apply(res, arguments as any);
    };
    next();
  });

  // Static route for uploads
  app.use("/upload", express.static(path.join(__dirname, "upload")));

  // API Routes
  app.get("/api/supabase-status", async (req, res) => {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
    
    const client = getSupabaseClient();
    let connectionTest = "Not tested";
    let errorDetails = null;
    let suggestedAction = null;

    if (client) {
      try {
        const { error } = await client.from("inventory").select("id").limit(1);
        if (error) {
          connectionTest = "Failed";
          errorDetails = error.message;
          if (error.message.includes("relation") && error.message.includes("does not exist")) {
            suggestedAction = "Tabel 'inventory' tidak ditemukan. Pastikan Anda sudah menjalankan skrip SQL untuk membuat tabel di dashboard Supabase.";
          } else if (error.message.includes("Invalid API key") || error.message.includes("JWT")) {
            suggestedAction = "API Key (Anon atau Service Role) tidak valid. Periksa kembali di panel Settings > Secrets.";
          }
        } else {
          connectionTest = "Successful";
        }
      } catch (err: any) {
        connectionTest = "Error";
        errorDetails = err.message;
        suggestedAction = "Terjadi kesalahan saat mencoba menghubungi Supabase. Periksa URL dan koneksi internet.";
      }
    } else {
      connectionTest = "Missing Configuration";
      suggestedAction = "URL atau API Key Supabase belum diatur. Silakan buka panel Settings > Secrets dan tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.";
    }

    res.json({
      configured: !!client,
      url: url ? `${url.substring(0, 15)}...` : "Missing",
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      connectionTest,
      errorDetails,
      suggestedAction
    });
  });

  app.get("/api/supabase-sql", (req, res) => {
    const sql = `
-- 0. Tabel Branches
CREATE TABLE IF NOT EXISTS branches (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Tabel Units
CREATE TABLE IF NOT EXISTS units (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL REFERENCES units(name) ON UPDATE CASCADE,
  quantity NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  purchasing_physical_stock NUMERIC DEFAULT 0,
  operational_physical_stock NUMERIC DEFAULT 0,
  cleaning_physical_stock NUMERIC DEFAULT 0,
  damaged_stock NUMERIC DEFAULT 0,
  used_stock NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'Raw Material' CHECK (category IN ('Raw Material', 'Cleaning')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel COA (Chart of Accounts)
CREATE TABLE IF NOT EXISTS coa (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Income', 'Expense', 'Asset', 'Adjustment', 'Liability', 'Equity')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Journal
CREATE TABLE IF NOT EXISTS journal (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  account TEXT NOT NULL REFERENCES coa(code) ON UPDATE CASCADE,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  category TEXT CHECK (category IN ('Income', 'Expense', 'Asset', 'Adjustment', 'Liability', 'Equity')),
  payment_method TEXT CHECK (payment_method IN ('Bank', 'Kas')),
  is_adjustment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Assets
CREATE TABLE IF NOT EXISTS assets (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Machinery', 'Office Equipment')),
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC NOT NULL,
  lifespan_years INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  hpp NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Menu Ingredients
CREATE TABLE IF NOT EXISTS menu_ingredients (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  menu_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_id BIGINT REFERENCES inventory(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  inventory_id BIGINT REFERENCES inventory(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel Personal Information
CREATE TABLE IF NOT EXISTS personal_information (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  address TEXT,
  birth_info TEXT,
  ktp_number TEXT,
  phone_number TEXT,
  join_date DATE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Data
INSERT INTO branches (name, location) VALUES ('RUMASA', 'Main Branch'), ('RUMASA HILLSIDE', 'Hillside Branch') ON CONFLICT DO NOTHING;
INSERT INTO units (name) VALUES ('Kg'), ('Liter'), ('Pcs'), ('Pack'), ('Bottle') ON CONFLICT DO NOTHING;
INSERT INTO coa (code, name, category) VALUES 
('4000', 'Pendapatan Penjualan', 'Income'),
('5000', 'Beban Bahan Baku', 'Expense'),
('5100', 'Beban Gaji', 'Expense'),
('5200', 'Beban Listrik & Air', 'Expense'),
('1000', 'Kas', 'Asset'),
('1100', 'Bank', 'Asset'),
('1200', 'Persediaan Barang', 'Asset'),
('2000', 'Hutang Dagang', 'Liability'),
('3000', 'Modal Pemilik', 'Equity'),
('3100', 'Laba Ditahan', 'Equity')
ON CONFLICT DO NOTHING;
    `;
    res.json({ sql });
  });

  app.get("/api/egress-status", (req, res) => {
    res.json({
      usage: monthlyEgressBytes,
      limit: EGRESS_LIMIT_BYTES,
      percentage: (monthlyEgressBytes / EGRESS_LIMIT_BYTES) * 100,
      warning: monthlyEgressBytes > EGRESS_LIMIT_BYTES * EGRESS_WARNING_THRESHOLD
    });
  });
  
  app.get("/api/branches", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) {
      console.warn("Supabase not configured, returning default branches");
      return res.json([
        { id: 1, name: "RUMASA", location: "Main" },
        { id: 2, name: "RUMASA HILLSIDE", location: "Hillside" }
      ]);
    }
    const { data, error } = await client
      .from("branches")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      if (isSupabaseTableMissing(error)) {
        console.warn("Table 'branches' does not exist in Supabase, returning default branches. Please run the SQL setup script in your Supabase dashboard.");
      } else {
        console.error("Supabase error in GET /api/branches:", error.message || error);
      }
      // Fallback to default branches
      return res.json([
        { id: 1, name: "RUMASA", location: "Main" },
        { id: 2, name: "RUMASA HILLSIDE", location: "Hillside" }
      ]);
    }
    
    // If table exists but is empty, also return defaults
    if (!data || data.length === 0) {
      return res.json([
        { id: 1, name: "RUMASA", location: "Main" },
        { id: 2, name: "RUMASA HILLSIDE", location: "Hillside" }
      ]);
    }
    
    res.json(data);
  });

  app.get("/api/coa", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.json([]);
    const { data, error } = await client
      .from("coa")
      .select("*")
      .order("code", { ascending: true });
    
    if (error) {
      if (!isSupabaseTableMissing(error)) {
        console.error("Supabase error in GET /api/coa:", error.message || error);
      }
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/coa", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { code, name, category } = req.body;
    const { data, error } = await client
      .from("coa")
      .insert([{ code, name, category }])
      .select();
    
    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ error: "Tabel 'coa' tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda." });
      }
      console.error("Supabase error in POST /api/coa:", error.message || error);
      return res.status(500).json({ error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }
    res.json(data[0]);
  });

  app.delete("/api/coa/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("coa")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/inventory", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.json([]);
    const { branch_id } = req.query;
    let query = client.from("inventory").select("*");
    if (branch_id) {
      if (branch_id === '1') {
        query = query.or('branch_id.eq.1,branch_id.is.null');
      } else {
        query = query.eq("branch_id", branch_id);
      }
    }
    const { data, error } = await query.order("name", { ascending: true });
    
    if (error) {
      // If column doesn't exist (42703), fallback to fetching all data
      if (error.code === '42703') {
        const { data: fallbackData } = await client.from("inventory").select("*").order("name", { ascending: true });
        return res.json(fallbackData || []);
      }
      if (!isSupabaseTableMissing(error)) {
        console.error("Supabase error in GET /api/inventory:", error.message || error);
      }
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/inventory", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { branch_id, name, unit, quantity, cost_per_unit, purchasing_physical_stock, operational_physical_stock, cleaning_physical_stock, damaged_stock, used_stock, category } = req.body;
    const { data, error } = await client
      .from("inventory")
      .insert([{ 
        branch_id: branch_id || 2,
        name, 
        unit, 
        quantity, 
        cost_per_unit, 
        purchasing_physical_stock: purchasing_physical_stock || 0,
        operational_physical_stock: operational_physical_stock || 0,
        cleaning_physical_stock: cleaning_physical_stock || 0,
        damaged_stock: damaged_stock || 0,
        used_stock: used_stock || 0,
        category: category || 'Raw Material'
      }])
      .select();
    
    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ error: "Tabel 'inventory' tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda." });
      }
      console.error("Supabase error in POST /api/inventory:", error.message || error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }
    
    res.json({ id: data[0].id });
  });

  app.put("/api/inventory/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { name, unit, quantity, cost_per_unit, purchasing_physical_stock, operational_physical_stock, cleaning_physical_stock, damaged_stock, used_stock, category } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (cost_per_unit !== undefined) updateData.cost_per_unit = cost_per_unit;
    if (purchasing_physical_stock !== undefined) updateData.purchasing_physical_stock = purchasing_physical_stock;
    if (operational_physical_stock !== undefined) updateData.operational_physical_stock = operational_physical_stock;
    if (cleaning_physical_stock !== undefined) updateData.cleaning_physical_stock = cleaning_physical_stock;
    if (damaged_stock !== undefined) updateData.damaged_stock = damaged_stock;
    if (used_stock !== undefined) updateData.used_stock = used_stock;
    if (category !== undefined) updateData.category = category;

    const { error } = await client
      .from("inventory")
      .update(updateData)
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("inventory")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/journal", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.json([]);
    const { branch_id } = req.query;
    let query = client.from("journal").select("*");
    if (branch_id) {
      if (branch_id === '1') {
        query = query.or('branch_id.eq.1,branch_id.is.null');
      } else {
        query = query.eq("branch_id", branch_id);
      }
    }
    const { data, error } = await query
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    
    if (error) {
      // If column doesn't exist (42703), fallback to fetching all data
      if (error.code === '42703') {
        const { data: fallbackData } = await client.from("journal").select("*").order("date", { ascending: false }).order("id", { ascending: false });
        return res.json(fallbackData || []);
      }
      if (!isSupabaseTableMissing(error)) {
        console.error("Supabase error in GET /api/journal:", error.message || error);
      }
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/journal", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { branch_id, date, description, account, debit, credit, category, payment_method, is_adjustment } = req.body;
    const { data, error } = await client
      .from("journal")
      .insert([{ branch_id: branch_id || 2, date, description, account, debit, credit, category, payment_method, is_adjustment }])
      .select();
    
    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ error: "Tabel 'journal' tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda." });
      }
      console.error("Supabase error in POST /api/journal:", error.message || error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }

    res.json({ id: data[0].id });
  });

  app.get("/api/reports/worksheet", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.status(500).json({ error: "Supabase not configured" });
      const { data, error } = await client
        .from("journal")
        .select("*")
        .order("date", { ascending: true });
      
      if (error) throw error;

      const worksheet: any = {
        kas: { inflow: 0, outflow: 0, balance: 0 },
        bank: { inflow: 0, outflow: 0, balance: 0 },
        total: { inflow: 0, outflow: 0, balance: 0 },
        accounts: {}
      };

      (data || []).forEach((entry: any) => {
        const account = entry.account || "Tanpa Akun";
        const credit = entry.credit || 0;
        const debit = entry.debit || 0;
        
        if (!worksheet.accounts[account]) {
          worksheet.accounts[account] = { inflow: 0, outflow: 0, balance: 0 };
        }
        
        // Inflow = Debit, Outflow = Credit (Standard for Assets/Flow tracking)
        worksheet.accounts[account].inflow += debit;
        worksheet.accounts[account].outflow += credit;
        worksheet.accounts[account].balance = worksheet.accounts[account].inflow - worksheet.accounts[account].outflow;

        const lowerAccount = account.toLowerCase();
        if (lowerAccount === "kas") {
          worksheet.kas.inflow += debit;
          worksheet.kas.outflow += credit;
        } else if (lowerAccount === "bank") {
          worksheet.bank.inflow += debit;
          worksheet.bank.outflow += credit;
        }
      });

      worksheet.kas.balance = worksheet.kas.inflow - worksheet.kas.outflow;
      worksheet.bank.balance = worksheet.bank.inflow - worksheet.bank.outflow;
      
      // Total only reflects Liquid Assets (Kas + Bank) for the top cards
      worksheet.total.inflow = worksheet.kas.inflow + worksheet.bank.inflow;
      worksheet.total.outflow = worksheet.kas.outflow + worksheet.bank.outflow;
      worksheet.total.balance = worksheet.kas.balance + worksheet.bank.balance;

      res.json(worksheet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("journal")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/assets", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.json([]);
    const { branch_id } = req.query;
    let query = client.from("assets").select("*");
    if (branch_id) {
      if (branch_id === '1') {
        query = query.or('branch_id.eq.1,branch_id.is.null');
      } else {
        query = query.eq("branch_id", branch_id);
      }
    }
    const { data, error } = await query;
    
    if (error) {
      if (!isSupabaseTableMissing(error)) {
        console.error("Supabase error in GET /api/assets:", error.message || error);
      }
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/assets", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { branch_id, name, type, purchase_date, purchase_price, lifespan_years } = req.body;
    const { data, error } = await client
      .from("assets")
      .insert([{ branch_id: branch_id || 2, name, type, purchase_date, purchase_price, lifespan_years }])
      .select();
    
    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ error: "Tabel 'assets' tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda." });
      }
      console.error("Supabase error in POST /api/assets:", error.message || error);
      return res.status(500).json({ error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }
    res.json({ id: data[0].id });
  });

  app.delete("/api/assets/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("assets")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.json({ income: 0, expenses: 0 });
      const { branch_id } = req.query;
      
      let incomeQuery = client.from("journal").select("credit").in("category", ["Income", "Adjustment"]);
      let expenseQuery = client.from("journal").select("debit").in("category", ["Expense", "Adjustment"]);
      
      if (branch_id) {
        if (branch_id === '1') {
          incomeQuery = incomeQuery.or('branch_id.eq.1,branch_id.is.null');
          expenseQuery = expenseQuery.or('branch_id.eq.1,branch_id.is.null');
        } else {
          incomeQuery = incomeQuery.eq("branch_id", branch_id);
          expenseQuery = expenseQuery.eq("branch_id", branch_id);
        }
      }
      
      let { data: incomeData, error: incomeError } = await incomeQuery;
      let { data: expenseData, error: expenseError } = await expenseQuery;

      // Handle missing branch_id column
      if ((incomeError && incomeError.code === '42703') || (expenseError && expenseError.code === '42703')) {
        const { data: fIncome } = await client.from("journal").select("credit").in("category", ["Income", "Adjustment"]);
        const { data: fExpense } = await client.from("journal").select("debit").in("category", ["Expense", "Adjustment"]);
        incomeData = fIncome;
        expenseData = fExpense;
        incomeError = null;
        expenseError = null;
      }

      if (incomeError || expenseError) {
        console.error("Supabase error in GET /api/reports/profit-loss:", { incomeError, expenseError });
        return res.json({ income: 0, expenses: 0 });
      }

      const income = (incomeData || []).reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const expenses = (expenseData || []).reduce((sum, item) => sum + (Number(item.debit) || 0), 0);

      res.json({ income, expenses });
    } catch (error: any) {
      console.error("Error in GET /api/reports/profit-loss:", error);
      res.json({ income: 0, expenses: 0 });
    }
  });

  app.get("/api/menus", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.json([]);
      const { branch_id } = req.query;
      
      // Try fetching from menu_items first
      let menusQuery = client.from("menu_items").select("*");
      if (branch_id) {
        if (branch_id === '1') {
          menusQuery = menusQuery.or('branch_id.eq.1,branch_id.is.null');
        } else {
          menusQuery = menusQuery.eq("branch_id", branch_id);
        }
      }
      let { data: menus, error: menusError } = await menusQuery.order("name", { ascending: true });
      
      // Handle missing branch_id column in menu_items
      if (menusError && menusError.code === '42703') {
        const { data: retryData, error: retryError } = await client.from("menu_items").select("*").order("name", { ascending: true });
        menus = retryData;
        menusError = retryError;
      }

      // If menu_items fails (e.g. table doesn't exist), try falling back to 'menus' table
      if (menusError) {
        if (!isSupabaseTableMissing(menusError)) {
          console.error("Supabase error in GET /api/menus (menu_items):", menusError.message || menusError);
        }
        
        let fallbackQuery = client.from("menus").select("*");
        if (branch_id) {
          if (branch_id === '1') {
            fallbackQuery = fallbackQuery.or('branch_id.eq.1,branch_id.is.null');
          } else {
            fallbackQuery = fallbackQuery.eq("branch_id", branch_id);
          }
        }
        let { data: fallbackMenus, error: fallbackError } = await fallbackQuery.order("name", { ascending: true });
        
        // Handle missing branch_id column in menus fallback
        if (fallbackError && fallbackError.code === '42703') {
          const { data: retryFallback, error: retryFallbackError } = await client.from("menus").select("*").order("name", { ascending: true });
          fallbackMenus = retryFallback;
          fallbackError = retryFallbackError;
        }

        if (fallbackError) {
          if (!isSupabaseTableMissing(fallbackError)) {
            console.error("Supabase error in GET /api/menus (menus fallback):", fallbackError.message || fallbackError);
          }
          return res.json([]); // Return empty array if both fail
        }
        menus = fallbackMenus;
      }
      
      if (!menus) return res.json([]);

      const { data: ingredients, error: ingError } = await client
        .from("menu_ingredients")
        .select(`
          menu_id,
          quantity,
          inventory:inventory_id (cost_per_unit)
        `);
      
      if (ingError) {
        if (!isSupabaseTableMissing(ingError)) {
          console.error("Supabase error in GET /api/menus (ingredients):", ingError.message || ingError);
        }
        // Still return menus even if ingredients fail
        return res.json(menus.map(m => ({ ...m, hpp: 0, profit: m.price || 0 })));
      }

      const menusWithHpp = (menus || []).map((menu: any) => {
        const menuIngs = (ingredients || []).filter((ing: any) => ing.menu_id === menu.id);
        const hpp = menuIngs.reduce((sum: number, ing: any) => {
          const cost = ing.inventory?.cost_per_unit || 0;
          return sum + (ing.quantity * cost);
        }, 0);
        return {
          ...menu,
          hpp,
          profit: (menu.price || 0) - hpp
        };
      });

      res.json(menusWithHpp);
    } catch (error: any) {
      console.error("Error in GET /api/menus:", error);
      res.json([]); // Return empty array instead of 500
    }
  });

  app.post("/api/menus", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { branch_id, name, price } = req.body;
    
    // Try inserting into menu_items first
    let { data, error } = await client
      .from("menu_items")
      .insert([{ branch_id: branch_id || 2, name, price: price || 0 }])
      .select();
    
    // Fallback to 'menus' table if menu_items doesn't exist
    if (error && isSupabaseTableMissing(error)) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("menus")
        .insert([{ branch_id: branch_id || 2, name, price: price || 0 }])
        .select();
      data = fallbackData;
      error = fallbackError;
    }

    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ 
          error: "Tabel menu tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda untuk membuat tabel 'menu_items'." 
        });
      }
      console.error("Supabase error in POST /api/menus:", error.message || error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan menu ke database." });
    }
    
    res.json(data[0]);
  });

  app.put("/api/menus/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { name, price } = req.body;
    let { data, error } = await client
      .from("menu_items")
      .update({ name, price })
      .eq("id", req.params.id)
      .select();
    
    // Fallback to 'menus' table if menu_items doesn't exist
    if (error && isSupabaseTableMissing(error)) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("menus")
        .update({ name, price })
        .eq("id", req.params.id)
        .select();
      data = fallbackData;
      error = fallbackError;
    }

    if (error) {
      if (isSupabaseTableMissing(error)) {
        return res.status(500).json({ 
          error: "Tabel menu tidak ditemukan. Silakan jalankan script SQL setup di dashboard Supabase Anda." 
        });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json(data[0]);
  });

  app.delete("/api/menus/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("menu_items")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/menus/:menuId/ingredients", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { data, error } = await client
      .from("menu_ingredients")
      .select(`
        *,
        inventory:inventory_id (name, unit)
      `)
      .eq("menu_id", req.params.menuId);
    
    if (error) return res.status(500).json({ error: error.message });
    
    const flattened = data.map(r => ({
      ...r,
      inventory_name: r.inventory?.name,
      inventory_unit: r.inventory?.unit
    }));
    
    res.json(flattened);
  });

  app.post("/api/menu-ingredients", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { menu_id, inventory_id, quantity } = req.body;
    const { data, error } = await client
      .from("menu_ingredients")
      .insert([{ menu_id, inventory_id, quantity }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/menu-ingredients/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("menu_ingredients")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/units", async (req, res) => {
    console.log("Fetching units...");
    try {
      // Use a fresh client to ensure we use the most up-to-date keys from process.env
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.SUPABASE_ANON_KEY;
      const url = process.env.SUPABASE_URL || "";
      const key = serviceKey || anonKey || "";
      
      const client = createClient(url, key);
      
      const { data, error } = await client
        .from("units")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) {
        if (isSupabaseTableMissing(error)) {
          console.warn("Table 'units' does not exist in Supabase, returning empty array.");
          return res.json([]);
        }
        console.error("Supabase error in GET /api/units:", error.message || error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log(`Fetched ${data?.length || 0} units. (Using ${serviceKey ? 'Service Role' : 'Anon'} Key)`);
      res.json(data || []);
    } catch (err: any) {
      console.error("Unexpected error in GET /api/units:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/units", async (req, res) => {
    const { name } = req.body;
    console.log(`Attempting to add unit: ${name}`);
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Nama satuan tidak valid" });
    }
    
    const trimmedName = name.trim().toUpperCase();
    if (!trimmedName) {
      return res.status(400).json({ error: "Nama satuan tidak boleh kosong" });
    }

    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.SUPABASE_ANON_KEY;
      const url = process.env.SUPABASE_URL || "";
      const key = serviceKey || anonKey || "";
      
      const client = createClient(url, key);

      // Check if exists first to provide better error
      const { data: existing } = await client
        .from("units")
        .select("id, name")
        .eq("name", trimmedName)
        .maybeSingle();
      
      if (existing) {
        console.log(`Unit ${trimmedName} already exists (ID: ${existing.id})`);
        return res.status(400).json({ error: `Unit "${trimmedName}" already exists in database.` });
      }

      const { data, error } = await client
        .from("units")
        .insert([{ name: trimmedName }])
        .select();
      
      if (error) {
        console.error(`Error adding unit ${trimmedName}:`, error);
        if (error.code === "23505") return res.status(400).json({ error: `Unit "${trimmedName}" already exists (Unique constraint).` });
        return res.status(500).json({ error: error.message });
      }
      
      console.log(`Successfully added unit: ${trimmedName}`);
      if (!data || data.length === 0) {
        return res.status(500).json({ error: "Gagal menyimpan satuan" });
      }
      
      res.json({ id: data[0].id });
    } catch (err: any) {
      console.error("Unexpected error in POST /api/units:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("units")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/personal-info", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.json([]);
      
      // Try fetching from personal_info first
      let { data, error } = await client
        .from("personal_info")
        .select("*")
        .order("id", { ascending: true });
      
      // If personal_info fails, try falling back to 'personal_information' table
      if (error) {
        if (!isSupabaseTableMissing(error)) {
          console.error("Supabase error in GET /api/personal-info (personal_info):", error.message || error);
        }
        const { data: fallbackData, error: fallbackError } = await client
          .from("personal_information")
          .select("*")
          .order("id", { ascending: true });
        
        if (fallbackError) {
          if (!isSupabaseTableMissing(fallbackError)) {
            console.error("Supabase error in GET /api/personal-info (personal_information fallback):", fallbackError.message || fallbackError);
          }
          return res.json([]); // Return empty array if both fail
        }
        data = fallbackData;
      }
      
      res.json(data || []);
    } catch (error: any) {
      console.error("Error in GET /api/personal-info:", error);
      res.json([]);
    }
  });

  app.get("/api/personal-info/check-email/:email", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { email } = req.params;
    const { data, error } = await client
      .from("personal_info")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    
    if (error) {
      console.error("Supabase error in GET /api/personal-info/check-email:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ exists: !!data });
  });

  app.post("/api/personal-info", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { full_name, email, address, birth_info, ktp_number, phone_number, join_date, role } = req.body;
    
    // Try inserting into personal_info first
    let { data, error } = await client
      .from("personal_info")
      .insert([{ full_name, email, address, birth_info, ktp_number, phone_number, join_date, role }])
      .select();
    
    // Fallback to 'personal_information' if personal_info doesn't exist
    if (error && error.code === '42P01') {
      const { data: fallbackData, error: fallbackError } = await client
        .from("personal_information")
        .insert([{ full_name, email, address, birth_info, ktp_number, phone_number, join_date, role }])
        .select();
      data = fallbackData;
      error = fallbackError;
    }

    if (error) {
      console.error("Supabase error in POST /api/personal-info:", error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }
    
    res.json(data[0]);
  });

  app.put("/api/personal-info/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { full_name, email, address, birth_info, ktp_number, phone_number, join_date, role } = req.body;
    const { data, error } = await client
      .from("personal_info")
      .update({ full_name, email, address, birth_info, ktp_number, phone_number, join_date, role })
      .eq("id", req.params.id)
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/personal-info/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(500).json({ error: "Supabase not configured" });
    const { error } = await client
      .from("personal_info")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/purchases", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.json([]);
      const { branch_id } = req.query;
      
      let query = client.from("purchases").select("*");
      if (branch_id) {
        if (branch_id === '1') {
          query = query.or('branch_id.eq.1,branch_id.is.null');
        } else {
          query = query.eq("branch_id", branch_id);
        }
      }
      
      const { data, error } = await query.order("date", { ascending: false });
      
      if (error) {
        if (!isSupabaseTableMissing(error)) {
          console.error("Supabase error in GET /api/purchases:", error.message || error);
        }
        return res.json([]);
      }
      
      // Fetch inventory names separately to be safe if join fails
      const { data: invData } = await client.from("inventory").select("id, name");
      const invMap = (invData || []).reduce((acc: any, item: any) => {
        acc[item.id] = item.name;
        return acc;
      }, {});

      const formattedData = (data || []).map((p: any) => ({
        ...p,
        inventory_name: invMap[p.inventory_id] || "Unknown Item"
      }));
      
      res.json(formattedData);
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      res.json([]);
    }
  });

  app.post("/api/transactions/purchase", async (req, res) => {
    const { branch_id, inventory_id, quantity, total_cost, date, description } = req.body;
    const invId = parseInt(inventory_id);
    
    try {
      const client = getSupabaseClient();
      if (!client) return res.status(500).json({ error: "Supabase not configured" });
      if (isNaN(invId)) throw new Error("Invalid Inventory ID");

      // 1. Get current quantity
      const { data: inv, error: invError } = await client.from("inventory").select("quantity").eq("id", invId).single();
      if (invError) throw new Error(invError.message);
      
      const newQty = (inv?.quantity || 0) + quantity;

      // 2. Update Inventory
      const costPerUnit = total_cost / quantity;
      const { error: updateError } = await client
        .from("inventory")
        .update({ 
          quantity: newQty,
          cost_per_unit: costPerUnit
        })
        .eq("id", invId);
      
      if (updateError) throw new Error(updateError.message);
      
      // 3. Add Journal Entry
      const { error: journalError } = await client.from("journal").insert([{ branch_id: branch_id || 2, date, description, debit: total_cost, credit: 0, category: "Expense" }]);
      if (journalError) throw new Error(journalError.message);

      // 4. Add Purchase Record
      const { error: purchaseError } = await client.from("purchases").insert([{ 
        branch_id: branch_id || 2,
        inventory_id: invId, 
        quantity, 
        total_cost, 
        date, 
        description 
      }]);
      
      if (purchaseError) {
        console.error("Purchase record insert failed:", purchaseError);
        throw new Error("Gagal mencatat riwayat pembelian: " + purchaseError.message);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Transaction failed:", err);
      res.status(500).json({ error: err.message || "Transaction failed" });
    }
  });

  app.delete("/api/purchases/:id", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.status(500).json({ error: "Supabase not configured" });
      // 1. Get purchase details
      const { data: purchase, error: fetchError } = await client
        .from("purchases")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (fetchError || !purchase) throw new Error("Purchase not found");

      // 2. Reverse inventory
      const { data: inv } = await client.from("inventory").select("quantity").eq("id", purchase.inventory_id).single();
      const newQty = (inv?.quantity || 0) - purchase.quantity;
      await client.from("inventory").update({ quantity: newQty }).eq("id", purchase.inventory_id);

      // 3. Delete matching journal entry
      await client.from("journal")
        .delete()
        .eq("date", purchase.date)
        .eq("description", purchase.description)
        .eq("debit", purchase.total_cost)
        .eq("category", "Expense");

      // 4. Delete purchase record
      const { error: deleteError } = await client.from("purchases").delete().eq("id", req.params.id);
      if (deleteError) throw deleteError;

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/transactions/sale", async (req, res) => {
    const { branch_id, amount, date, description, items_sold, menu_id, payment_method } = req.body;
    
    try {
      const client = getSupabaseClient();
      if (!client) return res.status(500).json({ error: "Supabase not configured" });
      // 1. Add Journal Entry
      // Note: For Income, debit: 0, credit: amount. 
      // The 'payment_method' (Kas/Bank) will be stored in the 'payment_method' column of the journal.
      const { error: journalError } = await client.from("journal").insert([{ 
        branch_id: branch_id || 2,
        date, 
        description, 
        debit: 0, 
        credit: amount, 
        category: "Income",
        payment_method: payment_method || "Kas"
      }]);

      if (journalError) {
        console.error("Journal entry failed for sale:", journalError);
        throw new Error("Gagal mencatat jurnal: " + journalError.message);
      }

      // 2. Deduct Inventory
      if (menu_id) {
        // Deduct based on specific menu ingredients
        const { data: ingredients, error: ingError } = await client
          .from("menu_ingredients")
          .select("*")
          .eq("menu_id", menu_id);
        
        if (ingError) {
          console.error("Failed to fetch ingredients for menu:", ingError);
        } else if (ingredients) {
          for (const ingredient of ingredients) {
            const totalDeduction = ingredient.quantity * items_sold;
            const { data: inv, error: invFetchError } = await client.from("inventory").select("quantity").eq("id", ingredient.inventory_id).single();
            
            if (!invFetchError && inv) {
              const newQty = (inv.quantity || 0) - totalDeduction;
              await client.from("inventory").update({ quantity: newQty }).eq("id", ingredient.inventory_id);
            }
          }
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Sale transaction failed:", err);
      res.status(500).json({ error: err.message || "Transaction failed" });
    }
  });

  // Excel Routes for Sales
  app.get("/api/transactions/sale/template", (req, res) => {
    const template = [
      {
        Tanggal: new Date().toISOString().split('T')[0],
        Keterangan: "Penjualan Harian",
        "Total Penjualan (IDR)": 0,
        "Jumlah Terjual": 1,
        "Metode Pembayaran": "Kas",
        "Menu ID": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Penjualan");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=template_penjualan.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.get("/api/transactions/sale/export", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) return res.status(500).json({ error: "Supabase not configured" });
      const { data, error } = await client
        .from("journal")
        .select("*")
        .eq("category", "Income")
        .order("date", { ascending: false });
      
      if (error) throw error;

      const exportData = (data || []).map(entry => ({
        Tanggal: entry.date,
        Keterangan: entry.description,
        "Total Penjualan (IDR)": entry.credit,
        "Metode Pembayaran": entry.payment_method || "Kas"
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Penjualan");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", "attachment; filename=data_penjualan.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/sale/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);

      const results = [];
      for (const row of data) {
        const date = row["Tanggal"];
        const description = row["Keterangan"];
        const amount = row["Total Penjualan (IDR)"];
        const items_sold = row["Jumlah Terjual"] || 1;
        const menu_id = row["Menu ID"];
        const payment_method = row["Metode Pembayaran"] || "Kas";

        if (!date || !amount) continue;

        // Reuse the sale logic
        // 1. Add Journal Entry
        const client = getSupabaseClient();
        if (!client) throw new Error("Supabase not configured");
        const { error: journalError } = await client.from("journal").insert([{ 
          branch_id: 2, // Default to RUMASA HILLSIDE for imports
          date, 
          description, 
          debit: 0, 
          credit: amount, 
          category: "Income",
          payment_method: payment_method
        }]);

        if (journalError) throw journalError;

        // 2. Deduct Inventory if menu_id provided
        if (menu_id) {
          const { data: ingredients, error: ingError } = await client
            .from("menu_ingredients")
            .select("*")
            .eq("menu_id", menu_id);
          
          if (!ingError && ingredients) {
            for (const ingredient of ingredients) {
              const totalDeduction = ingredient.quantity * items_sold;
              const { data: inv } = await client.from("inventory").select("quantity").eq("id", ingredient.inventory_id).single();
              if (inv) {
                const newQty = (inv.quantity || 0) - totalDeduction;
                await client.from("inventory").update({ quantity: newQty }).eq("id", ingredient.inventory_id);
              }
            }
          }
        }
        results.push(row);
      }

      res.json({ success: true, imported: results.length });
    } catch (error: any) {
      console.error("Import failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // In production (but NOT on Vercel), we serve static files from dist
    // On Vercel, we let Vercel's static file server handle this via vercel.json
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false })); // Disable default index serving
    
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf8");
        
        // Inject environment variables for the frontend
        const envConfig = {
          VITE_SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
        };
        
        const script = `<script>window.__ENV__ = ${JSON.stringify(envConfig)};</script>`;
        html = html.replace("<head>", `<head>${script}`);
        
        res.send(html);
      } else {
        res.status(404).send("Index file not found. Please run build first.");
      }
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });
}

// Initialize routes and start server
async function init() {
  await startServer();

  // Start server if not on Vercel
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

init();

export default app;
