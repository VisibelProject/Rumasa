import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Egress Tracking State (Simple in-memory for this demo, but could be DB-backed)
let monthlyEgressBytes = 0;
const EGRESS_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const EGRESS_WARNING_THRESHOLD = 0.8; // 80%

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(express.json());

  // Egress Tracking Middleware
  app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function (data) {
      if (data) {
        const size = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
        monthlyEgressBytes += size;
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

  app.get("/api/inventory", async (req, res) => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
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
    const { quantity } = req.body;
    const { error } = await supabase
      .from("inventory")
      .update({ quantity })
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
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/journal", async (req, res) => {
    const { date, description, debit, credit, category } = req.body;
    const { data, error } = await supabase
      .from("journal")
      .insert([{ date, description, debit, credit, category }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
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
    
    if (error) return res.status(500).json({ error: error.message });
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

    if (incomeError || expenseError) return res.status(500).json({ error: "Failed to fetch report data" });

    const income = incomeData.reduce((sum, item) => sum + (item.credit || 0), 0);
    const expenses = expenseData.reduce((sum, item) => sum + (item.debit || 0), 0);

    res.json({ income, expenses });
  });

  app.get("/api/menus", async (req, res) => {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/menus", async (req, res) => {
    const { name, price } = req.body;
    const { data, error } = await supabase
      .from("menus")
      .insert([{ name, price: price || 0 }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
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
    
    if (error) return res.status(500).json({ error: error.message });
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
      
      if (error) throw error;
      
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
      const { error: updateError } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", invId);
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
    const { amount, date, description, items_sold, menu_id } = req.body;
    
    try {
      // 1. Add Journal Entry
      await supabase.from("journal").insert([{ date, description, debit: 0, credit: amount, category: "Income" }]);

      // 2. Deduct Inventory
      if (menu_id) {
        // Deduct based on specific menu ingredients
        const { data: ingredients } = await supabase
          .from("menu_ingredients")
          .select("*")
          .eq("menu_id", menu_id);
        
        if (ingredients) {
          for (const ingredient of ingredients) {
            const totalDeduction = ingredient.quantity * items_sold;
            const { data: inv } = await supabase.from("inventory").select("quantity").eq("id", ingredient.inventory_id).single();
            const newQty = (inv?.quantity || 0) - totalDeduction;
            await supabase.from("inventory").update({ quantity: newQty }).eq("id", ingredient.inventory_id);
          }
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Sale transaction failed:", err);
      res.status(500).json({ error: "Transaction failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  // Only listen if not running as a serverless function (Vercel)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  return app;
}

// Export the promise of the app for Vercel
export default startServer();
