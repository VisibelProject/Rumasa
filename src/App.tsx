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
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calculator,
  Trash2,
  ShoppingCart,
  Banknote,
  Settings,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, JournalEntry, Asset, ProfitLoss, Recipe, Unit, Menu, MenuIngredient } from './types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'journal' | 'reports' | 'assets' | 'purchase' | 'sale' | 'settings' | 'menu'>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss>({ income: 0, expenses: 0 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [egressStatus, setEgressStatus] = useState<{ usage: number, limit: number, percentage: number, warning: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, journalRes, assetRes, plRes, unitsRes, menusRes, egressRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/journal'),
        fetch('/api/assets'),
        fetch('/api/reports/profit-loss'),
        fetch('/api/units'),
        fetch('/api/menus'),
        fetch('/api/egress-status')
      ]);
      
      const invData = await invRes.json();
      const journalData = await journalRes.json();
      const assetData = await assetRes.json();
      const plData = await plRes.json();
      const unitsData = await unitsRes.json();
      const menusData = await menusRes.json();
      const egressData = await egressRes.json();

      setInventory(Array.isArray(invData) ? invData : []);
      setJournal(Array.isArray(journalData) ? journalData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setProfitLoss(plData && !plData.error ? plData : { income: 0, expenses: 0 });
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setMenus(Array.isArray(menusData) ? menusData : []);
      setEgressStatus(egressData && !egressData.error ? egressData : null);
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
      <aside className="w-72 border-r border-cafe-ink/10 flex flex-col bg-cafe-cream/30">
        <div className="pt-8 pb-2 px-8 border-b border-cafe-ink/10">
          <div className="flex flex-col items-center text-center">
            <img 
              src="https://lh3.googleusercontent.com/d/1bYm_VD5lfX4FT3NcK-1ijtR_P_eShjwM" 
              alt="RestoManager Logo" 
              className="w-36 h-36 mb-0 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'purchase', icon: ShoppingCart, label: 'Pembelian' },
            { id: 'sale', icon: Banknote, label: 'Penjualan' },
            { id: 'menu', icon: Coffee, label: 'Menu' },
            { id: 'inventory', icon: Package, label: 'Stock Opname' },
            { id: 'journal', icon: BookOpen, label: 'Jurnal Umum' },
            { id: 'reports', icon: BarChart3, label: 'Laba Rugi' },
            { id: 'assets', icon: HardDrive, label: 'Manajemen Aset' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                activeTab === item.id 
                  ? 'bg-cafe-espresso text-cafe-paper shadow-lg shadow-cafe-espresso/20' 
                  : 'text-cafe-ink/60 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
              }`}
            >
              <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-cafe-ink/10">
          <div className="flex items-center gap-3 opacity-40">
            <div className="w-2 h-2 rounded-full bg-cafe-latte animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-semibold">System Active</span>
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
                      {inventory.filter(i => i.quantity < 10).slice(0, 5).map(item => (
                        <div key={item.id} className="p-6 flex justify-between items-center hover:bg-cafe-cream/20 transition-colors">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="font-mono text-[11px] px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                      {inventory.filter(i => i.quantity < 10).length === 0 && (
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

            {activeTab === 'inventory' && (
              <InventoryView inventory={inventory} units={units} onUpdate={fetchData} />
            )}

            {activeTab === 'journal' && (
              <JournalView journal={journal} onUpdate={fetchData} />
            )}

            {activeTab === 'reports' && (
              <ReportsView profitLoss={profitLoss} journal={journal} />
            )}

            {activeTab === 'assets' && (
              <AssetsView assets={assets} onUpdate={fetchData} calculateDepreciation={calculateDepreciation} />
            )}

            {activeTab === 'purchase' && (
              <PurchaseView inventory={inventory} onUpdate={fetchData} />
            )}

            {activeTab === 'sale' && (
              <SaleView menus={menus} onUpdate={fetchData} />
            )}

            {activeTab === 'menu' && (
              <MenuView inventory={inventory} menus={menus} onUpdate={fetchData} />
            )}

            {activeTab === 'settings' && (
              <SettingsView inventory={inventory} units={units} onUpdateUnits={fetchData} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function InventoryView({ inventory, units, onUpdate }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: 0, cost_per_unit: 0 });

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

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus item ini?')) return;
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Tambah Item
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
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Saat Ini</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                <td className="p-6 text-sm text-right font-mono">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.quantity < 10 ? 'bg-rose-50 text-rose-700' : 'bg-cafe-cream text-cafe-espresso'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => handleUpdateStock(item.id, item.quantity + 1)}
                      className="p-2 rounded-lg border border-cafe-ink/10 hover:bg-cafe-espresso hover:text-cafe-paper transition-all"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => handleUpdateStock(item.id, Math.max(0, item.quantity - 1))}
                      className="p-2 rounded-lg border border-cafe-ink/10 hover:bg-cafe-espresso hover:text-cafe-paper transition-all"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalView({ journal, onUpdate }: { journal: JournalEntry[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    account: '',
    debit: 0,
    credit: 0,
    category: 'Expense' as any
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    setShowAdd(false);
    onUpdate();
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

function PurchaseView({ inventory, onUpdate }: { inventory: InventoryItem[], onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    inventory_id: '',
    quantity: 0,
    total_cost: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Pembelian Stok'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/transactions/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    alert('Pembelian berhasil dicatat!');
    onUpdate();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white border border-cafe-ink/5 p-10 rounded-3xl shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Pilih Item Stok</label>
            <select 
              required
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
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
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
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
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Total Biaya (IDR)</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-3 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={formData.total_cost}
              onChange={e => setFormData({...formData, total_cost: parseFloat(e.target.value)})}
            />
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
        <button type="submit" className="w-full bg-cafe-espresso text-cafe-paper py-4 rounded-2xl text-sm font-bold shadow-lg shadow-cafe-espresso/20 hover:scale-[1.02] transition-transform">
          Catat Pembelian
        </button>
      </form>
    </div>
  );
}

function SaleView({ menus, onUpdate }: { menus: Menu[], onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    amount: 0,
    items_sold: 1,
    date: new Date().toISOString().split('T')[0],
    description: 'Penjualan Harian',
    menu_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/transactions/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    alert('Penjualan berhasil dicatat!');
    onUpdate();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
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
                const menuName = Array.isArray(menus) ? menus.find(m => m.id.toString() === menuId)?.name : null;
                setFormData({
                  ...formData, 
                  menu_id: menuId,
                  description: menuName ? `Penjualan ${menuName}` : 'Penjualan Harian'
                });
              }}
            >
              <option value="">-- Tanpa Menu (Gunakan Takaran Global) --</option>
              {Array.isArray(menus) && menus.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.name}</option>
              ))}
            </select>
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
              onChange={e => setFormData({...formData, items_sold: parseFloat(e.target.value)})}
            />
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

function MenuView({ inventory, menus, onUpdate }: { inventory: InventoryItem[], menus: Menu[], onUpdate: () => void }) {
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [ingredients, setIngredients] = useState<MenuIngredient[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
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
      body: JSON.stringify({ name: newMenuName })
    });
    if (res.ok) {
      setNewMenuName('');
      setShowAddMenu(false);
      onUpdate();
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
        <button 
          onClick={() => setShowAddMenu(true)}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={18} /> Menu Baru
        </button>
      </div>

      {showAddMenu && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-4 items-end"
          onSubmit={handleAddMenu}
        >
          <div className="flex-1 space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Menu</label>
            <input 
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              placeholder="Misal: Kopi Susu Gula Aren"
              value={newMenuName}
              onChange={e => setNewMenuName(e.target.value)}
            />
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
                className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${selectedMenu?.id === menu.id ? 'bg-cafe-espresso/5 border-l-4 border-cafe-espresso' : 'hover:bg-cafe-cream/20'}`}
                onClick={() => setSelectedMenu(menu)}
              >
                <span className="text-sm font-medium">{menu.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id); }}
                  className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
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
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mt-1">Pengaturan Takaran Bahan Baku</p>
                </div>
                <div className="p-3 bg-cafe-cream rounded-2xl">
                  <Calculator size={24} className="text-cafe-espresso" />
                </div>
              </div>

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
                      <button 
                        onClick={() => handleDeleteIngredient(ing.id)}
                        className="p-2 text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
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

