/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  BookOpen, 
  BarChart3, 
  HardDrive, 
  Plus, 
  Minus,
  Edit2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calculator,
  Trash2,
  ShoppingCart,
  Banknote,
  Settings,
  Coffee,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  List,
  FileDown,
  FileUp,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, JournalEntry, Asset, ProfitLoss, Unit, Menu, MenuIngredient, Purchase, COA, StockOpname, UserRole } from './types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'Stock Sistem' | 'Stock Opname' | 'journal' | 'reports' | 'assets' | 'purchase' | 'sale' | 'settings' | 'menu' | 'worksheet' | 'COA'>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('userRole');
    return (saved as UserRole) || 'Manager';
  });
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    return parseInt(localStorage.getItem('lowStockThreshold') || '10');
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [COA, setCOA] = useState<COA[]>([]);
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss>({ income: 0, expenses: 0 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [egressStatus, setEgressStatus] = useState<{ usage: number, limit: number, percentage: number, warning: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    localStorage.setItem('userRole', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('lowStockThreshold', lowStockThreshold.toString());
  }, [lowStockThreshold]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, journalRes, assetRes, plRes, unitsRes, menusRes, egressRes, purchasesRes, COARes, stockOpnameRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/journal'),
        fetch('/api/assets'),
        fetch('/api/reports/profit-loss'),
        fetch('/api/units'),
        fetch('/api/menus'),
        fetch('/api/egress-status'),
        fetch('/api/purchases'),
        fetch('/api/COA'),
        fetch('/api/stock-opname')
      ]);
      
      const invData = await invRes.json();
      const journalData = await journalRes.json();
      const assetData = await assetRes.json();
      const plData = await plRes.json();
      const unitsData = await unitsRes.json();
      const menusData = await menusRes.json();
      const egressData = await egressRes.json();
      const purchasesData = await purchasesRes.json();
      const COAData = await COARes.json();
      const stockOpnameData = await stockOpnameRes.json();

      setInventory(Array.isArray(invData) ? invData : []);
      setJournal(Array.isArray(journalData) ? journalData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setCOA(Array.isArray(COAData) ? COAData : []);
      setStockOpnames(Array.isArray(stockOpnameData) ? stockOpnameData : []);
      setProfitLoss(plData && !plData.error ? plData : { income: 0, expenses: 0 });
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setMenus(Array.isArray(menusData) ? menusData : []);
      setEgressStatus(egressData && !egressData.error ? egressData : null);

      // Report errors if any
      const errors = [
        invData.error, journalData.error, assetData.error, 
        plData.error, unitsData.error, menusData.error, egressData.error,
        purchasesData.error
      ].filter(Boolean);
      
      if (errors.length > 0) {
        console.error('Some data failed to load:', errors);
        alert('Gagal memuat beberapa data: ' + errors.join(', '));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDepreciation = (asset: Asset) => {
    const purchaseDate = new Date(asset.purchase_date);
    const today = new Date();
    const diffMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
    const totalMonths = asset.lifespan_years * 12;
    
    if (diffMonths <= 0) return 0;
    if (diffMonths >= totalMonths) return asset.purchase_price;
    
    return (asset.purchase_price / totalMonths) * diffMonths;
  };

  return (
    <div className="min-h-screen bg-cafe-paper text-cafe-ink font-sans flex">
      {/* Sidebar */}
      <aside className={`${isMinimized ? 'w-20' : 'w-72'} border-r border-cafe-ink/10 flex flex-col bg-cafe-cream/30 transition-all duration-300 relative`}>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute -right-3 top-10 bg-cafe-espresso text-cafe-paper rounded-full p-1 shadow-lg z-20 hover:scale-110 transition-transform"
        >
          {isMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`pt-8 pb-2 ${isMinimized ? 'px-2' : 'px-8'} border-b border-cafe-ink/10 transition-all`}>
          <div className="flex flex-col items-center text-center">
            <img 
              src="https://lh3.googleusercontent.com/d/1bYm_VD5lfX4FT3NcK-1ijtR_P_eShjwM" 
              alt="RestoManager Logo" 
              className={`${isMinimized ? 'w-12 h-12' : 'w-36 h-36'} mb-0 object-contain transition-all`}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        
        <nav className={`flex-1 ${isMinimized ? 'px-2' : 'px-6'} py-4 space-y-3 overflow-y-auto transition-all`}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Manager', 'Admin', 'Finance'] },
            { id: 'purchase', icon: ShoppingCart, label: 'Pembelian', roles: ['Manager', 'Admin', 'Inventory'] },
            { id: 'sale', icon: Banknote, label: 'Penjualan', roles: ['Manager', 'Admin', 'Finance'] },
            { id: 'menu', icon: Coffee, label: 'Menu', roles: ['Manager', 'Admin', 'Inventory'] },
            { 
              id: 'stock-group', 
              icon: Package, 
              label: 'Stock',
              isGroup: true,
              roles: ['Manager', 'Admin', 'Inventory'],
              subItems: [
                { id: 'Stock Sistem', icon: Package, label: 'Stock Sistem' },
                { id: 'Stock Opname', icon: RefreshCw, label: 'Stock Opname' },
              ]
            },
            { 
              id: 'journal-group', 
              icon: BookOpen, 
              label: 'Report',
              isGroup: true,
              roles: ['Manager', 'Admin', 'Finance'],
              subItems: [
                { id: 'journal', icon: BookOpen, label: 'Jurnal Umum' },
                { id: 'COA', icon: List, label: 'Chart of Accounts' },
                { id: 'worksheet', icon: Calculator, label: 'Worksheet' },
                { id: 'reports', icon: BarChart3, label: 'Laba Rugi' },
              ]
            },
            { id: 'assets', icon: HardDrive, label: 'Manajemen Aset', roles: ['Manager', 'Admin'] },
            { id: 'settings', icon: Settings, label: 'Settings', roles: ['Manager', 'Admin', 'Inventory'] },
          ].filter(item => item.roles.includes(userRole)).map((item) => {
            if (item.isGroup) {
              const isActive = item.subItems?.some(sub => sub.id === activeTab);
              const isOpen = item.id === 'journal-group' ? isJournalOpen : isStockOpen;
              const setIsOpen = item.id === 'journal-group' ? setIsJournalOpen : setIsStockOpen;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => !isMinimized && setIsOpen(!isOpen)}
                    className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-5 py-3.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                      isActive || isOpen
                        ? 'bg-cafe-espresso/5 text-cafe-espresso' 
                        : 'text-cafe-ink/60 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
                    }`}
                    title={isMinimized ? item.label : ''}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {!isMinimized && item.label}
                    </div>
                    {!isMinimized && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </button>
                  
                  <AnimatePresence>
                    {(!isMinimized && (isOpen || isActive)) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 space-y-1"
                      >
                        {item.subItems?.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setActiveTab(sub.id as any)}
                            className={`w-full flex items-center gap-4 px-5 py-2.5 text-xs font-medium transition-all duration-300 rounded-lg ${
                              activeTab === sub.id 
                                ? 'bg-cafe-espresso text-cafe-paper shadow-md' 
                                : 'text-cafe-ink/50 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
                            }`}
                          >
                            <sub.icon size={14} />
                            {sub.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'gap-4'} px-5 py-3.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                  activeTab === item.id 
                    ? 'bg-cafe-espresso text-cafe-paper shadow-lg shadow-cafe-espresso/20' 
                    : 'text-cafe-ink/60 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
                }`}
                title={isMinimized ? item.label : ''}
              >
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {!isMinimized && item.label}
              </button>
            );
          })}
        </nav>

        <div className={`p-8 border-t border-cafe-ink/10 ${isMinimized ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3 opacity-40">
            <div className="w-2 h-2 rounded-full bg-cafe-latte animate-pulse"></div>
            {!isMinimized && <span className="text-[10px] uppercase tracking-widest font-semibold">System Active</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 border-b border-cafe-ink/10 flex items-center justify-between px-10 bg-cafe-paper/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-serif italic text-cafe-espresso capitalize leading-none">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1.5 font-semibold">Overview & Management</p>
          </div>
          <div className="flex items-center gap-6">
            {egressStatus && egressStatus.warning && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse border border-rose-200">
                <RefreshCw size={12} className="animate-spin" />
                Egress Tinggi: {egressStatus.percentage.toFixed(1)}%
              </div>
            )}
            <button 
              onClick={fetchData}
              className="p-3 hover:bg-cafe-espresso/5 rounded-full transition-all text-cafe-espresso"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-cafe-latte font-bold mb-4">Total Pendapatan</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-mono text-cafe-ink">{formatCurrency(profitLoss.income)}</h3>
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-cafe-latte font-bold mb-4">Total Pengeluaran</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-mono text-cafe-ink">{formatCurrency(profitLoss.expenses)}</h3>
                      <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                        <TrendingDown size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-cafe-espresso text-cafe-paper p-8 rounded-2xl shadow-xl shadow-cafe-espresso/20">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-cafe-paper/50 font-bold mb-4">Laba Bersih</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-mono">{formatCurrency(profitLoss.income - profitLoss.expenses)}</h3>
                      <div className="p-2 bg-cafe-paper/10 rounded-lg">
                        <Calculator size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-cafe-ink/5 flex justify-between items-center bg-cafe-cream/10">
                      <h4 className="font-serif italic text-lg text-cafe-espresso">Stok Menipis</h4>
                      <Package size={18} className="text-cafe-latte" />
                    </div>
                    <div className="divide-y divide-cafe-ink/5">
                      {inventory.filter(i => i.quantity < lowStockThreshold).slice(0, 5).map(item => (
                        <div key={item.id} className="p-6 flex justify-between items-center hover:bg-cafe-cream/20 transition-colors">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="font-mono text-[11px] px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                      {inventory.filter(i => i.quantity < lowStockThreshold).length === 0 && (
                        <div className="p-10 text-center text-sm opacity-40 italic font-serif">Semua stok aman.</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-cafe-ink/5 flex justify-between items-center bg-cafe-cream/10">
                      <h4 className="font-serif italic text-lg text-cafe-espresso">Transaksi Terakhir</h4>
                      <BookOpen size={18} className="text-cafe-latte" />
                    </div>
                    <div className="divide-y divide-cafe-ink/5">
                      {journal.slice(0, 5).map(entry => (
                        <div key={entry.id} className="p-6 flex justify-between items-center hover:bg-cafe-cream/20 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-cafe-ink">{entry.description}</p>
                            <p className="text-[10px] opacity-40 font-mono mt-1">{entry.date}</p>
                          </div>
                          <span className={`font-mono text-xs font-bold ${entry.debit > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {entry.debit > 0 ? `-${formatCurrency(entry.debit)}` : `+${formatCurrency(entry.credit)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Stock Sistem' && (
              <InventoryView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'Stock Opname' && (
              <StockOpnameView stockOpnames={stockOpnames} inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'journal' && (
              <JournalView journal={journal} COA={COA} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'COA' && (
              <COAView COA={COA} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'worksheet' && (
              <WorksheetView journal={journal} />
            )}

            {activeTab === 'reports' && (
              <ReportsView profitLoss={profitLoss} journal={journal} />
            )}

            {activeTab === 'assets' && (
              <AssetsView assets={assets} onUpdate={fetchData} calculateDepreciation={calculateDepreciation} userRole={userRole} />
            )}

            {activeTab === 'purchase' && (
              <PurchaseView inventory={inventory} purchases={purchases} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'sale' && (
              <SaleView menus={menus} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'menu' && (
              <MenuView inventory={inventory} menus={menus} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                inventory={inventory} 
                units={units} 
                onUpdateUnits={fetchData} 
                userRole={userRole} 
                setUserRole={setUserRole} 
                lowStockThreshold={lowStockThreshold}
                setLowStockThreshold={setLowStockThreshold}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function InventoryView({ inventory, units, onUpdate, userRole }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'GR', quantity: 0, cost_per_unit: 0 });
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (units.length > 0 && !newItem.unit) {
      setNewItem(prev => ({ ...prev, unit: units[0].name }));
    }
  }, [units]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    setShowAdd(false);
    onUpdate();
  };

  const handleUpdateStock = async (id: number, newQty: number) => {
    await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    });
    onUpdate();
  };

  const handleAdjustStock = async (id: number, currentQty: number, type: 'add' | 'sub') => {
    const amount = prompt(`Masukkan jumlah untuk ${type === 'add' ? 'ditambah' : 'dikurang'}:`);
    if (amount && !isNaN(parseFloat(amount))) {
      const val = parseFloat(amount);
      const newQty = type === 'add' ? currentQty + val : Math.max(0, currentQty - val);
      await handleUpdateStock(id, newQty);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await fetch(`/api/inventory/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });
    setEditingItem(null);
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus item ini?')) return;
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Manajemen Inventaris</h3>
        {userRole !== 'Admin' && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Tambah Item
          </button>
        )}
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6"
          onSubmit={handleAdd}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Item</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Satuan</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newItem.unit}
              onChange={e => setNewItem({...newItem, unit: e.target.value})}
            >
              {units.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Awal</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.quantity}
              onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Harga Beli / Satuan</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.cost_per_unit}
              onChange={e => setNewItem({...newItem, cost_per_unit: parseFloat(e.target.value)})}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Simpan</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      {editingItem && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6"
          onSubmit={handleEditItem}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Item</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={editingItem.name}
              onChange={e => setEditingItem({...editingItem, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Satuan</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={editingItem.unit}
              onChange={e => setEditingItem({...editingItem, unit: e.target.value})}
            >
              {units.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Harga / Unit</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={editingItem.cost_per_unit}
              onChange={e => setEditingItem({...editingItem, cost_per_unit: parseFloat(e.target.value)})}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Update</button>
            <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Harga / Unit</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Saat Ini</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris. Klik "Tambah Item" untuk memulai.</td>
              </tr>
            ) : (
              inventory.map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">{formatCurrency(item.cost_per_unit || 0)}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.quantity < 10 ? 'bg-rose-50 text-rose-700' : 'bg-cafe-cream text-cafe-espresso'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      {userRole !== 'Admin' && (
                        <>
                          <button 
                            onClick={() => handleAdjustStock(item.id, item.quantity, 'add')}
                            className="p-2 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                            title="Tambah Stok"
                          >
                            <Plus size={16} />
                          </button>
                          <button 
                            onClick={() => handleAdjustStock(item.id, item.quantity, 'sub')}
                            className="p-2 rounded-lg border border-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                            title="Kurang Stok"
                          >
                            <Minus size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-2 rounded-lg border border-cafe-ink/10 text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalView({ journal, COA, onUpdate }: { journal: JournalEntry[], COA: COA[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    account: '',
    debit: 0,
    credit: 0,
    category: 'Expense' as any,
    payment_method: 'Kas' as any
  });

  const handleAccountChange = (accountName: string) => {
    const selectedCOA = COA.find(c => c.name === accountName);
    setNewEntry({
      ...newEntry,
      account: accountName,
      category: selectedCOA ? selectedCOA.category : newEntry.category
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    
    if (res.ok) {
      setShowAdd(false);
      onUpdate();
    } else {
      const error = await res.json();
      alert('Gagal menambah entri: ' + (error.error || 'Unknown error'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus entri ini?')) return;
    await fetch(`/api/journal/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Entri Baru
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8"
          onSubmit={handleAdd}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal</label>
            <input 
              type="date"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newEntry.date}
              onChange={e => setNewEntry({...newEntry, date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Keterangan</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newEntry.description}
              onChange={e => setNewEntry({...newEntry, description: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Akun (COA)</label>
            <select 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newEntry.account}
              onChange={e => handleAccountChange(e.target.value)}
            >
              <option value="">Pilih Akun</option>
              {COA.map(c => (
                <option key={c.id} value={c.name}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kategori</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newEntry.category}
              onChange={e => setNewEntry({...newEntry, category: e.target.value as any})}
            >
              <option value="Income">Pendapatan</option>
              <option value="Expense">Beban / Pengeluaran</option>
              <option value="Asset">Aset</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Debit (Keluar)</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newEntry.debit}
              onChange={e => setNewEntry({...newEntry, debit: parseFloat(e.target.value), credit: 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kredit (Masuk)</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newEntry.credit}
              onChange={e => setNewEntry({...newEntry, credit: parseFloat(e.target.value), debit: 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Metode Pembayaran</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newEntry.payment_method}
              onChange={e => setNewEntry({...newEntry, payment_method: e.target.value as any})}
            >
              <option value="Kas">Kas</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Simpan</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Tanggal</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Keterangan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Metode</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Debit</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Kredit</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {journal.map(entry => (
              <tr key={entry.id} className="hover:bg-cafe-cream/20 transition-colors">
                <td className="p-6 text-xs font-mono opacity-60">{entry.date}</td>
                <td className="p-6 text-sm">
                  <span className="font-medium text-cafe-ink">{entry.description}</span>
                  <p className="text-[10px] opacity-40 uppercase tracking-tighter font-bold mt-1">{entry.category}</p>
                </td>
                <td className="p-6 text-xs font-mono">
                  <span className={`px-2 py-1 rounded-md ${entry.payment_method === 'Bank' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                    {entry.payment_method || 'Kas'}
                  </span>
                </td>
                <td className="p-6 text-sm text-right font-mono text-rose-600 font-bold">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                </td>
                <td className="p-6 text-sm text-right font-mono text-emerald-600 font-bold">
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                </td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function COAView({ COA, onUpdate }: { COA: COA[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCOA, setNewCOA] = useState({ code: '', name: '', category: 'Expense' as any });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/COA', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCOA)
    });
    if (res.ok) {
      setShowAdd(false);
      setNewCOA({ code: '', name: '', category: 'Expense' });
      onUpdate();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus akun ini?')) return;
    await fetch(`/api/COA/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Tambah Akun
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6"
          onSubmit={handleAdd}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kode Akun</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newCOA.code}
              onChange={e => setNewCOA({...newCOA, code: e.target.value})}
              placeholder="Contoh: 101"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Akun</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newCOA.name}
              onChange={e => setNewCOA({...newCOA, name: e.target.value})}
              placeholder="Contoh: Bank Mandiri"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kategori</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newCOA.category}
              onChange={e => setNewCOA({...newCOA, category: e.target.value as any})}
            >
              <option value="Asset">Aset</option>
              <option value="Income">Pendapatan</option>
              <option value="Expense">Beban / Pengeluaran</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Simpan</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Kode</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Nama Akun</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Kategori</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {COA.map(item => (
              <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                <td className="p-6 text-sm font-mono font-bold text-cafe-espresso">{item.code}</td>
                <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                <td className="p-6 text-xs">
                  <span className={`px-2 py-1 rounded-md font-bold uppercase tracking-tighter ${
                    item.category === 'Income' ? 'bg-emerald-50 text-emerald-700' : 
                    item.category === 'Expense' ? 'bg-rose-50 text-rose-700' : 
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {item.category}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsView({ profitLoss, journal }: { profitLoss: ProfitLoss, journal: JournalEntry[] }) {
  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-bold bg-cafe-cream px-4 py-2 rounded-full">Periode: {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</div>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-cafe-ink/5 p-16 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-cafe-espresso"></div>
        
        <div className="text-center mb-16">
          <div className="w-20 h-px bg-cafe-espresso/20 mx-auto mt-6"></div>
        </div>

        <div className="space-y-12">
          <section>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-black text-cafe-latte border-b border-cafe-ink/5 pb-4 mb-6">Pendapatan</h4>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium">Total Penjualan</span>
              <span className="font-mono text-sm font-bold">{formatCurrency(profitLoss.income)}</span>
            </div>
            <div className="flex justify-between items-center py-4 font-black border-t border-cafe-ink/10 mt-4 text-cafe-espresso">
              <span className="text-sm">Total Pendapatan Bersih</span>
              <span className="font-mono text-lg underline decoration-double underline-offset-4">{formatCurrency(profitLoss.income)}</span>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-black text-cafe-latte border-b border-cafe-ink/5 pb-4 mb-6">Beban & Pengeluaran</h4>
            <div className="space-y-3">
              {journal.filter(e => e.category === 'Expense').map(e => (
                <div key={e.id} className="flex justify-between items-center py-2 group">
                  <span className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">{e.description}</span>
                  <span className="font-mono text-xs font-bold">{formatCurrency(e.debit)}</span>
                </div>
              ))}
              {journal.filter(e => e.category === 'Expense').length === 0 && (
                <p className="text-center py-4 text-xs opacity-30 italic">Belum ada catatan beban.</p>
              )}
            </div>
            <div className="flex justify-between items-center py-4 font-black border-t border-cafe-ink/10 mt-6 text-rose-700">
              <span className="text-sm">Total Beban Operasional</span>
              <span className="font-mono text-sm">({formatCurrency(profitLoss.expenses)})</span>
            </div>
          </section>

          <section className="pt-10 border-t-4 border-cafe-espresso/10">
            <div className="flex justify-between items-center bg-cafe-cream/30 p-8 rounded-2xl">
              <span className="text-xl font-serif italic text-cafe-espresso font-bold">Laba (Rugi) Bersih</span>
              <span className={`text-2xl font-mono font-black ${profitLoss.income - profitLoss.expenses >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(profitLoss.income - profitLoss.expenses)}
              </span>
            </div>
          </section>
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-20 font-bold">Generated by RestoManager Artisan System</p>
        </div>
      </div>
    </div>
  );
}

function AssetsView({ assets, onUpdate, calculateDepreciation }: { 
  assets: Asset[], 
  onUpdate: () => void,
  calculateDepreciation: (a: Asset) => number
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Machinery' as any,
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    lifespan_years: 8
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset)
    });
    setShowAdd(false);
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus aset ini?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Aset Baru
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8"
          onSubmit={handleAdd}
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Aset</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newAsset.name}
              onChange={e => setNewAsset({...newAsset, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tipe Aset</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newAsset.type}
              onChange={e => {
                const type = e.target.value as any;
                setNewAsset({...newAsset, type, lifespan_years: type === 'Machinery' ? 8 : 4});
              }}
            >
              <option value="Machinery">Mesin (8 Thn)</option>
              <option value="Office Equipment">Peralatan Kantor (4 Thn)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal Beli</label>
            <input 
              type="date"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newAsset.purchase_date}
              onChange={e => setNewAsset({...newAsset, purchase_date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Harga Perolehan</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newAsset.purchase_price}
              onChange={e => setNewAsset({...newAsset, purchase_price: parseFloat(e.target.value)})}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Simpan</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Aset</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Tipe / Umur</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Harga Beli</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Penyusutan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Nilai Buku</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {assets.map(asset => {
              const depreciation = calculateDepreciation(asset);
              return (
                <tr key={asset.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">
                    {asset.name}
                    <p className="text-[10px] opacity-40 uppercase tracking-tighter font-bold mt-1">Beli: {asset.purchase_date}</p>
                  </td>
                  <td className="p-6 text-xs">
                    <span className="opacity-60 font-bold text-cafe-latte">{asset.type}</span>
                    <p className="font-mono mt-1">{asset.lifespan_years} Tahun</p>
                  </td>
                  <td className="p-6 text-sm text-right font-mono">{formatCurrency(asset.purchase_price)}</td>
                  <td className="p-6 text-sm text-right font-mono text-rose-600 font-bold">({formatCurrency(depreciation)})</td>
                  <td className="p-6 text-sm text-right font-mono font-black text-cafe-espresso">
                    {formatCurrency(asset.purchase_price - depreciation)}
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseView({ inventory, purchases, onUpdate }: { inventory: InventoryItem[], purchases: Purchase[], onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    inventory_id: '',
    quantity: 0,
    total_cost: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Pembelian Stok'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/transactions/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Terjadi kesalahan saat mencatat pembelian');
      }
      
      alert('Pembelian berhasil dicatat!');
      onUpdate();
    } catch (error: any) {
      alert('Gagal mencatat pembelian: ' + error.message);
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!confirm('Hapus riwayat pembelian ini? Stok akan dikurangi kembali.')) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal menghapus: ' + error.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan saat menghapus.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-xl space-y-6 sticky top-8">
            <h3 className="text-lg font-bold text-cafe-espresso">Catat Pembelian Baru</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Pilih Item Stok</label>
                <select 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
                  value={formData.inventory_id}
                  onChange={e => setFormData({...formData, inventory_id: e.target.value})}
                >
                  <option value="">-- Pilih Item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal</label>
                <input 
                  type="date"
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  Jumlah (Quantity) {formData.inventory_id && `[${inventory.find(i => i.id === parseInt(formData.inventory_id))?.unit}]`}
                </label>
                <input 
                  type="number"
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Total Biaya (IDR)</label>
                <input 
                  type="number"
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.total_cost}
                  onChange={e => setFormData({...formData, total_cost: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Keterangan</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold shadow-lg shadow-cafe-espresso/20 hover:scale-[1.02] transition-transform">
              Catat Pembelian
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-cafe-ink/5 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-cafe-ink/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-cafe-espresso">Riwayat Pembelian</h3>
              <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{purchases.length} Transaksi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cafe-cream/10 border-b border-cafe-ink/5">
                    <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal</th>
                    <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold">Item</th>
                    <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold text-right">Jumlah</th>
                    <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold text-right">Total Biaya</th>
                    <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cafe-ink/5">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm opacity-30 italic">Belum ada riwayat pembelian</td>
                    </tr>
                  ) : (
                    purchases.map(p => (
                      <tr key={p.id} className="hover:bg-cafe-cream/5 transition-colors">
                        <td className="p-4 text-xs font-mono">{p.date}</td>
                        <td className="p-4">
                          <div className="text-xs font-bold text-cafe-espresso">{p.inventory_name}</div>
                          <div className="text-[10px] opacity-50">{p.description}</div>
                        </td>
                        <td className="p-4 text-xs text-right font-mono">{p.quantity}</td>
                        <td className="p-4 text-xs text-right font-bold text-cafe-espresso">{formatCurrency(p.total_cost)}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDeletePurchase(p.id)}
                            className="p-2 text-cafe-latte hover:text-red-500 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaleView({ menus, onUpdate }: { menus: Menu[], onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    amount: 0,
    items_sold: 1,
    date: new Date().toISOString().split('T')[0],
    description: 'Penjualan Harian',
    menu_id: '',
    payment_method: 'Kas'
  });
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/transactions/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      alert('Penjualan berhasil dicatat!');
      onUpdate();
    } else {
      const error = await res.json();
      alert('Gagal mencatat penjualan: ' + (error.error || 'Unknown error'));
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/transactions/sale/template', '_blank');
  };

  const handleExport = () => {
    window.open('/api/transactions/sale/export', '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/transactions/sale/import', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Berhasil mengimpor ${result.imported} data penjualan!`);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal mengimpor data: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan saat mengimpor data.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Excel Tools */}
      <div className="bg-white border border-cafe-ink/5 p-6 rounded-3xl shadow-sm flex flex-wrap gap-4 justify-center">
        <button 
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-cafe-cream text-cafe-espresso rounded-xl text-xs font-bold hover:bg-cafe-espresso hover:text-cafe-paper transition-all"
        >
          <FileDown size={16} /> Template Excel
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-cafe-cream text-cafe-espresso rounded-xl text-xs font-bold hover:bg-cafe-espresso hover:text-cafe-paper transition-all disabled:opacity-50"
        >
          <FileUp size={16} /> {importing ? 'Mengimpor...' : 'Import Excel'}
        </button>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-cafe-cream text-cafe-espresso rounded-xl text-xs font-bold hover:bg-cafe-espresso hover:text-cafe-paper transition-all"
        >
          <Download size={16} /> Ekspor Excel
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls" 
          onChange={handleImport}
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-cafe-ink/5 p-10 rounded-3xl shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal</label>
            <input 
              type="date"
              required
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Pilih Menu (Opsional)</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={formData.menu_id}
              onChange={e => {
                const menuId = e.target.value;
                const menu = Array.isArray(menus) ? menus.find(m => m.id.toString() === menuId) : null;
                setFormData({
                  ...formData, 
                  menu_id: menuId,
                  description: menu ? `Penjualan ${menu.name}` : 'Penjualan Harian',
                  amount: menu ? (menu.price * formData.items_sold) : formData.amount
                });
              }}
            >
              <option value="">-- Pilih Menu --</option>
              {Array.isArray(menus) && menus.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.name}</option>
              ))}
            </select>
            {formData.menu_id && (
              <div className="flex gap-2 mt-2">
                {(() => {
                  const menu = Array.isArray(menus) ? menus.find(m => m.id.toString() === formData.menu_id) : null;
                  if (menu && menu.hpp) {
                    return (
                      <>
                        <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">HPP: {formatCurrency(menu.hpp * formData.items_sold)}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${menu.profit && menu.profit > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                          Laba: {formatCurrency((menu.profit || 0) * formData.items_sold)}
                        </span>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Total Penjualan (IDR)</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Jumlah Terjual (Cup/Unit)</label>
            <input 
              type="number"
              required
              min="1"
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={formData.items_sold}
              onChange={e => {
                const qty = parseFloat(e.target.value);
                const menu = Array.isArray(menus) ? menus.find(m => m.id.toString() === formData.menu_id) : null;
                setFormData({
                  ...formData, 
                  items_sold: qty,
                  amount: menu ? (menu.price * qty) : formData.amount
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Metode Pembayaran</label>
            <select 
              required
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={formData.payment_method}
              onChange={e => setFormData({...formData, payment_method: e.target.value})}
            >
              <option value="Kas">Kas</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Keterangan</label>
          <input 
            required
            className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <button type="submit" className="w-full bg-emerald-700 text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-700/20 hover:scale-[1.02] transition-transform">
          Catat Penjualan
        </button>
      </form>
    </div>
  );
}

function MenuView({ inventory, menus, onUpdate, userRole }: { inventory: InventoryItem[], menus: Menu[], onUpdate: () => void, userRole: UserRole }) {
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [ingredients, setIngredients] = useState<MenuIngredient[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState<number>(0);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [newIngredient, setNewIngredient] = useState({ inventory_id: '', quantity: 0 });

  const fetchIngredients = async (menuId: number) => {
    const res = await fetch(`/api/menus/${menuId}/ingredients`);
    const data = await res.json();
    setIngredients(data);
  };

  useEffect(() => {
    if (selectedMenu) {
      fetchIngredients(selectedMenu.id);
    } else {
      setIngredients([]);
    }
  }, [selectedMenu]);

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMenuName, price: newMenuPrice })
    });
    if (res.ok) {
      setNewMenuName('');
      setNewMenuPrice(0);
      setShowAddMenu(false);
      onUpdate();
    }
  };

  const handleUpdateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) return;
    try {
      const res = await fetch(`/api/menus/${editingMenu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingMenu.name, price: editingMenu.price })
      });
      if (res.ok) {
        const updatedMenu = await res.json();
        setEditingMenu(null);
        onUpdate();
        // Update selectedMenu if it's the one being edited
        if (selectedMenu?.id === updatedMenu.id) {
          setSelectedMenu(updatedMenu);
        }
      } else {
        const error = await res.json();
        alert('Gagal memperbarui menu: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi saat memperbarui menu.');
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm('Hapus menu ini beserta semua takarannya?')) return;
    await fetch(`/api/menus/${id}`, { method: 'DELETE' });
    if (selectedMenu?.id === id) setSelectedMenu(null);
    onUpdate();
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu) return;
    await fetch('/api/menu-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newIngredient, menu_id: selectedMenu.id })
    });
    setNewIngredient({ inventory_id: '', quantity: 0 });
    fetchIngredients(selectedMenu.id);
  };

  const handleDeleteIngredient = async (id: number) => {
    await fetch(`/api/menu-ingredients/${id}`, { method: 'DELETE' });
    if (selectedMenu) fetchIngredients(selectedMenu.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Daftar Menu & Takaran</h3>
        {userRole === 'Manager' && (
          <button 
            onClick={() => setShowAddMenu(true)}
            className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Menu Baru
          </button>
        )}
      </div>

      {showAddMenu && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-4 items-end"
          onSubmit={handleAddMenu}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Menu</label>
              <input 
                required
                className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                placeholder="Misal: Kopi Susu Gula Aren"
                value={newMenuName}
                onChange={e => setNewMenuName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Harga Jual (Rp)</label>
              <input 
                type="number"
                required
                className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                placeholder="0"
                value={newMenuPrice ?? 0}
                onChange={e => setNewMenuPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <button type="submit" className="bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-bold">Simpan</button>
          <button type="button" onClick={() => setShowAddMenu(false)} className="px-6 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold">Batal</button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu List */}
        <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm h-fit">
          <div className="p-4 bg-cafe-cream/10 border-b border-cafe-ink/5">
            <h4 className="text-[11px] uppercase tracking-widest opacity-50 font-bold">Pilih Menu</h4>
          </div>
          <div className="divide-y divide-cafe-ink/5">
            {Array.isArray(menus) && menus.map(menu => (
              <div 
                key={menu.id} 
                className={`p-4 flex flex-col gap-2 cursor-pointer transition-colors ${selectedMenu?.id === menu.id ? 'bg-cafe-espresso/5 border-l-4 border-cafe-espresso' : 'hover:bg-cafe-cream/20'}`}
                onClick={() => setSelectedMenu(menu)}
              >
                {editingMenu?.id === menu.id ? (
                  <form onSubmit={handleUpdateMenu} className="space-y-3" onClick={e => e.stopPropagation()}>
                    <input 
                      autoFocus
                      className="w-full border-b border-cafe-espresso py-1 text-sm focus:outline-none"
                      value={editingMenu.name || ''}
                      onChange={e => setEditingMenu({...editingMenu, name: e.target.value})}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold opacity-40">Rp</span>
                      <input 
                        type="number"
                        className="flex-1 border-b border-cafe-espresso py-1 text-sm font-mono focus:outline-none"
                        value={editingMenu.price ?? 0}
                        onChange={e => setEditingMenu({...editingMenu, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingMenu(null)} className="p-1 text-cafe-latte hover:text-cafe-espresso">
                        <X size={16} />
                      </button>
                      <button type="submit" className="p-1 text-emerald-500 hover:text-emerald-700">
                        <Save size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">{menu.name}</span>
                      {userRole === 'Manager' && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingMenu(menu); }}
                            className="p-2 text-cafe-latte hover:text-cafe-espresso transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id); }}
                            className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-cafe-latte">{formatCurrency(menu.price || 0)}</span>
                      {menu.hpp !== undefined && menu.hpp > 0 && (
                        <div className="flex gap-2 text-[9px] font-mono opacity-60">
                          <span>HPP: {formatCurrency(menu.hpp)}</span>
                          <span className={menu.profit && menu.profit > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            Laba: {formatCurrency(menu.profit || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!Array.isArray(menus) || menus.length === 0) && (
              <p className="p-8 text-center text-xs opacity-40 italic">Belum ada menu.</p>
            )}
          </div>
        </div>

        {/* Ingredients / Takaran */}
        <div className="lg:col-span-2 space-y-6">
          {selectedMenu ? (
            <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b border-cafe-ink/5 pb-4">
                <div>
                  <h4 className="text-2xl font-serif italic text-cafe-espresso">{selectedMenu.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-cafe-espresso bg-cafe-cream px-2 py-0.5 rounded-full">Jual: {formatCurrency(selectedMenu.price || 0)}</span>
                    {selectedMenu.hpp !== undefined && selectedMenu.hpp > 0 && (
                      <>
                        <span className="text-xs font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">HPP: {formatCurrency(selectedMenu.hpp)}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${selectedMenu.profit && selectedMenu.profit > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                          Laba: {formatCurrency(selectedMenu.profit || 0)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-cafe-cream rounded-2xl">
                  <Calculator size={24} className="text-cafe-espresso" />
                </div>
              </div>

              {userRole === 'Manager' && (
                <form onSubmit={handleAddIngredient} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Bahan Baku</label>
                    <select 
                      required
                      className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
                      value={newIngredient.inventory_id}
                      onChange={e => setNewIngredient({...newIngredient, inventory_id: e.target.value})}
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                      Takaran {newIngredient.inventory_id && `[${inventory.find(i => i.id === parseInt(newIngredient.inventory_id))?.unit}]`}
                    </label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                      value={newIngredient.quantity || ''}
                      onChange={e => setNewIngredient({...newIngredient, quantity: parseFloat(e.target.value)})}
                    />
                  </div>
                  <button type="submit" className="bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold hover:shadow-md transition-all">
                    Tambah Takaran
                  </button>
                </form>
              )}

              <div className="space-y-4">
                <h5 className="text-[10px] uppercase tracking-widest opacity-50 font-bold border-b border-cafe-ink/5 pb-2">Daftar Bahan & Takaran</h5>
                <div className="divide-y divide-cafe-ink/5">
                  {Array.isArray(ingredients) && ingredients.map(ing => (
                    <div key={ing.id} className="py-4 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-cafe-cream/30 flex items-center justify-center text-cafe-espresso font-bold text-xs">
                          {ing.inventory_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cafe-ink">{ing.inventory_name || 'Item Terhapus'}</p>
                          <p className="text-[10px] text-cafe-latte font-bold uppercase tracking-tighter">
                            {ing.quantity} {ing.inventory_unit} per porsi
                          </p>
                        </div>
                      </div>
                      {userRole === 'Manager' && (
                        <button 
                          onClick={() => handleDeleteIngredient(ing.id)}
                          className="p-2 text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!Array.isArray(ingredients) || ingredients.length === 0) && (
                    <p className="py-10 text-center text-sm opacity-30 italic">Belum ada takaran untuk menu ini.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-white border border-cafe-ink/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-cafe-cream/30 rounded-full flex items-center justify-center mb-6">
                <Coffee size={40} className="text-cafe-espresso/40" />
              </div>
              <h4 className="text-lg font-serif italic text-cafe-espresso opacity-60">Pilih Menu untuk Melihat Takaran</h4>
              <p className="text-xs text-cafe-ink/40 max-w-xs mt-2">Pilih salah satu menu di sebelah kiri untuk mengelola bahan baku dan takaran yang digunakan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ inventory, units, onUpdateUnits, userRole, setUserRole, lowStockThreshold, setLowStockThreshold }: { inventory: InventoryItem[], units: Unit[], onUpdateUnits: () => void, userRole: UserRole, setUserRole: (role: UserRole) => void, lowStockThreshold: number, setLowStockThreshold: (val: number) => void }) {
  const [newUnit, setNewUnit] = useState('');

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUnit = newUnit.trim();
    if (!trimmedUnit) return;
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedUnit })
    });
    if (res.ok) {
      setNewUnit('');
      onUpdateUnits();
    } else {
      const data = await res.json();
      alert(data.error || 'Gagal menambah satuan');
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm('Hapus satuan ini?')) return;
    await fetch(`/api/units/${id}`, { method: 'DELETE' });
    onUpdateUnits();
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Role Settings */}
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="text-cafe-espresso" size={20} />
            <h4 className="text-lg font-bold text-cafe-espresso">Pengaturan Role</h4>
          </div>
          <p className="text-xs text-cafe-ink/60 leading-relaxed">
            Pilih role Anda untuk menyesuaikan akses fitur dan izin dalam aplikasi.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['Manager', 'Admin', 'Inventory', 'Finance'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setUserRole(role)}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                  userRole === role
                    ? 'bg-cafe-espresso text-cafe-paper border-cafe-espresso shadow-md'
                    : 'bg-white text-cafe-ink/60 border-cafe-ink/10 hover:border-cafe-espresso/30'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Low Stock Settings */}
        {userRole === 'Inventory' || userRole === 'Manager' ? (
          <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="text-cafe-espresso" size={20} />
              <h4 className="text-lg font-bold text-cafe-espresso">Pengingat Stok Menipis</h4>
            </div>
            <p className="text-xs text-cafe-ink/60 leading-relaxed">
              Atur ambang batas stok minimum untuk memicu peringatan "Stok Menipis" di dashboard.
            </p>
            <div className="flex items-center gap-4">
              <input 
                type="number"
                className="w-24 border-b border-cafe-ink/10 py-2 text-sm font-mono focus:border-cafe-espresso focus:outline-none transition-colors"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(parseInt(e.target.value) || 0)}
              />
              <span className="text-xs font-medium text-cafe-ink/40">Unit / Satuan</span>
            </div>
          </div>
        ) : null}

        {/* Unit Settings */}
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Package className="text-cafe-espresso" size={20} />
              <h4 className="text-lg font-bold text-cafe-espresso">Manajemen Satuan</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-cafe-espresso/10 text-cafe-espresso px-2 py-1 rounded-full uppercase tracking-wider">
                {units.length} Satuan
              </span>
              <button 
                onClick={onUpdateUnits}
                className="p-2 hover:bg-cafe-espresso/5 rounded-full transition-all text-cafe-espresso"
                title="Sinkronisasi Data"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-cafe-ink/60 leading-relaxed">
            Tambah atau hapus jenis satuan yang digunakan dalam inventaris (misal: BOX, LITER, DLL).
          </p>

          <form onSubmit={handleAddUnit} className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Satuan Baru</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  required
                  className="flex-1 border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors uppercase"
                  placeholder="Misal: BOX"
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                />
                <button type="submit" className="bg-cafe-espresso text-cafe-paper px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md transition-all">
                  Tambah
                </button>
              </div>
            </div>
          </form>

          <div className="pt-6 space-y-3">
            <h5 className="text-[10px] uppercase tracking-widest opacity-50 font-bold border-b border-cafe-ink/5 pb-2">Daftar Satuan Aktif</h5>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {units.length === 0 ? (
                <div className="col-span-2 text-center py-10 bg-cafe-cream/5 rounded-2xl border border-dashed border-cafe-ink/10">
                  <p className="text-xs opacity-30 italic">Belum ada satuan yang terdaftar.</p>
                  <button 
                    onClick={onUpdateUnits}
                    className="mt-2 text-[10px] text-cafe-espresso font-bold hover:underline"
                  >
                    Klik untuk Refresh
                  </button>
                </div>
              ) : (
                units.map(unit => (
                  <div key={unit.id} className="flex justify-between items-center p-3 bg-cafe-cream/10 rounded-xl border border-cafe-ink/5 hover:border-cafe-espresso/20 transition-all">
                    <span className="text-xs font-bold text-cafe-espresso">{unit.name}</span>
                    <button 
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus Satuan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorksheetView({ journal }: { journal: JournalEntry[] }) {
  const [worksheet, setWorksheet] = useState<{
    kas: { inflow: number, outflow: number, balance: number },
    bank: { inflow: number, outflow: number, balance: number },
    total: { inflow: number, outflow: number, balance: number }
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorksheet();
  }, [journal]);

  const fetchWorksheet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/worksheet');
      const data = await res.json();
      setWorksheet(data);
    } catch (error) {
      console.error('Error fetching worksheet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !worksheet) {
    return <div className="p-10 text-center opacity-40 italic font-serif">Memuat data worksheet...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.15em] text-orange-600 font-bold mb-4">Saldo Kas</p>
          <h3 className="text-3xl font-mono text-cafe-ink">{formatCurrency(worksheet.kas.balance)}</h3>
          <div className="mt-4 flex justify-between text-[10px] opacity-50 font-bold uppercase tracking-widest">
            <span>Masuk: {formatCurrency(worksheet.kas.inflow)}</span>
            <span>Keluar: {formatCurrency(worksheet.kas.outflow)}</span>
          </div>
        </div>
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.15em] text-blue-600 font-bold mb-4">Saldo Bank</p>
          <h3 className="text-3xl font-mono text-cafe-ink">{formatCurrency(worksheet.bank.balance)}</h3>
          <div className="mt-4 flex justify-between text-[10px] opacity-50 font-bold uppercase tracking-widest">
            <span>Masuk: {formatCurrency(worksheet.bank.inflow)}</span>
            <span>Keluar: {formatCurrency(worksheet.bank.outflow)}</span>
          </div>
        </div>
        <div className="bg-cafe-espresso text-cafe-paper p-8 rounded-2xl shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.15em] text-cafe-paper/50 font-bold mb-4">Total Saldo</p>
          <h3 className="text-3xl font-mono">{formatCurrency(worksheet.total.balance)}</h3>
          <div className="mt-4 flex justify-between text-[10px] opacity-50 font-bold uppercase tracking-widest">
            <span>Masuk: {formatCurrency(worksheet.total.inflow)}</span>
            <span>Keluar: {formatCurrency(worksheet.total.outflow)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-cafe-ink/5 bg-cafe-cream/10">
          <h4 className="font-serif italic text-lg text-cafe-espresso">Rekapitulasi Jurnal</h4>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/5">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Akun / Metode</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Total Masuk (Kredit)</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Total Keluar (Debit)</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Saldo Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            <tr className="hover:bg-cafe-cream/10 transition-colors">
              <td className="p-6 text-sm font-bold text-orange-700">KAS (Tunai)</td>
              <td className="p-6 text-sm text-right font-mono text-emerald-600">{formatCurrency(worksheet.kas.inflow)}</td>
              <td className="p-6 text-sm text-right font-mono text-rose-600">{formatCurrency(worksheet.kas.outflow)}</td>
              <td className="p-6 text-sm text-right font-mono font-bold">{formatCurrency(worksheet.kas.balance)}</td>
            </tr>
            <tr className="hover:bg-cafe-cream/10 transition-colors">
              <td className="p-6 text-sm font-bold text-blue-700">BANK (Transfer)</td>
              <td className="p-6 text-sm text-right font-mono text-emerald-600">{formatCurrency(worksheet.bank.inflow)}</td>
              <td className="p-6 text-sm text-right font-mono text-rose-600">{formatCurrency(worksheet.bank.outflow)}</td>
              <td className="p-6 text-sm text-right font-mono font-bold">{formatCurrency(worksheet.bank.balance)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-cafe-espresso text-cafe-paper font-bold">
              <td className="p-6 text-sm uppercase tracking-widest">TOTAL</td>
              <td className="p-6 text-sm text-right font-mono">{formatCurrency(worksheet.total.inflow)}</td>
              <td className="p-6 text-sm text-right font-mono">{formatCurrency(worksheet.total.outflow)}</td>
              <td className="p-6 text-sm text-right font-mono text-lg">{formatCurrency(worksheet.total.balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}

function StockOpnameView({ stockOpnames, inventory, units, onUpdate, userRole }: { stockOpnames: StockOpname[], inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [countingData, setCountingData] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [countingDate, setCountingDate] = useState('');
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const startCounting = () => {
    if (selectedItems.length === 0) {
      alert('Pilih minimal satu produk untuk dilakukan stock opname.');
      return;
    }
    const refNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const now = new Date().toLocaleString('sv-SE'); // YYYY-MM-DD HH:mm:ss
    
    setReferenceNo(refNo);
    setCountingDate(now);
    
    const initialData: Record<number, number> = {};
    selectedItems.forEach(id => {
      initialData[id] = 0;
    });
    setCountingData(initialData);
    setIsCounting(true);
    setIsCreating(false);
  };

  const handleFinishCounting = async () => {
    if (Object.keys(countingData).length === 0) {
      alert('Data perhitungan kosong.');
      return;
    }

    const opnameItems = selectedItems.map(id => {
      const item = inventory.find(inv => inv.id === id);
      return {
        inventory_id: id,
        inventory_name: item?.name || 'Unknown',
        system_quantity: item?.quantity || 0,
        actual_quantity: countingData[id] || 0,
        difference: (countingData[id] || 0) - (item?.quantity || 0)
      };
    });

    const payload = {
      reference_no: referenceNo,
      date: countingDate.split(' ')[0],
      type: 'Penyesuaian',
      status: 'Menunggu Accept PIC',
      description: notes || `Stock Opname untuk ${selectedItems.length} item`,
      items: opnameItems
    };

    try {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Reset states and go back to history
        setIsCounting(false);
        setIsCreating(false);
        setSelectedItems([]);
        setCountingData({});
        setNotes('');
        onUpdate();
      } else {
        const err = await res.json();
        alert('Gagal menyimpan stock opname: ' + (err.error || 'Terjadi kesalahan server'));
      }
    } catch (error) {
      console.error('Error saving stock opname:', error);
      alert('Terjadi kesalahan koneksi saat menyimpan data.');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'Accept') => {
    try {
      const res = await fetch(`/api/stock-opname/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus riwayat opname ini?')) return;
    try {
      const res = await fetch(`/api/stock-opname/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate();
      } else {
        const err = await res.json();
        alert('Gagal menghapus riwayat opname: ' + (err.error || 'Terjadi kesalahan server'));
      }
    } catch (error) {
      console.error('Error deleting stock opname:', error);
      alert('Terjadi kesalahan koneksi saat menghapus data.');
    }
  };

  if (isCounting) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCounting(false)}
              className="text-cafe-espresso hover:opacity-70 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-2xl font-bold text-cafe-espresso">Proses perhitungan</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleFinishCounting}
              className="px-8 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Selesai
            </button>
          </div>
        </div>

        <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">REFERENCE</p>
              <p className="font-mono text-sm">{referenceNo}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">TANGGAL</p>
              <p className="font-mono text-sm">{countingDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">TIPE</p>
              <p className="text-sm">Product</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">NOTES</p>
              <p className="text-sm opacity-60">{notes || '-'}</p>
            </div>
            <div className="md:col-span-1">
              <div className="bg-cafe-cream/10 p-4 rounded-xl border border-cafe-ink/5 space-y-3">
                <input 
                  type="text" 
                  placeholder="Letakkan kursor untuk Scan"
                  className="w-full bg-white border border-cafe-ink/10 rounded-lg px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="border border-cafe-ink/5 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cafe-cream/5 border-b border-cafe-ink/5">
                  <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold">Nama Produk</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold">Stock Sistem</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold text-center">Stok Gudang</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold">Ket</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cafe-ink/5">
                {selectedItems.map(id => {
                  const item = inventory.find(i => i.id === id);
                  if (!item) return null;
                  const systemStock = item.quantity;
                  const physicalStock = countingData[id] || 0;
                  const diff = physicalStock - systemStock;
                  
                  let ket = 'Sesuai';
                  let ketColor = 'text-cafe-ink';
                  if (diff > 0) {
                    ket = `Lebih ${diff}`;
                    ketColor = 'text-emerald-600';
                  } else if (diff < 0) {
                    ket = `Kurang ${Math.abs(diff)}`;
                    ketColor = 'text-rose-600';
                  }

                  return (
                    <tr key={id} className="hover:bg-cafe-cream/5 transition-colors">
                      <td className="p-4 text-sm font-medium">{item.name}</td>
                      <td className="p-4 text-sm font-mono">{systemStock}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setCountingData(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }))}
                            className="p-1 rounded border border-cafe-ink/10 hover:bg-cafe-cream/10"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number"
                            className="w-16 text-center border border-cafe-ink/10 rounded py-1 text-sm font-mono focus:outline-none focus:border-emerald-500"
                            value={physicalStock}
                            onChange={(e) => setCountingData(prev => ({ ...prev, [id]: parseFloat(e.target.value) || 0 }))}
                          />
                          <button 
                            onClick={() => setCountingData(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))}
                            className="p-1 rounded border border-cafe-ink/10 hover:bg-cafe-cream/10"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className={`p-4 text-sm font-bold ${ketColor}`}>{ket}</td>
                      <td className="p-4 text-sm font-mono"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isCreating) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsCreating(false)}
            className="flex items-center gap-2 text-cafe-espresso hover:opacity-70 transition-opacity font-medium"
          >
            <ChevronLeft size={20} /> Kembali
          </button>
          <h3 className="text-2xl font-serif italic text-cafe-espresso">Buat Stok Opname</h3>
          <button 
            onClick={startCounting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            Mulai Hitung
          </button>
        </div>

        <div className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Notes / Keterangan</label>
              <textarea 
                className="w-full border border-cafe-ink/10 rounded-xl p-4 text-sm focus:border-cafe-espresso focus:outline-none transition-colors min-h-[100px]"
                placeholder="Tambahkan catatan di sini..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Cari Produk</label>
              <div className="relative">
                <input 
                  type="text"
                  className="w-full border border-cafe-ink/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  placeholder="Cari berdasarkan nama SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <List className="absolute left-3 top-3.5 opacity-30" size={18} />
              </div>
            </div>
          </div>

          <div className="border border-cafe-ink/5 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cafe-cream/10 border-b border-cafe-ink/5">
                  <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Produk</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold text-right">Qty Stock</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest opacity-50 font-bold text-center">Checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cafe-ink/5">
                {filteredInventory.map(item => (
                  <tr key={item.id} className={`hover:bg-cafe-cream/5 transition-colors ${selectedItems.includes(item.id) ? 'bg-emerald-50/30' : ''}`}>
                    <td className="p-4 text-sm font-medium">{item.name}</td>
                    <td className="p-4 text-xs font-mono opacity-60">{item.unit}</td>
                    <td className="p-4 text-sm text-right font-mono font-bold">{item.quantity}</td>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded border-cafe-ink/20 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-serif italic text-cafe-espresso">Riwayat Stock Opname</h3>
          <p className="text-sm opacity-50 mt-1">Kelola penyesuaian stok manual</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Mulai
        </button>
      </div>

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/5">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">No Reference</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Tanggal</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Type Opname</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Status</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Keterangan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {stockOpnames.map(item => (
              <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                <td className="p-6 text-sm font-mono font-bold text-cafe-espresso">
                  <button 
                    onClick={() => setSelectedOpname(item)}
                    className="hover:underline text-left"
                  >
                    {item.reference_no}
                  </button>
                </td>
                <td className="p-6 text-sm text-cafe-ink">{item.date}</td>
                <td className="p-6">
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    item.type === 'Penambahan' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="p-6">
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    item.status === 'Accept' ? 'bg-blue-50 text-blue-700' : 
                    item.status === 'Menunggu Accept PIC' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-6 text-sm text-cafe-ink/70">{item.description}</td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3">
                    {userRole === 'Manager' && (item.status === 'Pending' || item.status === 'Menunggu Accept PIC') && (
                      <button 
                        onClick={() => handleUpdateStatus(item.id, 'Accept')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Accept"
                      >
                        <Save size={18} />
                      </button>
                    )}
                    {userRole !== 'Admin' && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {stockOpnames.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada riwayat stock opname.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedOpname && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cafe-espresso/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden"
            >
              <div className="p-8 border-b border-cafe-ink/5 flex justify-between items-center bg-cafe-cream/10">
                <div>
                  <h3 className="text-2xl font-serif italic text-cafe-espresso">Detail Stock Opname</h3>
                  <p className="text-sm opacity-50 mt-1">Ref: {selectedOpname.reference_no} | {selectedOpname.date}</p>
                </div>
                <button 
                  onClick={() => setSelectedOpname(null)}
                  className="p-2 hover:bg-cafe-ink/5 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-cafe-cream/5 p-4 rounded-xl border border-cafe-ink/5">
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mb-1">Status</p>
                    <p className="text-sm font-bold text-cafe-espresso">{selectedOpname.status}</p>
                  </div>
                  <div className="bg-cafe-cream/5 p-4 rounded-xl border border-cafe-ink/5">
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mb-1">Keterangan</p>
                    <p className="text-sm text-cafe-ink">{selectedOpname.description}</p>
                  </div>
                </div>

                <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-cafe-ink/5 bg-cafe-cream/5">
                        <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold">Produk</th>
                        <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Sistem</th>
                        <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aktual</th>
                        <th className="p-4 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cafe-ink/5">
                      {selectedOpname.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-cafe-cream/10 transition-colors">
                          <td className="p-4 text-sm font-bold text-cafe-espresso">{item.inventory_name}</td>
                          <td className="p-4 text-sm text-right font-mono text-cafe-ink/60">{item.system_quantity}</td>
                          <td className="p-4 text-sm text-right font-mono font-bold text-cafe-espresso">{item.actual_quantity}</td>
                          <td className={`p-4 text-sm text-right font-mono font-bold ${
                            item.difference > 0 ? 'text-emerald-600' : 
                            item.difference < 0 ? 'text-rose-600' : 
                            'text-cafe-ink/40'
                          }`}>
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                          </td>
                        </tr>
                      ))}
                      {(!selectedOpname.items || selectedOpname.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-sm opacity-40 italic font-serif">Data item tidak tersedia untuk record lama.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-8 bg-cafe-cream/5 border-t border-cafe-ink/5 flex justify-end">
                <button 
                  onClick={() => setSelectedOpname(null)}
                  className="px-8 py-3 bg-cafe-espresso text-cafe-paper rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
