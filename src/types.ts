export type UserRole = 'Manager' | 'Admin' | 'Inventory' | 'Finance';

export interface Branch {
  id: number;
  name: string;
  location?: string;
}

export interface InventoryItem {
  id: number;
  branch_id: number;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  purchasing_physical_stock?: number;
  operational_physical_stock?: number;
  cleaning_physical_stock?: number;
  damaged_stock?: number;
  used_stock?: number;
  category: 'Raw Material' | 'Cleaning';
}

export interface Unit {
  id: number;
  name: string;
}

export interface JournalEntry {
  id: number;
  branch_id: number;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  category?: 'Income' | 'Expense' | 'Asset' | 'Adjustment' | 'Liability' | 'Equity';
  payment_method?: 'Bank' | 'Kas';
  is_adjustment?: boolean;
}

export interface Asset {
  id: number;
  branch_id: number;
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
  branch_id: number;
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
  category: 'Income' | 'Expense' | 'Asset' | 'Adjustment' | 'Liability' | 'Equity';
}

export interface Purchase {
  id: number;
  branch_id: number;
  inventory_id: number;
  inventory_name?: string;
  quantity: number;
  total_cost: number;
  date: string;
  description: string;
}

export interface PersonalInformation {
  id: number;
  full_name: string;
  email: string;
  address: string;
  birth_info: string;
  ktp_number: string;
  phone_number: string;
  join_date: string;
  role: string;
}