function SettingsView({ inventory, units, onUpdateUnits }: { inventory: InventoryItem[], units: Unit[], onUpdateUnits: () => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newRecipe, setNewRecipe] = useState({ inventory_id: '', quantity_per_unit: 0 });
  const [newUnit, setNewUnit] = useState('');

  const fetchRecipes = async () => {
    const res = await fetch('/api/recipes');
    const data = await res.json();
    setRecipes(data);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecipe)
    });
    setNewRecipe({ inventory_id: '', quantity_per_unit: 0 });
    fetchRecipes();
  };

  const handleDeleteRecipe = async (id: number) => {
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    fetchRecipes();
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit) return;
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUnit })
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recipe Settings */}
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="text-cafe-espresso" size={20} />
            <h4 className="text-lg font-bold text-cafe-espresso">Takaran Penjualan</h4>
          </div>
          <p className="text-xs text-cafe-ink/60 leading-relaxed">
            Atur berapa banyak stok yang berkurang untuk setiap 1 unit penjualan (misal: 1 cup kopi).
          </p>

          <form onSubmit={handleAddRecipe} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Item Stok</label>
                <select 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
                  value={newRecipe.inventory_id}
                  onChange={e => setNewRecipe({...newRecipe, inventory_id: e.target.value})}
                >
                  <option value="">-- Pilih --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  Takaran (per unit) {newRecipe.inventory_id && `[${inventory.find(i => i.id === parseInt(newRecipe.inventory_id))?.unit}]`}
                </label>
                <input 
                  type="number"
                  required
                  step="0.01"
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  placeholder="Misal: 20"
                  value={newRecipe.quantity_per_unit || ''}
                  onChange={e => setNewRecipe({...newRecipe, quantity_per_unit: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-xs font-bold hover:shadow-md transition-all">
              Tambah Takaran
            </button>
          </form>

          <div className="pt-6 space-y-3">
            <h5 className="text-[10px] uppercase tracking-widest opacity-50 font-bold border-b border-cafe-ink/5 pb-2">Daftar Takaran Aktif</h5>
            {recipes.length === 0 ? (
              <p className="text-xs italic text-cafe-ink/40 py-4 text-center">Belum ada takaran yang diatur.</p>
            ) : (
              <div className="divide-y divide-cafe-ink/5">
                {recipes.map(recipe => (
                  <div key={recipe.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-cafe-ink">{recipe.inventory_name}</p>
                      <p className="text-[10px] text-cafe-latte font-bold uppercase tracking-tighter">
                        1 Unit Jual = {recipe.quantity_per_unit} {recipe.inventory_unit}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unit Settings */}
        <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-cafe-espresso" size={20} />
            <h4 className="text-lg font-bold text-cafe-espresso">Manajemen Satuan</h4>
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
            <div className="grid grid-cols-2 gap-2">
              {units.map(unit => (
                <div key={unit.id} className="flex justify-between items-center p-3 bg-cafe-cream/10 rounded-xl border border-cafe-ink/5">
                  <span className="text-xs font-bold text-cafe-espresso">{unit.name}</span>
                  <button 
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
