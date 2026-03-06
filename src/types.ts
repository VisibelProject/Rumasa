export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
}

export interface Unit {
  id: number;
  name: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  category: 'Income' | 'Expense' | 'Asset';
  payment_method?: 'Bank' | 'Kas';
}

export interface Asset {
  id: number;
  name: string;
  type: 'Machinery' | 'Office Equipment';
  purchase_date: string;
  purchase_price: number;
  lifespan_years: number;
}

export interface ProfitLoss {
  income: number;
  expenses: number;
}

export interface Menu {
  id: number;
  name: string;
  price: number;
  hpp?: number;
  profit?: number;
}

export interface MenuIngredient {
  id: number;
  menu_id: number;
  inventory_id: number;
  inventory_name: string;
  inventory_unit: string;
  quantity: number;
}

export interface COA {
  id: number;
  code: string;
  name: string;
  category: 'Income' | 'Expense' | 'Asset';
}

export interface Purchase {
  id: number;
  inventory_id: number;
  inventory_name?: string;
  quantity: number;
  total_cost: number;
  date: string;
  description: string;
}

export interface StockOpname {
  id: number;
  reference_no: string;
  date: string;
  type: 'Penambahan' | 'Pengurangan';
  status: 'Pending' | 'Accept';
  description: string;
}
