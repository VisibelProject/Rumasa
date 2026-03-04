import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("resto.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    cost_per_unit REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    account TEXT,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    lifespan_years INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    quantity_per_unit REAL NOT NULL,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

// Seed initial data if empty
const invCount = db.prepare("SELECT count(*) as count FROM inventory").get() as { count: number };
if (invCount.count === 0) {
  // Seed default units
  const defaultUnits = ['GR', 'ML', 'PCS', 'KG'];
  for (const unit of defaultUnits) {
    db.prepare("INSERT OR IGNORE INTO units (name) VALUES (?)").run(unit);
  }

  db.prepare("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)").run("Biji Kopi Arabica", "KG", 15);
  db.prepare("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)").run("Susu UHT", "ML", 5000);
  db.prepare("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)").run("Gula Aren", "GR", 2000);
  
  db.prepare("INSERT INTO journal (date, description, debit, credit, category) VALUES (?, ?, ?, ?, ?)")
    .run(new Date().toISOString().split('T')[0], "Penjualan Harian", 0, 1500000, "Income");
  db.prepare("INSERT INTO journal (date, description, debit, credit, category) VALUES (?, ?, ?, ?, ?)")
    .run(new Date().toISOString().split('T')[0], "Beli Bahan Baku", 450000, 0, "Expense");

  db.prepare("INSERT INTO assets (name, type, purchase_date, purchase_price, lifespan_years) VALUES (?, ?, ?, ?, ?)")
    .run("Mesin Espresso Simonelli", "Machinery", "2024-01-15", 45000000, 8);

  // Seed a default recipe: 1 sale = 20g coffee beans
  const coffeeId = db.prepare("SELECT id FROM inventory WHERE name = ?").get("Biji Kopi Arabica") as { id: number };
  if (coffeeId) {
    db.prepare("INSERT INTO recipes (inventory_id, quantity_per_unit) VALUES (?, ?)").run(coffeeId.id, 20);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/inventory", (req, res) => {
    const items = db.prepare("SELECT * FROM inventory ORDER BY name ASC").all();
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const { name, unit, quantity } = req.body;
    const result = db.prepare("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)").run(name, unit, quantity);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/inventory/:id", (req, res) => {
    const { quantity } = req.body;
    db.prepare("UPDATE inventory SET quantity = ? WHERE id = ?").run(quantity, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/inventory/:id", (req, res) => {
    db.prepare("DELETE FROM inventory WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/journal", (req, res) => {
    const entries = db.prepare("SELECT * FROM journal ORDER BY date DESC, id DESC").all();
    res.json(entries);
  });

  app.post("/api/journal", (req, res) => {
    const { date, description, debit, credit, category } = req.body;
    const result = db.prepare("INSERT INTO journal (date, description, debit, credit, category) VALUES (?, ?, ?, ?, ?)")
      .run(date, description, debit, credit, category);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/journal/:id", (req, res) => {
    db.prepare("DELETE FROM journal WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/assets", (req, res) => {
    const assets = db.prepare("SELECT * FROM assets").all();
    res.json(assets);
  });

  app.post("/api/assets", (req, res) => {
    const { name, type, purchase_date, purchase_price, lifespan_years } = req.body;
    const result = db.prepare("INSERT INTO assets (name, type, purchase_date, purchase_price, lifespan_years) VALUES (?, ?, ?, ?, ?)")
      .run(name, type, purchase_date, purchase_price, lifespan_years);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/assets/:id", (req, res) => {
    db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/reports/profit-loss", (req, res) => {
    const income = db.prepare("SELECT SUM(credit) as total FROM journal WHERE category = 'Income'").get() as { total: number };
    const expenses = db.prepare("SELECT SUM(debit) as total FROM journal WHERE category = 'Expense'").get() as { total: number };
    res.json({
      income: income.total || 0,
      expenses: expenses.total || 0
    });
  });

  // Recipe Endpoints
  app.get("/api/recipes", (req, res) => {
    const recipes = db.prepare(`
      SELECT r.*, i.name as inventory_name, i.unit as inventory_unit 
      FROM recipes r 
      JOIN inventory i ON r.inventory_id = i.id
    `).all();
    res.json(recipes);
  });

  app.post("/api/recipes", (req, res) => {
    const { inventory_id, quantity_per_unit } = req.body;
    const result = db.prepare("INSERT INTO recipes (inventory_id, quantity_per_unit) VALUES (?, ?)").run(inventory_id, quantity_per_unit);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/recipes/:id", (req, res) => {
    db.prepare("DELETE FROM recipes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Unit Endpoints
  app.get("/api/units", (req, res) => {
    const units = db.prepare("SELECT * FROM units ORDER BY name ASC").all();
    res.json(units);
  });

  app.post("/api/units", (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare("INSERT INTO units (name) VALUES (?)").run(name.toUpperCase());
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(400).json({ error: "Unit already exists" });
    }
  });

  app.delete("/api/units/:id", (req, res) => {
    db.prepare("DELETE FROM units WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Purchase Transaction
  app.post("/api/transactions/purchase", (req, res) => {
    const { inventory_id, quantity, total_cost, date, description } = req.body;
    
    const transaction = db.transaction(() => {
      // 1. Update Inventory
      db.prepare("UPDATE inventory SET quantity = quantity + ? WHERE id = ?").run(quantity, inventory_id);
      
      // 2. Add Journal Entry
      db.prepare("INSERT INTO journal (date, description, debit, credit, category) VALUES (?, ?, ?, ?, ?)")
        .run(date, description, total_cost, 0, "Expense");
    });

    transaction();
    res.json({ success: true });
  });

  // Sale Transaction
  app.post("/api/transactions/sale", (req, res) => {
    const { amount, date, description, items_sold } = req.body;
    
    const transaction = db.transaction(() => {
      // 1. Add Journal Entry
      db.prepare("INSERT INTO journal (date, description, debit, credit, category) VALUES (?, ?, ?, ?, ?)")
        .run(date, description, 0, amount, "Income");

      // 2. Deduct Inventory based on recipes
      // For simplicity, we assume 'items_sold' is the number of units sold (e.g., cups of coffee)
      // and we apply ALL active recipes to each unit sold.
      const recipes = db.prepare("SELECT * FROM recipes").all() as { inventory_id: number, quantity_per_unit: number }[];
      
      for (const recipe of recipes) {
        const totalDeduction = recipe.quantity_per_unit * items_sold;
        
        // Check inventory unit. If it's KG and recipe is in GR, we need to convert.
        // For now, let's assume the recipe quantity matches the inventory unit.
        // In a real app, we'd handle unit conversions.
        
        db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE id = ?").run(totalDeduction, recipe.inventory_id);
      }
    });

    transaction();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
