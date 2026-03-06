import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as XLSX from "xlsx";
import multer from "multer";

dotenv.config();

console.log("Environment check:");
console.log("- SUPABASE_URL:", process.env.SUPABASE_URL ? "Defined" : "MISSING");
console.log("- SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Defined" : "MISSING");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- VERCEL:", process.env.VERCEL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection on startup
(async () => {
  try {
    const { data, error } = await supabase.from("inventory").select("id").limit(1);
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

  // API Routes
  app.get("/api/egress-status", (req, res) => {
    res.json({
      usage: monthlyEgressBytes,
      limit: EGRESS_LIMIT_BYTES,
      percentage: (monthlyEgressBytes / EGRESS_LIMIT_BYTES) * 100,
      warning: monthlyEgressBytes > EGRESS_LIMIT_BYTES * EGRESS_WARNING_THRESHOLD
    });
  });

  app.get("/api/coa", async (req, res) => {
    const { data, error } = await supabase
      .from("coa")
      .select("*")
      .order("code", { ascending: true });
    
    if (error) {
      console.error("Supabase error in GET /api/coa:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/coa", async (req, res) => {
    const { code, name, category } = req.body;
    const { data, error } = await supabase
      .from("coa")
      .insert([{ code, name, category }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/coa/:id", async (req, res) => {
    const { error } = await supabase
      .from("coa")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/stock-opname", async (req, res) => {
    const { data, error } = await supabase
      .from("stock_opname")
      .select("*")
      .order("date", { ascending: false });
    
    if (error) {
      console.error("Supabase error in GET /api/stock-opname:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/stock-opname", async (req, res) => {
    const { reference_no, date, type, status, description } = req.body;
    const { data, error } = await supabase
      .from("stock_opname")
      .insert([{ reference_no, date, type, status: status || 'Pending', description }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.put("/api/stock-opname/:id/status", async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase
      .from("stock_opname")
      .update({ status })
      .eq("id", req.params.id)
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/stock-opname/:id", async (req, res) => {
    const { error } = await supabase
      .from("stock_opname")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/inventory", async (req, res) => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      console.error("Supabase error in GET /api/inventory:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/inventory", async (req, res) => {
    const { name, unit, quantity, cost_per_unit } = req.body;
    const { data, error } = await supabase
      .from("inventory")
      .insert([{ name, unit, quantity, cost_per_unit }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.put("/api/inventory/:id", async (req, res) => {
    const { name, unit, quantity, cost_per_unit } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (cost_per_unit !== undefined) updateData.cost_per_unit = cost_per_unit;

    const { error } = await supabase
      .from("inventory")
      .update(updateData)
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/journal", async (req, res) => {
    const { data, error } = await supabase
      .from("journal")
      .select("*")
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    
    if (error) {
      console.error("Supabase error in GET /api/journal:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/journal", async (req, res) => {
    const { date, description, account, debit, credit, category, payment_method } = req.body;
    const { data, error } = await supabase
      .from("journal")
      .insert([{ date, description, account, debit, credit, category, payment_method }])
      .select();
    
    if (error) {
      console.error("Supabase error in POST /api/journal:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan data ke database." });
    }

    res.json({ id: data[0].id });
  });

  app.get("/api/reports/worksheet", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("journal")
        .select("*")
        .order("date", { ascending: true });
      
      if (error) throw error;

      // Group by payment_method and calculate totals
      const worksheet = {
        kas: { inflow: 0, outflow: 0, balance: 0 },
        bank: { inflow: 0, outflow: 0, balance: 0 },
        total: { inflow: 0, outflow: 0, balance: 0 }
      };

      (data || []).forEach((entry: any) => {
        const method = (entry.payment_method || "").toLowerCase();
        const credit = entry.credit || 0;
        const debit = entry.debit || 0;

        if (method === "kas") {
          worksheet.kas.inflow += credit;
          worksheet.kas.outflow += debit;
        } else if (method === "bank") {
          worksheet.bank.inflow += credit;
          worksheet.bank.outflow += debit;
        }

        worksheet.total.inflow += credit;
        worksheet.total.outflow += debit;
      });

      worksheet.kas.balance = worksheet.kas.inflow - worksheet.kas.outflow;
      worksheet.bank.balance = worksheet.bank.inflow - worksheet.bank.outflow;
      worksheet.total.balance = worksheet.total.inflow - worksheet.total.outflow;

      res.json(worksheet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/journal/:id", async (req, res) => {
    const { error } = await supabase
      .from("journal")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/assets", async (req, res) => {
    const { data, error } = await supabase
      .from("assets")
      .select("*");
    
    if (error) {
      console.error("Supabase error in GET /api/assets:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/assets", async (req, res) => {
    const { name, type, purchase_date, purchase_price, lifespan_years } = req.body;
    const { data, error } = await supabase
      .from("assets")
      .insert([{ name, type, purchase_date, purchase_price, lifespan_years }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.delete("/api/assets/:id", async (req, res) => {
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    const { data: incomeData, error: incomeError } = await supabase
      .from("journal")
      .select("credit")
      .eq("category", "Income");
    
    const { data: expenseData, error: expenseError } = await supabase
      .from("journal")
      .select("debit")
      .eq("category", "Expense");

    if (incomeError || expenseError) {
      console.error("Supabase error in GET /api/reports/profit-loss:", { incomeError, expenseError });
      return res.status(500).json({ error: "Failed to fetch report data" });
    }

    const income = incomeData.reduce((sum, item) => sum + (item.credit || 0), 0);
    const expenses = expenseData.reduce((sum, item) => sum + (item.debit || 0), 0);

    res.json({ income, expenses });
  });

  app.get("/api/menus", async (req, res) => {
    try {
      const { data: menus, error: menusError } = await supabase
        .from("menus")
        .select("*")
        .order("name", { ascending: true });
      
      if (menusError) throw menusError;

      const { data: ingredients, error: ingError } = await supabase
        .from("menu_ingredients")
        .select(`
          menu_id,
          quantity,
          inventory:inventory_id (cost_per_unit)
        `);
      
      if (ingError) throw ingError;

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
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/menus", async (req, res) => {
    const { name, price } = req.body;
    const { data, error } = await supabase
      .from("menus")
      .insert([{ name, price: price || 0 }])
      .select();
    
    if (error) {
      console.error("Supabase error in POST /api/menus:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data[0]);
  });

  app.put("/api/menus/:id", async (req, res) => {
    const { name, price } = req.body;
    const { data, error } = await supabase
      .from("menus")
      .update({ name, price })
      .eq("id", req.params.id)
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/menus/:id", async (req, res) => {
    const { error } = await supabase
      .from("menus")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/menus/:menuId/ingredients", async (req, res) => {
    const { data, error } = await supabase
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
    const { menu_id, inventory_id, quantity } = req.body;
    const { data, error } = await supabase
      .from("menu_ingredients")
      .insert([{ menu_id, inventory_id, quantity }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/menu-ingredients/:id", async (req, res) => {
    const { error } = await supabase
      .from("menu_ingredients")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/units", async (req, res) => {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) {
      console.error("Supabase error in GET /api/units:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  });

  app.post("/api/units", async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Nama satuan tidak valid" });
    }
    
    const trimmedName = name.trim().toUpperCase();
    if (!trimmedName) {
      return res.status(400).json({ error: "Nama satuan tidak boleh kosong" });
    }

    const { data, error } = await supabase
      .from("units")
      .insert([{ name: trimmedName }])
      .select();
    
    if (error) {
      if (error.code === "23505") return res.status(400).json({ error: "Unit already exists" });
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "Gagal menyimpan satuan" });
    }
    
    res.json({ id: data[0].id });
  });

  app.delete("/api/units/:id", async (req, res) => {
    const { error } = await supabase
      .from("units")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/purchases", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) {
        console.error("Supabase error in GET /api/purchases:", error);
        throw error;
      }
      
      // Fetch inventory names separately to be safe if join fails
      const { data: invData } = await supabase.from("inventory").select("id, name");
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
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/purchase", async (req, res) => {
    const { inventory_id, quantity, total_cost, date, description } = req.body;
    const invId = parseInt(inventory_id);
    
    try {
      if (isNaN(invId)) throw new Error("Invalid Inventory ID");

      // 1. Get current quantity
      const { data: inv, error: invError } = await supabase.from("inventory").select("quantity").eq("id", invId).single();
      if (invError) throw new Error(invError.message);
      
      const newQty = (inv?.quantity || 0) + quantity;

      // 2. Update Inventory
      const costPerUnit = total_cost / quantity;
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ 
          quantity: newQty,
          cost_per_unit: costPerUnit
        })
        .eq("id", invId);
      
      if (updateError) throw new Error(updateError.message);
      
      // 3. Add Journal Entry
      const { error: journalError } = await supabase.from("journal").insert([{ date, description, debit: total_cost, credit: 0, category: "Expense" }]);
      if (journalError) throw new Error(journalError.message);

      // 4. Add Purchase Record
      const { error: purchaseError } = await supabase.from("purchases").insert([{ 
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
      // 1. Get purchase details
      const { data: purchase, error: fetchError } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (fetchError || !purchase) throw new Error("Purchase not found");

      // 2. Reverse inventory
      const { data: inv } = await supabase.from("inventory").select("quantity").eq("id", purchase.inventory_id).single();
      const newQty = (inv?.quantity || 0) - purchase.quantity;
      await supabase.from("inventory").update({ quantity: newQty }).eq("id", purchase.inventory_id);

      // 3. Delete matching journal entry
      await supabase.from("journal")
        .delete()
        .eq("date", purchase.date)
        .eq("description", purchase.description)
        .eq("debit", purchase.total_cost)
        .eq("category", "Expense");

      // 4. Delete purchase record
      const { error: deleteError } = await supabase.from("purchases").delete().eq("id", req.params.id);
      if (deleteError) throw deleteError;

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/transactions/sale", async (req, res) => {
    const { amount, date, description, items_sold, menu_id, payment_method } = req.body;
    
    try {
      // 1. Add Journal Entry
      // Note: For Income, debit: 0, credit: amount. 
      // The 'payment_method' (Kas/Bank) will be stored in the 'payment_method' column of the journal.
      const { error: journalError } = await supabase.from("journal").insert([{ 
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
        const { data: ingredients, error: ingError } = await supabase
          .from("menu_ingredients")
          .select("*")
          .eq("menu_id", menu_id);
        
        if (ingError) {
          console.error("Failed to fetch ingredients for menu:", ingError);
        } else if (ingredients) {
          for (const ingredient of ingredients) {
            const totalDeduction = ingredient.quantity * items_sold;
            const { data: inv, error: invFetchError } = await supabase.from("inventory").select("quantity").eq("id", ingredient.inventory_id).single();
            
            if (!invFetchError && inv) {
              const newQty = (inv.quantity || 0) - totalDeduction;
              await supabase.from("inventory").update({ quantity: newQty }).eq("id", ingredient.inventory_id);
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
      const { data, error } = await supabase
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
        const { error: journalError } = await supabase.from("journal").insert([{ 
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
          const { data: ingredients, error: ingError } = await supabase
            .from("menu_ingredients")
            .select("*")
            .eq("menu_id", menu_id);
          
          if (!ingError && ingredients) {
            for (const ingredient of ingredients) {
              const totalDeduction = ingredient.quantity * items_sold;
              const { data: inv } = await supabase.from("inventory").select("quantity").eq("id", ingredient.inventory_id).single();
              if (inv) {
                const newQty = (inv.quantity || 0) - totalDeduction;
                await supabase.from("inventory").update({ quantity: newQty }).eq("id", ingredient.inventory_id);
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });
}

// Initialize routes
startServer();

// Start server if not on Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
