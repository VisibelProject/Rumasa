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

export interface Recipe {
  id: number;
  inventory_id: number;
  inventory_name: string;
  inventory_unit: string;
  quantity_per_unit: number;
}
