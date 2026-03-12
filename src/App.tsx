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
  Download,
  LogOut,
  User,
  Mail,
  Loader2,
  Terminal,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, JournalEntry, Asset, ProfitLoss, Unit, Menu, MenuIngredient, Purchase, COA, UserRole, PersonalInformation, Branch } from './types';
import Login from './Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'Stock Sistem' | 'Stock Fisik Purchasing' | 'Stock Fisik Operasional' | 'Stock Area Kebersihan' | 'Stock Bahan Baku Rusak' | 'journal' | 'reports' | 'assets' | 'purchase' | 'sale' | 'settings' | 'menu' | 'worksheet' | 'COA' | 'personal-info' | 'employee-data'>('dashboard');
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
  const [profitLoss, setProfitLoss] = useState<ProfitLoss>({ income: 0, expenses: 0 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [personalInfo, setPersonalInfo] = useState<PersonalInformation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedBranchId');
    // Default to branch ID 2 (RUMASA HILLSIDE) if nothing is saved
    return saved ? parseInt(saved) : 2;
  });
  const [egressStatus, setEgressStatus] = useState<{ usage: number, limit: number, percentage: number, warning: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  useEffect(() => {
    localStorage.setItem('userRole', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('lowStockThreshold', lowStockThreshold.toString());
  }, [lowStockThreshold]);

  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem('selectedBranchId', selectedBranchId.toString());
      fetchData();
    }
  }, [selectedBranchId]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error.message);
        // If refresh token is invalid, clear the session
        if (error.message.includes('Refresh Token')) {
          supabase.auth.signOut();
        }
      }
      setSession(session);
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsAuthenticated(false);
        // Clear any potentially stale data
        localStorage.removeItem('supabase.auth.token');
      } else {
        setSession(session);
        setIsAuthenticated(!!session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      checkSupabaseStatus();
    }
  }, [isAuthenticated]);

  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkSupabaseStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/supabase-status');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (err) {
      setSupabaseStatus({ error: 'Gagal menghubungi API status' });
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchId ? `?branch_id=${selectedBranchId}` : '';
      const [invRes, journalRes, assetRes, plRes, unitsRes, menusRes, egressRes, purchasesRes, COARes, personalRes, branchesRes] = await Promise.all([
        fetch(`/api/inventory${branchParam}`),
        fetch(`/api/journal${branchParam}`),
        fetch(`/api/assets${branchParam}`),
        fetch(`/api/reports/profit-loss${branchParam}`),
        fetch('/api/units'),
        fetch(`/api/menus${branchParam}`),
        fetch('/api/egress-status'),
        fetch(`/api/purchases${branchParam}`),
        fetch('/api/coa'),
        fetch('/api/personal-info'),
        fetch('/api/branches')
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
      const personalData = await personalRes.json();
      const branchesData = await branchesRes.json();

      setInventory(Array.isArray(invData) ? invData : []);
      setJournal(Array.isArray(journalData) ? journalData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setCOA(Array.isArray(COAData) ? COAData : []);
      setProfitLoss(plData && !plData.error ? plData : { income: 0, expenses: 0 });
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setMenus(Array.isArray(menusData) ? menusData : []);
      setPersonalInfo(Array.isArray(personalData) ? personalData : []);
      setEgressStatus(egressData && !egressData.error ? egressData : null);
      
      if (Array.isArray(branchesData)) {
        setBranches(branchesData);
        if (!selectedBranchId && branchesData.length > 0) {
          setSelectedBranchId(branchesData[0].id);
        }
      }

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

  if (!isAuthenticated) {
    return <Login onLogin={() => {
      // Supabase onAuthStateChange will handle the state update
    }} />;
  }

  return (
    <div className="min-h-screen bg-cafe-paper text-cafe-ink font-sans flex relative">
      {/* Global Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ 
          backgroundImage: 'url("https://lh3.googleusercontent.com/d/198oYjXACqSBRz8Lql2Yrs8GEE0ddIgjU")',
          opacity: 0.1
        }}
      />
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
        ${isMinimized ? 'lg:w-20' : 'lg:w-72'} 
        w-72 border-r border-cafe-ink/10 flex flex-col bg-cafe-cream/95 lg:bg-cafe-cream/30 backdrop-blur-md lg:backdrop-blur-sm
      `}>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="hidden lg:flex absolute -right-4 top-10 bg-cafe-espresso text-cafe-paper rounded-full p-1.5 shadow-lg z-30 hover:scale-110 transition-transform border-2 border-cafe-paper items-center justify-center"
        >
          {isMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="lg:hidden absolute right-4 top-4">
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-cafe-espresso">
            <X size={24} />
          </button>
        </div>

        <div className={`pt-8 pb-2 ${isMinimized ? 'px-2' : 'px-8'} border-b border-cafe-ink/10 transition-all`}>
          <div className="flex flex-col items-center text-center">
            <img 
              src="https://lh3.googleusercontent.com/d/1bYm_VD5lfX4FT3NcK-1ijtR_P_eShjwM" 
              alt="RUMASA Logo" 
              className={`${isMinimized ? 'w-12 h-12' : 'w-36 h-36'} mb-0 object-contain transition-all`}
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Branch Selector */}
          {!isMinimized && branches.length > 0 && (
            <div className="mt-4 mb-2">
              <label className="text-[10px] uppercase tracking-widest text-cafe-espresso/50 font-bold mb-1 block">
                Cabang Aktif
              </label>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
                className="w-full bg-cafe-paper/50 border border-cafe-espresso/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-espresso/20 transition-all"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                { id: 'Stock Sistem', icon: Package, label: 'Stock Bahan Baku' },
                { id: 'Stock Fisik Purchasing', icon: ShoppingCart, label: 'Stock Fisik Purchasing' },
                { id: 'Stock Fisik Operasional', icon: Package, label: 'Stock Fisik Operasional', roles: ['Manager', 'Admin', 'Finance'] },
                { id: 'Stock Area Kebersihan', icon: Package, label: 'Stock Area Kebersihan', roles: ['Manager', 'Admin'] },
                { id: 'Stock Bahan Baku Rusak', icon: Trash2, label: 'Bahan Baku Rusak', roles: ['Manager', 'Admin', 'Inventory'] },
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
            { 
              id: 'personal-group', 
              icon: User, 
              label: 'Informasi Personal',
              isGroup: true,
              roles: ['Manager', 'Admin', 'Inventory', 'Finance'],
              subItems: [
                { id: 'personal-info', icon: User, label: 'Profil Saya' },
                { id: 'employee-data', icon: List, label: 'Data Karyawan' },
              ]
            },
            { id: 'settings', icon: Settings, label: 'Settings', roles: ['Manager', 'Admin', 'Inventory', 'Finance'] },
          ].filter(item => item.roles.includes(userRole)).map((item) => {
            if (item.isGroup) {
              const isActive = item.subItems?.some(sub => sub.id === activeTab);
              let isOpen = false;
              let setIsOpen = (val: boolean) => {};

              if (item.id === 'journal-group') {
                isOpen = isJournalOpen;
                setIsOpen = setIsJournalOpen;
              } else if (item.id === 'stock-group') {
                isOpen = isStockOpen;
                setIsOpen = setIsStockOpen;
              } else if (item.id === 'personal-group') {
                isOpen = isPersonalOpen;
                setIsOpen = setIsPersonalOpen;
              }

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isMinimized) {
                        setIsOpen(!isOpen);
                      }
                    }}
                    className={`w-full flex items-center ${isMinimized ? 'lg:justify-center' : 'justify-between'} px-5 py-3.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                      isActive || isOpen
                        ? 'bg-cafe-espresso/5 text-cafe-espresso' 
                        : 'text-cafe-ink/60 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
                    }`}
                    title={isMinimized ? item.label : ''}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {(!isMinimized || (isMobileMenuOpen && window.innerWidth < 1024)) && item.label}
                    </div>
                    {(!isMinimized || (isMobileMenuOpen && window.innerWidth < 1024)) && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </button>
                  
                  <AnimatePresence>
                    {((!isMinimized || (isMobileMenuOpen && window.innerWidth < 1024)) && (isOpen || isActive)) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 space-y-1"
                      >
                        {item.subItems?.filter(sub => !sub.roles || sub.roles.includes(userRole)).map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setActiveTab(sub.id as any);
                              if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                            }}
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
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center ${isMinimized ? 'lg:justify-center' : 'gap-4'} px-5 py-3.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                  activeTab === item.id 
                    ? 'bg-cafe-espresso text-cafe-paper shadow-lg shadow-cafe-espresso/20' 
                    : 'text-cafe-ink/60 hover:bg-cafe-espresso/5 hover:text-cafe-espresso'
                }`}
                title={isMinimized ? item.label : ''}
              >
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {(!isMinimized || (isMobileMenuOpen && window.innerWidth < 1024)) && item.label}
              </button>
            );
          })}
        </nav>

        <div className={`p-6 border-t border-cafe-ink/10 space-y-4`}>
          {session?.user?.email === 'muhammadmahardhikadib@gmail.com' && userRole !== 'Manager' && (
            <button
              onClick={() => setUserRole('Manager')}
              className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'gap-4'} px-5 py-3 text-sm font-bold text-cafe-espresso bg-cafe-espresso/10 hover:bg-cafe-espresso/20 transition-all rounded-xl`}
              title={isMinimized ? 'Kembali ke Manager' : ''}
            >
              <User size={18} />
              {!isMinimized && 'Kembali ke Manager'}
            </button>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'gap-4'} px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-all rounded-xl`}
            title={isMinimized ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {!isMinimized && 'Logout'}
          </button>
          
          <div className={`flex items-center gap-3 opacity-40 ${isMinimized ? 'justify-center' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-cafe-latte animate-pulse"></div>
            {!isMinimized && <span className="text-[10px] uppercase tracking-widest font-semibold">System Active</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile Menu Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-cafe-espresso/40 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>
        <header className="h-20 lg:h-24 border-b border-cafe-ink/10 flex items-center justify-between px-4 lg:px-10 bg-cafe-paper/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-cafe-espresso"
            >
              <List size={24} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg lg:text-2xl font-serif italic text-cafe-espresso capitalize leading-none">{activeTab.replace('-', ' ')}</h2>
              <p className="text-[8px] lg:text-[10px] uppercase tracking-widest opacity-40 mt-1 lg:mt-1.5 font-semibold">Overview & Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-6">
            {egressStatus && egressStatus.warning && (
              <div className="hidden sm:flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse border border-rose-200">
                <RefreshCw size={12} className="animate-spin" />
                Egress Tinggi: {egressStatus.percentage.toFixed(1)}%
              </div>
            )}
            <button 
              onClick={fetchData}
              className="p-2 lg:p-3 hover:bg-cafe-espresso/5 rounded-full transition-all text-cafe-espresso"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {supabaseStatus && supabaseStatus.connectionTest !== 'Successful' && (
                  <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                      <HardDrive size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-rose-800">Masalah Koneksi Database</h4>
                      <p className="text-xs text-rose-600 mt-1 leading-relaxed">
                        {supabaseStatus.suggestedAction || 'Aplikasi tidak dapat terhubung ke Supabase. Dashboard menampilkan angka 0 karena data tidak dapat diambil.'}
                      </p>
                      {supabaseStatus.errorDetails && (
                        <p className="text-[10px] text-rose-500 font-mono mt-2 bg-rose-100/50 p-2 rounded-lg break-all">
                          Error: {supabaseStatus.errorDetails}
                        </p>
                      )}
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="mt-3 text-xs font-bold text-rose-700 hover:underline"
                      >
                        Periksa Pengaturan &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {supabaseStatus && supabaseStatus.connectionTest === 'Successful' && !supabaseStatus.hasServiceKey && (
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                      <Settings size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-800">Peringatan: Service Role Key Tidak Ditemukan</h4>
                      <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                        Aplikasi terhubung menggunakan Anon Key. Jika Anda mengaktifkan <strong>Row Level Security (RLS)</strong> di Supabase, data mungkin tidak akan muncul (angka 0) kecuali Anda menambahkan <strong>SUPABASE_SERVICE_ROLE_KEY</strong> di panel Settings &gt; Secrets.
                      </p>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="mt-3 text-xs font-bold text-amber-700 hover:underline"
                      >
                        Pelajari Selengkapnya &rarr;
                      </button>
                    </div>
                  </div>
                )}

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
              <InventoryView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'Stock Fisik Purchasing' && (
              <PurchasingStockView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'Stock Fisik Operasional' && (
              <OperationalStockView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'Stock Area Kebersihan' && (
              <CleaningStockView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'Stock Bahan Baku Rusak' && (
              <DamagedStockView inventory={inventory} units={units} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'journal' && (
              <JournalView journal={journal} COA={COA} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
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
              <AssetsView assets={assets} onUpdate={fetchData} calculateDepreciation={calculateDepreciation} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'purchase' && (
              <PurchaseView inventory={inventory} purchases={purchases} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'sale' && (
              <SaleView menus={menus} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'menu' && (
              <MenuView inventory={inventory} menus={menus} onUpdate={fetchData} userRole={userRole} selectedBranchId={selectedBranchId} />
            )}

            {activeTab === 'personal-info' && (
              <PersonalInfoView personalInfo={personalInfo} onUpdate={fetchData} userRole={userRole} />
            )}

            {activeTab === 'employee-data' && (
              <EmployeeDataView personalInfo={personalInfo} onUpdate={fetchData} userRole={userRole} />
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
                isEditingThreshold={isEditingThreshold}
                setIsEditingThreshold={setIsEditingThreshold}
                userEmail={session?.user?.email}
                supabaseStatus={supabaseStatus}
                checkingStatus={checkingStatus}
                onCheckStatus={checkSupabaseStatus}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function InventoryView({ inventory, units, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'GR', quantity: 0, cost_per_unit: 0, purchasing_physical_stock: 0, operational_physical_stock: 0, cleaning_physical_stock: 0, category: 'Raw Material' as 'Raw Material' | 'Cleaning' });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Raw Material' | 'Cleaning'>('All');

  useEffect(() => {
    if (units.length > 0 && !newItem.unit) {
      setNewItem(prev => ({ ...prev, unit: units[0].name }));
    }
  }, [units]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, branch_id: selectedBranchId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyimpan item');
      }
      
      setNewItem({ name: '', unit: units.length > 0 ? units[0].name : 'GR', quantity: 0, cost_per_unit: 0, purchasing_physical_stock: 0, operational_physical_stock: 0, cleaning_physical_stock: 0, category: 'Raw Material' });
      setShowAdd(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error adding item:", error);
      alert("Error: " + error.message);
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

  const filteredInventory = inventory.filter(item => {
    if (filterCategory === 'All') {
      // In "Stock Sistem", if user wants it to NOT include cleaning, we filter it to Raw Material only
      // But if they use the filter buttons, we respect them.
      // The user said "stock sistem tidak perlu bertambah", implying they want it to be Bahan Baku only.
      return item.category === 'Raw Material';
    }
    return item.category === filterCategory;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h3 className="text-xl font-serif italic text-cafe-espresso">Manajemen Inventaris</h3>
          <div className="flex bg-cafe-cream/20 p-1 rounded-xl border border-cafe-ink/5">
            {(['All', 'Raw Material', 'Cleaning'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filterCategory === cat 
                    ? 'bg-cafe-espresso text-cafe-paper shadow-sm' 
                    : 'text-cafe-espresso/40 hover:text-cafe-espresso'
                }`}
              >
                {cat === 'Raw Material' ? 'Bahan Baku' : cat === 'Cleaning' ? 'Kebersihan' : 'Semua'}
              </button>
            ))}
          </div>
        </div>
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
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kategori</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={newItem.category}
              onChange={e => setNewItem({...newItem, category: e.target.value as any})}
            >
              <option value="Raw Material">Bahan Baku</option>
              <option value="Cleaning">Kebersihan</option>
            </select>
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
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Purchasing</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.purchasing_physical_stock}
              onChange={e => setNewItem({...newItem, purchasing_physical_stock: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Operasional</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.operational_physical_stock}
              onChange={e => setNewItem({...newItem, operational_physical_stock: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Area Kebersihan</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.cleaning_physical_stock}
              onChange={e => setNewItem({...newItem, cleaning_physical_stock: parseFloat(e.target.value)})}
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
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Kategori</label>
            <select 
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
              value={editingItem.category}
              onChange={e => setEditingItem({...editingItem, category: e.target.value as any})}
            >
              <option value="Raw Material">Bahan Baku</option>
              <option value="Cleaning">Kebersihan</option>
            </select>
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
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Sistem</label>
            <input 
              type="number"
              required
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={editingItem.quantity}
              onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Purchasing</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={editingItem.purchasing_physical_stock || 0}
              onChange={e => setEditingItem({...editingItem, purchasing_physical_stock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Operasional</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={editingItem.operational_physical_stock || 0}
              onChange={e => setEditingItem({...editingItem, operational_physical_stock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Area Kebersihan</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={editingItem.cleaning_physical_stock || 0}
              onChange={e => setEditingItem({...editingItem, cleaning_physical_stock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold">Update</button>
            <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Kategori</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Harga / Unit</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Sistem</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris untuk kategori ini.</td>
              </tr>
            ) : (
              filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-[10px] font-bold uppercase tracking-tighter">
                    <span className={`px-2 py-1 rounded-md ${item.category === 'Cleaning' ? 'bg-blue-50 text-blue-700' : 'bg-cafe-cream text-cafe-espresso'}`}>
                      {item.category === 'Raw Material' ? 'Bahan Baku' : 'Kebersihan'}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">{formatCurrency(item.cost_per_unit || 0)}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.quantity < 10 ? 'bg-rose-50 text-rose-700' : 'bg-cafe-cream text-cafe-espresso'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      {userRole === 'Manager' && (
                        <>
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

function JournalView({ journal, COA, onUpdate, userRole, selectedBranchId }: { journal: JournalEntry[], COA: COA[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    account: '',
    debit: 0,
    credit: 0,
    payment_method: 'Kas' as any
  });

  const handleAccountChange = (accountName: string) => {
    setNewEntry({
      ...newEntry,
      account: accountName,
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create two entries: one for the account and one for the payment method (offset)
    const entries = [];
    
    const selectedCOA = COA.find(c => c.name === newEntry.account);
    const category = selectedCOA ? selectedCOA.category : 'Expense';

    if (newEntry.debit > 0) {
      // Entry 1: Account (Debit)
      entries.push({
        branch_id: selectedBranchId,
        date: newEntry.date,
        description: newEntry.description,
        account: newEntry.account,
        debit: newEntry.debit,
        credit: 0,
        category: category,
        payment_method: newEntry.payment_method
      });
      // Entry 2: Payment Method (Credit)
      entries.push({
        branch_id: selectedBranchId,
        date: newEntry.date,
        description: newEntry.payment_method,
        account: newEntry.payment_method,
        debit: 0,
        credit: newEntry.debit,
        category: 'Asset', // Kas/Bank is an Asset
        payment_method: newEntry.payment_method
      });
    } else if (newEntry.credit > 0) {
      // Entry 1: Account (Credit)
      entries.push({
        branch_id: selectedBranchId,
        date: newEntry.date,
        description: newEntry.description,
        account: newEntry.account,
        debit: 0,
        credit: newEntry.credit,
        category: category,
        payment_method: newEntry.payment_method
      });
      // Entry 2: Payment Method (Debit)
      entries.push({
        branch_id: selectedBranchId,
        date: newEntry.date,
        description: newEntry.payment_method,
        account: newEntry.payment_method,
        debit: newEntry.credit,
        credit: 0,
        category: 'Asset',
        payment_method: newEntry.payment_method
      });
    }

    try {
      for (const entry of entries) {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error('Gagal menambah entri');
      }
      setShowAdd(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message);
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

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
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
                </td>
                <td className="p-6 text-xs font-mono">
                  <span className={`px-2 py-1 rounded-md ${entry.payment_method === 'Bank' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                    {entry.payment_method || 'Kas'}
                  </span>
                </td>
                <td className="p-6 text-sm text-right font-mono text-rose-600 font-bold">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '0'}
                </td>
                <td className="p-6 text-sm text-right font-mono text-emerald-600 font-bold">
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '0'}
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

function COAView({ COA, onUpdate, userRole }: { COA: COA[], onUpdate: () => void, userRole: UserRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCOA, setNewCOA] = useState({ code: '', name: '', category: 'Expense' as any });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCOA)
      });
      if (res.ok) {
        setShowAdd(false);
        setNewCOA({ code: '', name: '', category: 'Expense' });
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal menambah akun: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan saat menambah akun.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus akun ini?')) return;
    await fetch(`/api/coa/${id}`, { method: 'DELETE' });
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

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
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

      <div className="max-w-3xl mx-auto bg-white border border-cafe-ink/5 p-6 md:p-16 rounded-[2rem] shadow-2xl relative overflow-hidden">
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

function AssetsView({ assets, onUpdate, calculateDepreciation, userRole, selectedBranchId }: { 
  assets: Asset[], 
  onUpdate: () => void,
  calculateDepreciation: (a: Asset) => number,
  userRole: UserRole,
  selectedBranchId: number | null
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
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAsset, branch_id: selectedBranchId })
      });
      if (res.ok) {
        setShowAdd(false);
        setNewAsset({ name: '', type: 'Equipment', purchase_date: new Date().toISOString().split('T')[0], purchase_price: 0, lifespan_years: 5 });
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal menambah aset: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan saat menambah aset.');
    }
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

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
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

function PurchaseView({ inventory, purchases, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], purchases: Purchase[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
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
        body: JSON.stringify({ ...formData, branch_id: selectedBranchId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Terjadi kesalahan saat mencatat pembelian');
      }
      
      alert('Pembelian berhasil dicatat!');
      setFormData({
        inventory_id: '',
        quantity: 0,
        total_cost: 0,
        date: new Date().toISOString().split('T')[0],
        description: 'Pembelian Stok'
      });
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
          <div className="bg-white border border-cafe-ink/5 rounded-3xl shadow-xl overflow-hidden overflow-x-auto">
            <div className="p-6 border-b border-cafe-ink/5 flex justify-between items-center min-w-[600px]">
              <h3 className="text-lg font-bold text-cafe-espresso">Riwayat Pembelian</h3>
              <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{purchases.length} Transaksi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
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

function SaleView({ menus, onUpdate, userRole, selectedBranchId }: { menus: Menu[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
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
      body: JSON.stringify({ ...formData, branch_id: selectedBranchId })
    });
    
    if (res.ok) {
      alert('Penjualan berhasil dicatat!');
      setFormData({
        amount: 0,
        items_sold: 1,
        date: new Date().toISOString().split('T')[0],
        description: 'Penjualan Harian',
        menu_id: '',
        payment_method: 'Kas'
      });
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

      <form onSubmit={handleSubmit} className="bg-white border border-cafe-ink/5 p-6 md:p-10 rounded-3xl shadow-xl space-y-8">
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

function MenuView({ inventory, menus, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], menus: Menu[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
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
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMenuName, price: newMenuPrice, branch_id: selectedBranchId })
      });
      if (res.ok) {
        setNewMenuName('');
        setNewMenuPrice(0);
        setShowAddMenu(false);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal menambah menu: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan saat menambah menu.');
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
            <div className="bg-white border border-cafe-ink/5 p-6 md:p-8 rounded-3xl shadow-sm space-y-8">
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

function SettingsView({ 
  inventory, 
  units, 
  onUpdateUnits, 
  userRole, 
  setUserRole,
  lowStockThreshold, 
  setLowStockThreshold,
  isEditingThreshold,
  setIsEditingThreshold,
  userEmail,
  supabaseStatus,
  checkingStatus,
  onCheckStatus
}: { 
  inventory: InventoryItem[], 
  units: Unit[], 
  onUpdateUnits: () => void, 
  userRole: UserRole, 
  setUserRole: (role: UserRole) => void,
  lowStockThreshold: number, 
  setLowStockThreshold: (val: number) => void,
  isEditingThreshold: boolean,
  setIsEditingThreshold: (val: boolean) => void,
  userEmail?: string,
  supabaseStatus: any,
  checkingStatus: boolean,
  onCheckStatus: () => void
}) {
  const [newUnit, setNewUnit] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [sqlScript, setSqlScript] = useState('');
  const [loadingSql, setLoadingSql] = useState(false);

  const fetchSql = async () => {
    setLoadingSql(true);
    try {
      const res = await fetch('/api/supabase-sql');
      const data = await res.json();
      setSqlScript(data.sql);
      setShowSql(true);
    } catch (err) {
      alert('Gagal mengambil skrip SQL');
    } finally {
      setLoadingSql(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Skrip SQL berhasil disalin!');
  };

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
        {/* Supabase Status - Only for Managers or Admins */}
        {(userRole === 'Manager' || userRole === 'Admin') && (
          <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="text-cafe-espresso" size={20} />
                <h4 className="text-lg font-bold text-cafe-espresso">Status Supabase</h4>
              </div>
              <button 
                onClick={onCheckStatus}
                disabled={checkingStatus}
                className="p-2 hover:bg-cafe-espresso/5 rounded-lg text-cafe-espresso transition-all disabled:opacity-50"
                title="Refresh Status"
              >
                <RefreshCw size={18} className={checkingStatus ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {supabaseStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cafe-cream/5 rounded-2xl border border-cafe-ink/5">
                    <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">Koneksi</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${supabaseStatus.connectionTest === 'Successful' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <p className={`text-sm font-bold ${supabaseStatus.connectionTest === 'Successful' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {supabaseStatus.connectionTest}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-cafe-cream/5 rounded-2xl border border-cafe-ink/5">
                    <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">Service Role Key</p>
                    <p className={`text-sm font-bold ${supabaseStatus.hasServiceKey ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {supabaseStatus.hasServiceKey ? 'Terdeteksi' : 'Tidak Ada (Gunakan Anon)'}
                    </p>
                  </div>
                </div>

                {supabaseStatus.errorDetails && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-[10px] uppercase tracking-widest text-rose-700 font-bold mb-1">Error Details</p>
                    <p className="text-xs text-rose-600 font-mono break-all">{supabaseStatus.errorDetails}</p>
                  </div>
                )}

                <div className="p-4 bg-cafe-cream/5 rounded-2xl border border-cafe-ink/5">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">Tips & Solusi</p>
                  <p className="text-xs opacity-60 leading-relaxed">
                    {supabaseStatus.suggestedAction || (supabaseStatus.connectionTest === 'Successful' 
                      ? 'Koneksi Supabase berjalan dengan baik. Semua data tersimpan di database eksternal.' 
                      : 'Koneksi gagal. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY sudah benar di panel Secrets.')}
                    {!supabaseStatus.hasServiceKey && ' Anda belum memasukkan SUPABASE_SERVICE_ROLE_KEY, pastikan Row Level Security (RLS) di Supabase sudah dikonfigurasi dengan benar agar data dapat diperbarui.'}
                  </p>
                  
                  {supabaseStatus.connectionTest !== 'Successful' && (
                    <button 
                      onClick={fetchSql}
                      disabled={loadingSql}
                      className="mt-4 flex items-center gap-2 text-[10px] font-bold text-cafe-espresso bg-cafe-cream/20 px-4 py-2 rounded-lg hover:bg-cafe-cream/40 transition-all border border-cafe-espresso/10"
                    >
                      {loadingSql ? <RefreshCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                      LIHAT SKRIP SQL SETUP DATABASE
                    </button>
                  )}
                </div>

                {showSql && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cafe-espresso/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white w-full max-w-3xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                      <div className="p-6 border-b border-cafe-ink/5 flex justify-between items-center bg-cafe-cream/10">
                        <div className="flex items-center gap-3">
                          <Terminal className="text-cafe-espresso" size={20} />
                          <h4 className="text-lg font-serif italic text-cafe-espresso">SQL Setup Database</h4>
                        </div>
                        <button onClick={() => setShowSql(false)} className="p-2 hover:bg-cafe-espresso/5 rounded-full transition-all">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-cafe-ink text-cafe-paper font-mono text-[10px] leading-relaxed">
                        <pre className="whitespace-pre-wrap">{sqlScript}</pre>
                      </div>
                      <div className="p-6 border-t border-cafe-ink/5 flex justify-end gap-3 bg-cafe-cream/5">
                        <button 
                          onClick={() => copyToClipboard(sqlScript)}
                          className="px-6 py-2.5 bg-cafe-espresso text-cafe-paper rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Copy size={14} />
                          SALIN SKRIP SQL
                        </button>
                        <button 
                          onClick={() => setShowSql(false)}
                          className="px-6 py-2.5 bg-cafe-espresso/5 text-cafe-espresso rounded-xl text-xs font-bold hover:bg-cafe-espresso/10 transition-all"
                        >
                          TUTUP
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-cafe-espresso/20" size={32} />
              </div>
            )}
          </div>
        )}

        {/* Role Settings - Only for Managers or the specific user */}
        {(userRole === 'Manager' || userEmail === 'muhammadmahardhikadib@gmail.com') && (
          <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <User className="text-cafe-espresso" size={20} />
              <h4 className="text-lg font-bold text-cafe-espresso">Pengaturan Role</h4>
            </div>
            <p className="text-xs text-cafe-ink/60 leading-relaxed">
              Pilih role Anda untuk mengakses fitur yang sesuai. {userEmail === 'muhammadmahardhikadib@gmail.com' ? '(Anda memiliki akses khusus untuk mengubah role kapan saja).' : '(Hanya Manager yang dapat mengubah role).'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(['Manager', 'Admin', 'Inventory', 'Finance', 'Staff'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    userRole === role
                      ? 'bg-cafe-espresso text-white shadow-lg shadow-cafe-espresso/20'
                      : 'bg-cafe-espresso/5 text-cafe-espresso hover:bg-cafe-espresso/10'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Settings */}
        {userRole === 'Inventory' || userRole === 'Manager' ? (
          <div className="bg-white border border-cafe-ink/5 p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="text-cafe-espresso" size={20} />
                <h4 className="text-lg font-bold text-cafe-espresso">Pengingat Stok Menipis</h4>
              </div>
              <button
                onClick={() => setIsEditingThreshold(!isEditingThreshold)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isEditingThreshold 
                    ? 'bg-cafe-espresso text-white shadow-lg shadow-cafe-espresso/20' 
                    : 'bg-cafe-espresso/5 text-cafe-espresso hover:bg-cafe-espresso/10'
                }`}
              >
                {isEditingThreshold ? (
                  <>
                    <Save size={14} />
                    Simpan
                  </>
                ) : (
                  <>
                    <Edit2 size={14} />
                    Edit
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-cafe-ink/60 leading-relaxed">
              Atur ambang batas stok minimum untuk memicu peringatan "Stok Menipis" di dashboard.
            </p>
            <div className="flex items-center gap-4">
              <input 
                type="number"
                disabled={!isEditingThreshold}
                className={`w-24 border-b py-2 text-sm font-mono focus:outline-none transition-all ${
                  isEditingThreshold 
                    ? 'border-cafe-espresso text-cafe-espresso' 
                    : 'border-transparent text-cafe-ink/40 cursor-not-allowed'
                }`}
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

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <div className="p-6 border-b border-cafe-ink/5 bg-cafe-cream/10 min-w-[600px]">
          <h4 className="font-serif italic text-lg text-cafe-espresso">Rekapitulasi Jurnal</h4>
        </div>
        <table className="w-full text-left border-collapse min-w-[600px]">
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

function CleaningStockView({ inventory, units, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'GR', quantity: 0, cost_per_unit: 0, cleaning_physical_stock: 0, category: 'Cleaning' as const });
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, branch_id: selectedBranchId })
      });
      if (res.ok) {
        setShowAdd(false);
        setNewItem({ name: '', unit: 'GR', quantity: 0, cost_per_unit: 0, cleaning_physical_stock: 0, category: 'Cleaning' });
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal menambah item: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan saat menambah item.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cleaning_physical_stock: editingItem.cleaning_physical_stock 
        })
      });
      
      if (res.ok) {
        setEditingItem(null);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal memperbarui stok area kebersihan: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Stock Area Kebersihan</h3>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Tambah Item
          </button>
          <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold bg-cafe-cream px-4 py-2 rounded-full">
            Role: {userRole}
          </div>
        </div>
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
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
              value={newItem.unit}
              onChange={e => setNewItem({...newItem, unit: e.target.value})}
            >
              {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Awal</label>
            <input 
              type="number"
              className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
              value={newItem.cleaning_physical_stock}
              onChange={e => setNewItem({...newItem, cleaning_physical_stock: parseFloat(e.target.value)})}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" disabled={loading} className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5">Batal</button>
          </div>
        </motion.form>
      )}

      {editingItem && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-6 items-end"
          onSubmit={handleUpdateStock}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Item</label>
              <input 
                disabled
                className="w-full border-b border-cafe-ink/10 py-2 text-sm opacity-50 cursor-not-allowed"
                value={editingItem.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Area Kebersihan ({editingItem.unit})</label>
              <input 
                type="number"
                required
                autoFocus
                className="w-full border-b border-cafe-espresso py-2 text-sm focus:outline-none font-mono"
                value={editingItem.cleaning_physical_stock || 0}
                onChange={e => setEditingItem({...editingItem, cleaning_physical_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button 
              type="button" 
              onClick={() => setEditingItem(null)} 
              className="px-6 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold"
            >
              Batal
            </button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Area Kebersihan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.filter(i => i.category === 'Cleaning').length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris kebersihan.</td>
              </tr>
            ) : (
              inventory.filter(i => i.category === 'Cleaning').map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                      {item.cleaning_physical_stock || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-2 rounded-lg border border-cafe-ink/10 text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-all"
                      title="Update Stok Fisik"
                    >
                      <Edit2 size={16} />
                    </button>
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

function DamagedStockView({ inventory, units, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          damaged_stock: editingItem.damaged_stock 
        })
      });
      
      if (res.ok) {
        setEditingItem(null);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal memperbarui stok bahan baku rusak: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Bahan Baku Rusak</h3>
        <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold bg-cafe-cream px-4 py-2 rounded-full">
          Role: {userRole}
        </div>
      </div>

      {editingItem && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-6 items-end"
          onSubmit={handleUpdateStock}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Item</label>
              <input 
                disabled
                className="w-full border-b border-cafe-ink/10 py-2 text-sm opacity-50 cursor-not-allowed"
                value={editingItem.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">QTY Rusak ({editingItem.unit})</label>
              <input 
                type="number"
                required
                autoFocus
                className="w-full border-b border-cafe-espresso py-2 text-sm focus:outline-none font-mono"
                value={editingItem.damaged_stock || 0}
                onChange={e => setEditingItem({...editingItem, damaged_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button 
              type="button" 
              onClick={() => setEditingItem(null)} 
              className="px-6 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold"
            >
              Batal
            </button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">ITEM</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">QTY</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.filter(i => i.category === 'Raw Material').length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris bahan baku rusak.</td>
              </tr>
            ) : (
              inventory.filter(i => i.category === 'Raw Material').map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.damaged_stock && item.damaged_stock > 0 ? 'bg-rose-50 text-rose-700' : 'bg-cafe-cream text-cafe-espresso'}`}>
                      {item.damaged_stock || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-2 rounded-lg border border-cafe-ink/10 text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-all"
                      title="Update Stok Rusak"
                    >
                      <Edit2 size={16} />
                    </button>
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

function OperationalStockView({ inventory, units, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          operational_physical_stock: editingItem.operational_physical_stock 
        })
      });
      
      if (res.ok) {
        setEditingItem(null);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal memperbarui stok fisik operasional: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Stock Fisik Operasional</h3>
        <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold bg-cafe-cream px-4 py-2 rounded-full">
          Role: {userRole}
        </div>
      </div>

      {editingItem && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-6 items-end"
          onSubmit={handleUpdateStock}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Item</label>
              <input 
                disabled
                className="w-full border-b border-cafe-ink/10 py-2 text-sm opacity-50 cursor-not-allowed"
                value={editingItem.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Operasional ({editingItem.unit})</label>
              <input 
                type="number"
                required
                autoFocus
                className="w-full border-b border-cafe-espresso py-2 text-sm focus:outline-none font-mono"
                value={editingItem.operational_physical_stock || 0}
                onChange={e => setEditingItem({...editingItem, operational_physical_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button 
              type="button" 
              onClick={() => setEditingItem(null)} 
              className="px-6 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold"
            >
              Batal
            </button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Fisik Operasional</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.filter(i => i.category === 'Raw Material').length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris bahan baku operasional.</td>
              </tr>
            ) : (
              inventory.filter(i => i.category === 'Raw Material').map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                      {item.operational_physical_stock || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-2 rounded-lg border border-cafe-ink/10 text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-all"
                      title="Update Stok Fisik"
                    >
                      <Edit2 size={16} />
                    </button>
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

function PurchasingStockView({ inventory, units, onUpdate, userRole, selectedBranchId }: { inventory: InventoryItem[], units: Unit[], onUpdate: () => void, userRole: UserRole, selectedBranchId: number | null }) {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          purchasing_physical_stock: editingItem.purchasing_physical_stock 
        })
      });
      
      if (res.ok) {
        setEditingItem(null);
        onUpdate();
      } else {
        const error = await res.json();
        alert('Gagal memperbarui stok fisik: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Stock Fisik Purchasing</h3>
        <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold bg-cafe-cream px-4 py-2 rounded-full">
          Role: {userRole}
        </div>
      </div>

      {editingItem && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm flex gap-6 items-end"
          onSubmit={handleUpdateStock}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Item</label>
              <input 
                disabled
                className="w-full border-b border-cafe-ink/10 py-2 text-sm opacity-50 cursor-not-allowed"
                value={editingItem.name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stok Fisik Purchasing ({editingItem.unit})</label>
              <input 
                type="number"
                required
                autoFocus
                className="w-full border-b border-cafe-espresso py-2 text-sm focus:outline-none font-mono"
                value={editingItem.purchasing_physical_stock || 0}
                onChange={e => setEditingItem({...editingItem, purchasing_physical_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button 
              type="button" 
              onClick={() => setEditingItem(null)} 
              className="px-6 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold"
            >
              Batal
            </button>
          </div>
        </motion.form>
      )}

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Item</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Satuan</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Stok Fisik Purchasing</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {inventory.filter(i => i.category === 'Raw Material').length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data inventaris bahan baku purchasing.</td>
              </tr>
            ) : (
              inventory.filter(i => i.category === 'Raw Material').map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.name}</td>
                  <td className="p-6 text-sm font-mono opacity-60">{item.unit}</td>
                  <td className="p-6 text-sm text-right font-mono">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                      {item.purchasing_physical_stock || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-2 rounded-lg border border-cafe-ink/10 text-cafe-espresso hover:bg-cafe-espresso hover:text-white transition-all"
                      title="Update Stok Fisik"
                    >
                      <Edit2 size={16} />
                    </button>
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

function EmployeeDataView({ personalInfo, onUpdate, userRole }: { personalInfo: PersonalInformation[], onUpdate: () => void, userRole: UserRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalInformation | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    address: '',
    birth_info: '',
    ktp_number: '',
    phone_number: '',
    join_date: new Date().toISOString().split('T')[0],
    role: 'Staff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/personal-info/${editingItem.id}` : '/api/personal-info';
    const method = editingItem ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowAdd(false);
      setEditingItem(null);
      setFormData({
        full_name: '',
        email: '',
        address: '',
        birth_info: '',
        ktp_number: '',
        phone_number: '',
        join_date: new Date().toISOString().split('T')[0],
        role: 'Staff'
      });
      onUpdate();
    } else {
      const error = await res.json();
      alert('Gagal menyimpan data: ' + (error.error || 'Unknown error'));
    }
  };

  const handleEdit = (item: PersonalInformation) => {
    setEditingItem(item);
    setFormData({
      full_name: item.full_name,
      email: item.email || '',
      address: item.address,
      birth_info: item.birth_info,
      ktp_number: item.ktp_number,
      phone_number: item.phone_number,
      join_date: item.join_date,
      role: item.role
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data karyawan ini?')) return;
    const res = await fetch(`/api/personal-info/${id}`, { method: 'DELETE' });
    if (res.ok) onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Data Karyawan</h3>
        {userRole === 'Manager' && (
          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({
                full_name: '',
                email: '',
                address: '',
                birth_info: '',
                ktp_number: '',
                phone_number: '',
                join_date: new Date().toISOString().split('T')[0],
                role: 'Staff'
              });
              setShowAdd(true);
            }}
            className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Tambah Karyawan
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Lengkap</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Email</label>
                <input 
                  required
                  type="email"
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tempat Tanggal Lahir</label>
                <input 
                  required
                  placeholder="Contoh: Jakarta, 01-01-1990"
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.birth_info}
                  onChange={e => setFormData({...formData, birth_info: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Alamat</label>
                <textarea 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors min-h-[80px]"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">No KTP</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.ktp_number}
                  onChange={e => setFormData({...formData, ktp_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nomor Handphone</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.phone_number}
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal Masuk</label>
                <input 
                  type="date"
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.join_date}
                  onChange={e => setFormData({...formData, join_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Role</label>
                <select 
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={userRole !== 'Manager'}
                >
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Finance">Finance</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="flex items-end gap-3 md:col-span-2">
                <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold shadow-lg shadow-cafe-espresso/20">
                  {editingItem ? 'Update Karyawan' : 'Simpan Karyawan'}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setEditingItem(null); }} className="px-8 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5 transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-cafe-ink/5 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-cafe-ink/5 bg-cafe-cream/10">
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Nama</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Email</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">TTL</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Alamat</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Handphone</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Tanggal Masuk</th>
              <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold">Role</th>
              {userRole === 'Manager' && <th className="p-6 text-[11px] uppercase tracking-widest opacity-50 font-bold text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-ink/5">
            {personalInfo.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'Manager' ? 7 : 6} className="p-10 text-center text-sm opacity-40 italic font-serif">Belum ada data karyawan.</td>
              </tr>
            ) : (
              personalInfo.map(item => (
                <tr key={item.id} className="hover:bg-cafe-cream/20 transition-colors">
                  <td className="p-6 text-sm font-medium text-cafe-ink">{item.full_name}</td>
                  <td className="p-6 text-sm">{item.email}</td>
                  <td className="p-6 text-sm">{item.birth_info}</td>
                  <td className="p-6 text-sm opacity-70 max-w-xs truncate" title={item.address}>{item.address}</td>
                  <td className="p-6 text-sm font-mono">{item.phone_number}</td>
                  <td className="p-6 text-sm">{item.join_date}</td>
                  <td className="p-6 text-sm">
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-cafe-espresso/5 text-cafe-espresso rounded">
                      {item.role}
                    </span>
                  </td>
                  {userRole === 'Manager' && (
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
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
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonalInfoView({ personalInfo, onUpdate, userRole }: { personalInfo: PersonalInformation[], onUpdate: () => void, userRole: UserRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalInformation | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    address: '',
    birth_info: '',
    ktp_number: '',
    phone_number: '',
    join_date: new Date().toISOString().split('T')[0],
    role: 'Staff'
  });

  // Filter to only show records matching the current user's email if possible, or role as fallback
  // In a real app, we'd filter by the logged-in user's email.
  const myInfo = personalInfo.filter(item => item.role === userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/personal-info/${editingItem.id}` : '/api/personal-info';
    const method = editingItem ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setShowAdd(false);
      setEditingItem(null);
      setFormData({
        full_name: '',
        email: '',
        address: '',
        birth_info: '',
        ktp_number: '',
        phone_number: '',
        join_date: new Date().toISOString().split('T')[0],
        role: 'Staff'
      });
      onUpdate();
    } else {
      const error = await res.json();
      alert('Gagal menyimpan data: ' + (error.error || 'Unknown error'));
    }
  };

  const handleEdit = (item: PersonalInformation) => {
    setEditingItem(item);
    setFormData({
      full_name: item.full_name,
      email: item.email || '',
      address: item.address,
      birth_info: item.birth_info,
      ktp_number: item.ktp_number,
      phone_number: item.phone_number,
      join_date: item.join_date,
      role: item.role
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data personal ini?')) return;
    const res = await fetch(`/api/personal-info/${id}`, { method: 'DELETE' });
    if (res.ok) onUpdate();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic text-cafe-espresso">Informasi Personal</h3>
        <button 
          onClick={() => {
            if (myInfo.length > 0) {
              handleEdit(myInfo[0]);
            } else {
              setEditingItem(null);
              setFormData({
                full_name: '',
                email: '',
                address: '',
                birth_info: '',
                ktp_number: '',
                phone_number: '',
                join_date: new Date().toISOString().split('T')[0],
                role: userRole // Default to current role
              });
              setShowAdd(true);
            }
          }}
          className="flex items-center gap-2 bg-cafe-espresso text-cafe-paper px-6 py-3 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          {myInfo.length > 0 ? <Edit2 size={18} /> : <Plus size={18} />}
          {myInfo.length > 0 ? 'Edit Data' : 'Tambah Data'}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-cafe-ink/5 p-8 rounded-2xl shadow-sm"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nama Lengkap</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Email</label>
                <input 
                  required
                  type="email"
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tempat Tanggal Lahir</label>
                <input 
                  required
                  placeholder="Contoh: Jakarta, 01-01-1990"
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.birth_info}
                  onChange={e => setFormData({...formData, birth_info: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Alamat</label>
                <textarea 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors min-h-[80px]"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">No KTP</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.ktp_number}
                  onChange={e => setFormData({...formData, ktp_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Nomor Handphone</label>
                <input 
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors font-mono"
                  value={formData.phone_number}
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Tanggal Masuk</label>
                <input 
                  type="date"
                  required
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors"
                  value={formData.join_date}
                  onChange={e => setFormData({...formData, join_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Role</label>
                <select 
                  className="w-full border-b border-cafe-ink/10 py-2 text-sm focus:border-cafe-espresso focus:outline-none transition-colors bg-transparent"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={userRole !== 'Manager'} // Only manager can change role in personal info
                >
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Finance">Finance</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="flex items-end gap-3 md:col-span-2">
                <button type="submit" className="flex-1 bg-cafe-espresso text-cafe-paper py-3 rounded-xl text-sm font-bold shadow-lg shadow-cafe-espresso/20">
                  {editingItem ? 'Update Data' : 'Simpan Data'}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setEditingItem(null); }} className="px-8 py-3 border border-cafe-ink/10 rounded-xl text-sm font-bold hover:bg-cafe-ink/5 transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myInfo.map(item => (
          <motion.div 
            key={item.id}
            layout
            className="bg-white border border-cafe-ink/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-cafe-cream/30 rounded-xl text-cafe-espresso">
                <User size={24} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 hover:bg-cafe-espresso/5 rounded-lg text-cafe-espresso transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                {userRole === 'Manager' && (
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-serif italic text-cafe-espresso leading-tight">{item.full_name}</h4>
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-cafe-espresso/5 text-cafe-espresso rounded mt-1 inline-block">
                  {item.role}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><Mail size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Email</p>
                    <p className="text-xs">{item.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><HardDrive size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">No KTP</p>
                    <p className="text-xs font-mono">{item.ktp_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><Coffee size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">TTL</p>
                    <p className="text-xs">{item.birth_info}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><Settings size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Handphone</p>
                    <p className="text-xs font-mono">{item.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><LayoutDashboard size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Tanggal Masuk</p>
                    <p className="text-xs">{item.join_date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 opacity-40"><BookOpen size={12} /></div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Alamat</p>
                    <p className="text-xs opacity-70 line-clamp-2">{item.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {myInfo.length === 0 && (
          <div className="col-span-full p-20 text-center bg-white/50 border border-dashed border-cafe-ink/10 rounded-3xl">
            <User size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm opacity-40 italic font-serif">Belum ada data informasi personal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
