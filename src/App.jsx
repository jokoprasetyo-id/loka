import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, ListOrdered, Plus, Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
  PieChart, Calendar, X, Target, Landmark, PiggyBank, AlertCircle, Receipt,
  Settings, Trash2, Tags, BarChart3, ChevronUp, Layers, Eye, EyeOff, Globe,
  Activity, Coins, Loader2, CheckCircle2, WifiOff, User, Cloud, LogIn, LogOut
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, // FIX: Wajib untuk environment ini agar tidak di-block
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// =====================================================================
// FIREBASE INITIALIZATION WITH FALLBACK
// =====================================================================
const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDKUSL_DSRjORdxpLsahxLamOluOLIQss8",
  authDomain: "assets-liquid.firebaseapp.com",
  projectId: "assets-liquid"
};

let app, auth, db, appId;
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    appId = rawAppId.replace(/\//g, '_');
  } else {
    app = initializeApp(MY_FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = "assets-liquid-loka"; 
  }
} catch (error) {
  console.error("Firebase init failed:", error);
}

// =====================================================================
// HELPER: HAPTIC FEEDBACK
// =====================================================================
const triggerHaptic = (duration = 15) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(duration); } catch (e) {}
  }
};

// =====================================================================
// INITIAL DATA
// =====================================================================
const INITIAL_CATEGORIES = {
  income: ['Gaji', 'Freelance', 'Income lainnya', 'Pencairan Investasi'],
  spending: [
    'Makan/minum', 'Bensin/Transportasi', 'Hangout, Jajan', 
    'Peralatan Rumah Tangga', 'Keperluan Pribadi', 'Belanja', 'Lainnya',
    'Parkir dan Tol', 'Perawatan Kendaraan'
  ],
  bills: [
    'Sewa Rumah/Kost', 'Tagihan Listrik', 'Tagihan Air', 
    'Internet dan Pulsa', 'Langganan (Netflix/Spotify)'
  ],
  savings: ['Dana Darurat', 'Sinking Fund', 'Investasi Saham/Reksadana', 'Emas Digital'],
  debt: ['Cicilan Utang', 'Bayar Pinjaman', 'Cicilan Keyboard', 'Cicilan Digicam']
};

const INITIAL_BUDGETS = {
  'Makan/minum': 1500000,
  'Bensin/Transportasi': 500000,
  'Hangout, Jajan': 800000,
  'Keperluan Pribadi': 500000,
  'Belanja': 1000000,
  'Tagihan Listrik': 52000,
  'Internet dan Pulsa': 400000,
};

const INITIAL_ASSETS = [
  { id: 1, category: 'On Hand Cash', name: 'Dompet / Tunai', amount: 25000, unit: 'IDR', quantity: 25000 },
  { id: 2, category: 'Bank Cash', name: 'Bank BRI', amount: 12500000, unit: 'IDR', quantity: 12500000 },
  { id: 3, category: 'Bank Cash', name: 'Bank Jago', amount: 2105732, unit: 'IDR', quantity: 2105732 },
  { id: 4, category: 'Investasi', name: 'Reksadana Pasar Uang', amount: 6475146, unit: 'IDR', quantity: 6475146 },
  { id: 5, category: 'Investasi', name: 'Obligasi FR', amount: 13000000, unit: 'IDR', quantity: 13000000 },
];

const INITIAL_GOALS = [
  { 
    id: 1, name: 'Dana Darurat (Sinking Fund)', target: 50000000, deadline: 'Desember 2026', collapsed: false,
    assets: [
      { id: 101, name: 'Kas Rekening', unit: 'IDR', amount: 6500000 },
      { id: 102, name: 'Emas Batangan', unit: 'Emas Antam (g)', amount: 5 }
    ] 
  },
  { 
    id: 2, name: 'Liburan Tahunan', target: 10000000, deadline: 'Juli 2026', collapsed: true,
    assets: [
      { id: 201, name: 'Tabungan Jago', unit: 'IDR', amount: 2000000 },
      { id: 202, name: 'Simpanan USD', unit: 'USD', amount: 100 }
    ] 
  }
];

const INITIAL_DEBTS = [
  { id: 1, name: 'Cicilan Digicam', total: 2470000, paid: 823333, type: 'debt' },
  { id: 2, name: 'Pinjaman KUR', total: 47688702, paid: 1521100, type: 'debt' },
  { id: 3, name: 'Piutang Teman (Budi)', total: 500000, paid: 100000, type: 'receivable' }
];

const INITIAL_TRANSACTIONS = [
  { id: 1, date: '2026-02-02', description: 'Gaji Bulanan', amount: 6689997, type: 'income', category: 'Gaji' },
  { id: 2, date: '2026-02-05', description: 'Beli Kuota Internet', amount: 150000, type: 'bills', category: 'Internet dan Pulsa' },
  { id: 3, date: '2026-02-13', description: 'Bayar Tagihan Listrik', amount: 250000, type: 'bills', category: 'Tagihan Listrik' },
  { id: 4, date: '2026-02-15', description: 'Makan Siang Kantor', amount: 45000, type: 'spending', category: 'Makan/minum' },
  { id: 5, date: '2026-02-18', description: 'Bensin Motor', amount: 35000, type: 'spending', category: 'Bensin/Transportasi' },
  { id: 6, date: '2026-02-20', description: 'Nongkrong di Cafe', amount: 120000, type: 'spending', category: 'Hangout, Jajan' },
  { id: 7, date: '2026-02-25', description: 'Nabung Reksadana', amount: 500000, type: 'savings', category: 'Investasi Saham/Reksadana' },
  { id: 8, date: '2026-02-28', description: 'Bayar Cicilan Laptop', amount: 823333, type: 'debt', category: 'Cicilan Utang' },
];

const UNITS = [
  'IDR', 'USD', 'SGD', 'EUR', 'AUD', 'JPY', 
  'Emas Antam (g)', 'Emas G24 (g)', 'Dinar KR', 
  'Saham (IDR)', 'Reksadana (IDR)', 'Kripto (IDR)'
];

const INITIAL_RATES = {
  'IDR': 1, 'Saham (IDR)': 1, 'Reksadana (IDR)': 1, 'Kripto (IDR)': 1,
  'USD': 15500, 'SGD': 11800, 'EUR': 17000, 'AUD': 10500, 'JPY': 105,
  'Emas Antam (g)': 1400000, 'Emas G24 (g)': 1395000, 'Dinar KR': 4500000
};

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function App() {
  // Navigation States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plannerTab, setPlannerTab] = useState('budget');
  const [profileTab, setProfileTab] = useState('networth');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('account');

  // User & Auth States
  const [user, setUser] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('Menunggu Inisialisasi...');
  
  // Refs untuk tracking status save
  const isDataLoadedRef = useRef(false);
  const isSavingRef = useRef(false);

  // App States
  const [privacyMode, setPrivacyMode] = useState(false);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [rateSyncStatus, setRateSyncStatus] = useState(null);

  // Filter Date States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data States
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [budgets, setBudgets] = useState(INITIAL_BUDGETS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [assets, setAssets] = useState(INITIAL_ASSETS);

  // Form States & Edit States
  const [newCatType, setNewCatType] = useState('spending');
  const [newCatName, setNewCatName] = useState('');
  
  const [editingBudgetCat, setEditingBudgetCat] = useState(null);
  const [editingBudgetLimit, setEditingBudgetLimit] = useState('');
  const [newBudgetCat, setNewBudgetCat] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAsset, setEditingAsset] = useState({ name: '', category: 'Bank Cash', unit: 'IDR', quantity: '' });
  const [newAsset, setNewAsset] = useState({ name: '', category: 'Bank Cash', unit: 'IDR', quantity: '' });

  // =====================================================================
  // FIREBASE EFFECTS & LOGIC
  // =====================================================================

  // ✅ FIX 1: Prioritaskan Custom Token dari platform jika ada!
  useEffect(() => {
    if (!auth) {
      setCloudSyncStatus('Firebase offline');
      isDataLoadedRef.current = true;
      return;
    }
    
    const initAuth = async () => {
      try {
        setCloudSyncStatus('Mengecek koneksi...');
        // Wajib menggunakan custom token untuk bypass rule security
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { 
        console.error("Auth init error:", e);
        setCloudSyncStatus('Mode Lokal Aktif');
        isDataLoadedRef.current = true; 
      }
    };
    
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setCloudSyncStatus(
          currentUser.isAnonymous 
            ? 'Mode Lokal (Tersimpan di Cloud Platform)' 
            : 'Tersambung Akun Google'
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ FIX 2: Listener data Firestore (onSnapshot)
  useEffect(() => {
    if (!user || !db) return;

    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'appData', 'state');
    setCloudSyncStatus('Memuat data...');

    const applyCloudData = (data) => {
      if (data.transactions) setTransactions(data.transactions);
      if (data.categories) setCategories(data.categories);
      if (data.budgets) setBudgets(data.budgets);
      if (data.goals) setGoals(data.goals);
      if (data.debts) setDebts(data.debts);
      if (data.assets) setAssets(data.assets);
      if (data.rates) setRates(data.rates);
    };

    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        // Abaikan update jika ini adalah pantulan dari data yang baru kita tulis
        if (docSnap.metadata.hasPendingWrites) return;

        if (!isDataLoadedRef.current) {
          // Load pertama kali
          if (docSnap.exists()) {
            applyCloudData(docSnap.data());
          }
          isDataLoadedRef.current = true;
          setCloudSyncStatus('Tersinkronisasi ✓');
        } else if (!isSavingRef.current && !docSnap.metadata.fromCache) {
          // Update dari perangkat LAIN
          if (docSnap.exists()) {
            applyCloudData(docSnap.data());
            setCloudSyncStatus('Disinkronkan dari perangkat lain ✓');
            setTimeout(() => setCloudSyncStatus('Tersinkronisasi ✓'), 3000);
          }
        }
      },
      (error) => {
        console.error("Realtime listener error:", error);
        isDataLoadedRef.current = true;
        setCloudSyncStatus('Mode Lokal (Gagal mengambil dari cloud)');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ✅ FIX 3: Auto-save debouncer
  useEffect(() => {
    if (!user || !db || !isDataLoadedRef.current) return;

    const timer = setTimeout(async () => {
      isSavingRef.current = true;
      setCloudSyncStatus('Menyimpan...');
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'appData', 'state');
        await setDoc(docRef, {
          transactions, categories, budgets, goals, debts, assets, rates
        }, { merge: true });
        setCloudSyncStatus('Tersinkronisasi ✓');
      } catch (error) {
        console.error("Save Data Error:", error);
        setCloudSyncStatus('Gagal menyimpan: ' + error.message);
      } finally {
        setTimeout(() => { isSavingRef.current = false; }, 1500);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [transactions, categories, budgets, goals, debts, assets, rates, user]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    if (!auth) return;
    triggerHaptic(20);
    const provider = new GoogleAuthProvider();
    try {
      setCloudSyncStatus('Menyambungkan Google...');
      isDataLoadedRef.current = false;
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Login Error:", err);
      isDataLoadedRef.current = true;
      setCloudSyncStatus('Gagal Google Login: ' + err.message);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!auth) return;
    triggerHaptic(20);
    try {
      setCloudSyncStatus('Proses keluar...');
      isDataLoadedRef.current = false;
      await signOut(auth);
      // Coba re-authenticate custom token
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (err) {
      console.error("Logout Error:", err);
      isDataLoadedRef.current = true;
    }
  };

  // Live Exchange API
  const fetchLiveRates = async () => {
    setIsFetchingRates(true);
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      const idrRate = data.rates.IDR;
      setRates(prev => ({
        ...prev,
        USD: idrRate,
        SGD: idrRate / data.rates.SGD,
        EUR: idrRate / data.rates.EUR,
        AUD: idrRate / data.rates.AUD,
        JPY: idrRate / data.rates.JPY,
      }));
      setRateSyncStatus('success');
    } catch (err) {
      setRateSyncStatus('error');
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleRateChange = (key, value) => {
    const numVal = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setRates(prev => ({ ...prev, [key]: numVal }));
  };

  useEffect(() => {
    fetchLiveRates();
    const interval = setInterval(() => { fetchLiveRates(); }, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tabName) => { triggerHaptic(10); setActiveTab(tabName); };
  const handlePlannerTabChange = (tabName) => { triggerHaptic(10); setPlannerTab(tabName); };
  const handleProfileTabChange = (tabName) => { triggerHaptic(10); setProfileTab(tabName); };
  const handleSettingsTabChange = (tabName) => { triggerHaptic(10); setSettingsTab(tabName); };

  // --- CALCULATIONS & FILTERING ---
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(number);
  };

  const displayMoney = (val, isPrefix = false) => {
    if (privacyMode) return isPrefix ? 'Rp ***' : 'Rp ********';
    return formatRupiah(val);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedMonth === 'all' && selectedYear === 'all') return true;
      const tDate = new Date(t.date);
      const mMatch = selectedMonth === 'all' || (tDate.getMonth() + 1) === parseInt(selectedMonth);
      const yMatch = selectedYear === 'all' || tDate.getFullYear() === parseInt(selectedYear);
      return mMatch && yMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    let income = 0; let expense = 0; let savings = 0; let debtPaid = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'spending' || t.type === 'bills') expense += t.amount;
      else if (t.type === 'savings') savings += t.amount;
      else if (t.type === 'debt') debtPaid += t.amount;
    });
    return { balance: income - expense - savings - debtPaid, income, expense, savings, debtPaid };
  }, [filteredTransactions]);

  const categorySpending = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'spending' || t.type === 'bills');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const getAssetValueInIDR = (asset) => {
    if (!asset.unit || asset.unit === 'IDR') return asset.quantity !== undefined ? asset.quantity : asset.amount;
    const rate = rates[asset.unit] || 1;
    return (asset.quantity !== undefined ? asset.quantity : asset.amount || 0) * rate;
  };

  const totalGeneralAssets = useMemo(() => assets.reduce((sum, asset) => sum + getAssetValueInIDR(asset), 0), [assets, rates]);
  
  const totalGoalsAssets = useMemo(() => {
    return goals.reduce((sum, goal) => {
      const goalTotal = goal.assets.reduce((assetSum, a) => assetSum + getAssetValueInIDR(a), 0);
      return sum + goalTotal;
    }, 0);
  }, [goals, rates]);

  const totalDebtAmount = useMemo(() => {
    return debts.reduce((sum, d) => sum + (d.type === 'debt' ? d.total - d.paid : 0), 0);
  }, [debts]);

  const totalGrossWealth = totalGeneralAssets + totalGoalsAssets;
  const totalNetWorth = totalGrossWealth - totalDebtAmount;

  const assetRecap = useMemo(() => {
    const recap = {};
    assets.forEach(a => {
      const unit = a.unit || 'IDR';
      recap[unit] = (recap[unit] || 0) + getAssetValueInIDR(a);
    });
    goals.forEach(g => {
      g.assets.forEach(a => {
        const unit = a.unit || 'IDR';
        recap[unit] = (recap[unit] || 0) + getAssetValueInIDR(a);
      });
    });
    return Object.entries(recap)
      .map(([unit, totalIDR]) => ({ unit, totalIDR }))
      .sort((a, b) => b.totalIDR - a.totalIDR);
  }, [assets, goals, rates]);

  const availableYears = useMemo(() => {
    const years = transactions.map(t => new Date(t.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [transactions]);

  // --- GOALS HANDLERS ---
  const toggleGoalCollapse = (goalId) => {
    triggerHaptic(10);
    setGoals(goals.map(g => g.id === goalId ? { ...g, collapsed: !g.collapsed } : g));
  };
  const updateGoal = (goalId, field, value) => setGoals(goals.map(g => g.id === goalId ? { ...g, [field]: value } : g));
  const addGoalAsset = (goalId) => {
    triggerHaptic(10);
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, assets: [...g.assets, { id: Date.now(), name: '', unit: 'IDR', amount: 0 }] }));
  };
  const updateGoalAsset = (goalId, assetId, field, value) => setGoals(goals.map(g => g.id !== goalId ? g : { ...g, assets: g.assets.map(a => a.id === assetId ? { ...a, [field]: value } : a) }));
  const removeGoalAsset = (goalId, assetId) => {
    triggerHaptic(10);
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, assets: g.assets.filter(a => a.id !== assetId) }));
  };

  // --- VIEW RENDERERS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Wallet className="w-48 h-48 -rotate-12 transform translate-x-10 -translate-y-10" />
        </div>
        
        <div className="relative z-10">
          <p className="text-slate-400 font-medium mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sisa Uang Bulan Ini (Free Money)
          </p>
          <h3 className="text-4xl md:text-5xl font-black tracking-tight">{displayMoney(summary.balance)}</h3>
          <p className="text-sm text-slate-500 mt-2">Dari total income {displayMoney(summary.income)}</p>
        </div>

        <div className="w-full md:w-64 space-y-3 relative z-10 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
           <div className="flex justify-between text-xs font-bold mb-1">
             <span className="text-emerald-400">IN</span>
             <span className="text-rose-400">OUT</span>
           </div>
           
           <div className="w-full bg-slate-800 rounded-full h-3 flex overflow-hidden">
             {summary.income > 0 ? (
               <>
                 <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.max(10, ((summary.income - summary.expense - summary.savings - summary.debtPaid) / summary.income) * 100)}%` }}></div>
                 <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(summary.savings / summary.income) * 100}%` }}></div>
                 <div className="bg-orange-500 h-full transition-all" style={{ width: `${(summary.debtPaid / summary.income) * 100}%` }}></div>
                 <div className="bg-rose-500 h-full transition-all" style={{ width: `${(summary.expense / summary.income) * 100}%` }}></div>
               </>
             ) : (
               <div className="bg-slate-700 w-full h-full"></div>
             )}
           </div>

           <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sisa Uang</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Pengeluaran</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Tabungan</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Cicilan</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-bold">Spending & Bills</p>
            <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{displayMoney(summary.expense)}</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-bold">Saved / Invested</p>
            <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><PiggyBank className="w-4 h-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{displayMoney(summary.savings)}</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-bold">Debt Paid</p>
            <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><CreditCard className="w-4 h-4" /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{displayMoney(summary.debtPaid)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-rose-500" /> Analisa Pengeluaran
             </h3>
           </div>
           
           <div className="space-y-5">
             {categorySpending.length > 0 ? categorySpending.slice(0, 5).map((cat, idx) => {
               const maxSpending = categorySpending[0].amount;
               const percentage = Math.max(5, (cat.amount / maxSpending) * 100);
               return (
                 <div key={idx} className="relative">
                   <div className="flex justify-between text-sm mb-1.5 z-10 relative">
                     <span className="font-bold text-slate-700">{cat.name}</span>
                     <span className="text-slate-600 font-medium">{displayMoney(cat.amount)}</span>
                   </div>
                   <div className="w-full bg-slate-50 rounded-lg h-8 relative overflow-hidden border border-slate-100">
                     <div 
                       className="bg-rose-100/80 h-full rounded-r-lg border-r-2 border-rose-400 absolute left-0 top-0 transition-all duration-1000 ease-out" 
                       style={{ width: `${percentage}%` }}
                     ></div>
                   </div>
                 </div>
               )
             }) : (
               <div className="text-center py-10 text-slate-400">
                 <PieChart className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                 <p className="text-sm font-medium">Belum ada pengeluaran di periode ini.</p>
               </div>
             )}
           </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-slate-400" /> Transaksi Terakhir
            </h3>
            <button onClick={() => handleTabChange('transactions')} className="text-sm text-emerald-600 hover:underline font-bold bg-emerald-50 px-3 py-1 rounded-lg">Lihat Semua</button>
          </div>
          
          <div className="space-y-3 flex-1">
            {filteredTransactions.length > 0 ? filteredTransactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center p-3 border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 
                    t.type === 'savings' ? 'bg-indigo-100 text-indigo-600' :
                    t.type === 'debt' ? 'bg-orange-100 text-orange-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {t.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : 
                     t.type === 'savings' ? <PiggyBank className="w-5 h-5" /> : 
                     <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{t.description}</p>
                    <p className="text-xs text-slate-500 font-medium">{t.category} • {new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                  </div>
                </div>
                <span className={`font-black text-sm ${
                  t.type === 'income' ? 'text-emerald-600' : 
                  t.type === 'savings' ? 'text-indigo-600' : 'text-slate-800'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{displayMoney(t.amount)}
                </span>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400 h-full flex flex-col justify-center">
                 <p className="text-sm font-medium">Tidak ada transaksi.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
       <div className="overflow-x-auto">
         <table className="w-full text-left border-collapse">
           <thead>
             <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
               <th className="p-4 font-bold">Tanggal</th>
               <th className="p-4 font-bold">Deskripsi</th>
               <th className="p-4 font-bold">Kategori</th>
               <th className="p-4 font-bold">Tipe</th>
               <th className="p-4 font-bold text-right">Nominal</th>
               <th className="p-4 font-bold text-center">Aksi</th>
             </tr>
           </thead>
           <tbody>
             {filteredTransactions.map((t) => (
               <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                 <td className="p-4 text-sm text-slate-500 whitespace-nowrap font-medium">{t.date}</td>
                 <td className="p-4 text-sm font-bold text-slate-800">{t.description}</td>
                 <td className="p-4 text-sm">
                   <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200">
                     {t.category}
                   </span>
                 </td>
                 <td className="p-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                      t.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                      t.type === 'spending' ? 'bg-rose-50 text-rose-600' :
                      t.type === 'savings' ? 'bg-indigo-50 text-indigo-600' :
                      t.type === 'bills' ? 'bg-orange-50 text-orange-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {t.type}
                    </span>
                 </td>
                 <td className={`p-4 text-sm font-black text-right whitespace-nowrap ${
                   t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                 }`}>
                   {t.type === 'income' ? '+' : '-'}{displayMoney(t.amount)}
                 </td>
                 <td className="p-4 text-center">
                   <button
                     onClick={() => {
                       triggerHaptic(15);
                       setTransactions(prev => prev.filter(tx => tx.id !== t.id));
                     }}
                     className="p-1.5 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                     title="Hapus Transaksi"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </td>
               </tr>
             ))}
             {filteredTransactions.length === 0 && (
               <tr>
                 <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                   Tidak ada data transaksi pada periode ini.
                 </td>
               </tr>
             )}
           </tbody>
         </table>
       </div>
    </div>
  );

  const renderPlanner = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex bg-slate-200/50 p-1.5 rounded-xl w-full md:w-fit mx-auto md:mx-0">
        <button onClick={() => handlePlannerTabChange('budget')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${plannerTab === 'budget' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>Budget & Tagihan</button>
        <button onClick={() => handlePlannerTabChange('goals')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${plannerTab === 'goals' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Tujuan & Hutang</button>
      </div>

      {plannerTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-8 duration-300">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
              <PieChart className="w-5 h-5 text-rose-500" /> Budget Bulanan
            </h3>
            <div className="space-y-6">
              {Object.entries(budgets).map(([category, limit]) => {
                const spent = categorySpending.find(c => c.name === category)?.amount || 0;
                const percentage = Math.min(100, (spent / limit) * 100);
                const isOver = spent > limit;
                
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-slate-700">{category}</span>
                      <span className="text-slate-500 font-medium">
                        <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>{displayMoney(spent)}</span> / {displayMoney(limit)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : percentage > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    {isOver && <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Over budget!</p>}
                  </div>
                );
              })}
              {Object.keys(budgets).length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada budget diatur.</p>}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm h-fit">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
              <Receipt className="w-5 h-5 text-orange-500" /> Tagihan & Langganan (Bills)
            </h3>
            <div className="space-y-4">
              {filteredTransactions.filter(t => t.type === 'bills').length > 0 ? (
                filteredTransactions.filter(t => t.type === 'bills').map(t => (
                  <div key={t.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{t.description}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{t.category} • {new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                    </div>
                    <span className="font-black text-slate-800">{displayMoney(t.amount)}</span>
                  </div>
                ))
              ) : (
                 <p className="text-slate-400 font-medium text-sm text-center py-6">Belum ada tagihan terbayar periode ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {plannerTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-left-8 duration-300">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm mb-6 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Target className="w-5 h-5 text-indigo-500" /> Tujuan & Sinking Funds
              </h3>
            </div>

            {goals.map(goal => {
              const goalTotal = goal.assets.reduce((sum, a) => sum + getAssetValueInIDR(a), 0);
              const percentage = Math.min(100, goal.target > 0 ? (goalTotal / goal.target) * 100 : 0);

              return (
                <div key={goal.id} className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm transition-all relative">
                  <button 
                    onClick={() => {
                      triggerHaptic(15);
                      setGoals(goals.filter(g => g.id !== goal.id));
                    }} 
                    className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-full z-10 transition-colors"
                    title="Hapus Tujuan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between gap-4 cursor-pointer group pr-10" onClick={() => toggleGoalCollapse(goal.id)}>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <input
                        type="text"
                        className="bg-transparent border-none text-xl font-black text-slate-900 outline-none p-0 w-full mb-1 focus:ring-0"
                        value={goal.name}
                        onChange={(e) => updateGoal(goal.id, 'name', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Nama Tujuan..."
                      />
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Target Dana:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type={privacyMode ? "password" : "text"}
                            className="w-24 bg-transparent border-none text-right text-sm font-bold text-slate-800 outline-none p-0 focus:text-indigo-500 border-b border-dashed border-transparent focus:border-indigo-500"
                            value={privacyMode ? "********" : goal.target}
                            onChange={(e) => updateGoal(goal.id, 'target', e.target.value.replace(/\D/g, ''))}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 flex items-center mb-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${percentage >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Terkumpul: <span className="text-emerald-500">{displayMoney(goalTotal, true)}</span>
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition transform ${goal.collapsed ? 'rotate-180' : ''}`}>
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>

                  {!goal.collapsed && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Layers className="w-4 h-4" /> Aset Disimpan
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {goal.assets.map(asset => {
                          const equivIDR = getAssetValueInIDR(asset);
                          return (
                            <div key={asset.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                  <Landmark className="w-5 h-5 text-indigo-500" />
                                </div>
                                <input
                                  type="text"
                                  className="w-full bg-transparent border-none text-sm font-semibold text-slate-800 outline-none p-0 focus:ring-0"
                                  value={asset.name}
                                  onChange={(e) => updateGoalAsset(goal.id, asset.id, 'name', e.target.value)}
                                  placeholder="Nama Aset..."
                                />
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 sm:justify-end">
                                <div className="flex flex-col items-end">
                                  <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-500 transition">
                                    <input
                                      type={privacyMode ? "password" : "number"}
                                      className="w-24 bg-transparent text-right text-sm font-bold outline-none px-2 py-1.5"
                                      value={privacyMode ? "12345678" : (asset.quantity !== undefined ? asset.quantity : asset.amount)}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateGoalAsset(goal.id, asset.id, 'quantity', val);
                                        updateGoalAsset(goal.id, asset.id, 'amount', val);
                                      }}
                                      placeholder="0"
                                    />
                                    <select
                                      className="bg-slate-100 text-[10px] font-bold border-l border-slate-200 outline-none px-2 cursor-pointer max-w-[80px]"
                                      value={asset.unit}
                                      onChange={(e) => updateGoalAsset(goal.id, asset.id, 'unit', e.target.value)}
                                    >
                                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                  {asset.unit !== 'IDR' && (
                                    <div className="text-[10px] text-slate-400 mt-0.5 h-3 font-semibold">
                                      ≈ {displayMoney(equivIDR)}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeGoalAsset(goal.id, asset.id)}
                                  className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        {goal.assets.length === 0 && (
                          <div className="text-center py-4 text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            Belum ada aset ditambahkan.
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => addGoalAsset(goal.id)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 transition flex justify-center items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Tambah Catatan Aset
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                triggerHaptic(20);
                setGoals([...goals, { id: Date.now(), name: 'Tujuan Baru', target: 0, collapsed: false, assets: [] }]);
              }}
              className="w-full bg-indigo-50 hover:bg-indigo-100 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold py-4 rounded-[2rem] flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5" /> Tambah Tujuan Tabungan
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm h-fit">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
              <CreditCard className="w-5 h-5 text-rose-500" /> Hutang & Piutang
            </h3>
            <div className="space-y-4">
              {debts.map(debt => {
                const sisa = debt.total - debt.paid;
                const isDebt = debt.type === 'debt';
                return (
                  <div key={debt.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 relative">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{debt.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                        isDebt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isDebt ? 'Hutang' : 'Piutang'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block text-[11px] text-slate-500 font-medium mb-1">Total {isDebt ? 'Pinjaman' : 'Diberikan'}</span>
                        <span className="font-black text-slate-800">{displayMoney(debt.total)}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block text-[11px] text-slate-500 font-medium mb-1">Sisa {isDebt ? 'Hutang' : 'Tagihan'}</span>
                        <span className={`font-black ${isDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {displayMoney(sisa)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {debts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada catatan hutang/piutang.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex bg-slate-200/50 p-1.5 rounded-xl w-full md:w-fit mx-auto md:mx-0">
        <button onClick={() => handleProfileTabChange('networth')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${profileTab === 'networth' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>Net Worth Aset</button>
        <button onClick={() => handleProfileTabChange('settings')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${profileTab === 'settings' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Pengaturan Data</button>
      </div>

      {profileTab === 'networth' && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="bg-emerald-900 text-white p-8 rounded-[2rem] shadow-sm text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10">
              <Landmark className="w-48 h-48" />
            </div>
            <p className="text-emerald-200 text-sm font-bold mb-2 relative z-10 uppercase tracking-widest">Kekayaan Bersih (Net Worth)</p>
            <h2 className="text-4xl md:text-5xl font-black relative z-10 tracking-tight">{displayMoney(totalNetWorth)}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm h-fit">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                  <PieChart className="w-5 h-5 text-emerald-500" /> Rekapitulasi Aset
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {assetRecap.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{item.unit}</span>
                      <span className="font-black text-slate-800 text-sm">{displayMoney(item.totalIDR)}</span>
                    </div>
                  ))}
                  {assetRecap.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-slate-400 py-4 font-medium border-2 border-dashed border-slate-100 rounded-xl">Belum ada aset tercatat.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm h-fit">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                  <Activity className="w-5 h-5 text-indigo-500" /> Skor Kesehatan Finansial
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-sm font-semibold text-slate-600">Rasio Hutang</div>
                      <div className="text-sm font-black">{((totalGrossWealth > 0 ? (totalDebtAmount / totalGrossWealth) * 100 : (totalDebtAmount > 0 ? 100 : 0))).toFixed(1)}%</div>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 left-[30%] border-r-2 border-dashed border-slate-400 z-10"></div>
                      <div className="absolute top-0 bottom-0 left-[50%] border-r-2 border-dashed border-slate-400 z-10"></div>
                      <div 
                        className={`h-full transition-all duration-500 ${(totalGrossWealth > 0 ? (totalDebtAmount / totalGrossWealth) * 100 : 0) <= 30 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min((totalGrossWealth > 0 ? (totalDebtAmount / totalGrossWealth) * 100 : (totalDebtAmount > 0 ? 100 : 0)), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-sm font-semibold text-slate-600">Diversifikasi Aset</div>
                      <div className="text-sm font-black">{new Set([...assets.filter(a => a.amount > 0 || a.quantity > 0).map(a => a.category), ...goals.flatMap(g => g.assets.filter(a => a.amount > 0 || a.quantity > 0).map(a => a.unit))]).size} Kategori</div>
                    </div>
                    <div className="flex gap-1 h-3">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-full ${i < new Set([...assets.filter(a => a.amount > 0 || a.quantity > 0).map(a => a.category), ...goals.flatMap(g => g.assets.filter(a => a.amount > 0 || a.quantity > 0).map(a => a.unit))]).size ? 'bg-indigo-500' : 'bg-slate-100'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden h-fit">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">Detail Rekening Utama</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4 font-bold">Nama Rekening</th>
                    <th className="p-4 font-bold text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">
                        {asset.name}
                        <span className="block text-[10px] text-slate-500">{asset.category}</span>
                      </td>
                      <td className="p-4 text-sm font-black text-emerald-600 text-right">
                        <span className="block">{displayMoney(getAssetValueInIDR(asset))}</span>
                        {asset.unit !== 'IDR' && <span className="text-[10px] text-slate-400 font-semibold">{asset.quantity !== undefined ? asset.quantity : asset.amount} {asset.unit}</span>}
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr><td colSpan="2" className="p-4 text-center text-sm text-slate-500">Belum ada aset ditambahkan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {profileTab === 'settings' && (
        <div className="space-y-6 animate-in slide-in-from-left-8 duration-300">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar border-b border-slate-200 pb-2">
            {[
              { id: 'account', label: 'Akun & Sync' },
              { id: 'categories', label: 'Kategori Cashflow' },
              { id: 'budgets', label: 'Limit Budget' },
              { id: 'assets', label: 'Rekening Utama' },
              { id: 'rates', label: 'Nilai Tukar Valas' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => handleSettingsTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all ${
                  settingsTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {settingsTab === 'account' && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Cloud className="w-5 h-5 text-indigo-500"/> Cloud Sync & Akun</h3>
               
               {!user || user.isAnonymous ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                     <p className="text-sm text-slate-500 mb-6 font-medium max-w-sm mx-auto">Masuk dengan Google untuk menyimpan data finansial Anda secara permanen di Cloud dan sinkron antar perangkat.</p>
                     <button onClick={handleGoogleLogin} className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors inline-flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95">
                       <LogIn className="w-4 h-4" /> Masuk dengan Google
                     </button>
                  </div>
               ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-14 h-14 rounded-full border-4 border-white shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl border-4 border-white shadow-sm">{user.displayName ? user.displayName[0] : 'U'}</div>
                        )}
                        <div>
                          <p className="font-black text-slate-800 text-lg">{user.displayName || 'Pengguna Loka'}</p>
                          <p className="text-xs text-slate-500 font-medium">{user.email || 'Mode Guest Platform'}</p>
                        </div>
                     </div>
                     <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-5 py-3 rounded-xl hover:bg-rose-100 transition-colors font-bold text-sm flex items-center gap-2 w-full md:w-auto justify-center">
                       <LogOut className="w-4 h-4" /> Keluar Akun
                     </button>
                  </div>
               )}
               
               <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase">Status Sinkronisasi</span>
                    <span className="text-[10px] text-slate-400 font-medium">Data Anda aman dan terenkripsi</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{cloudSyncStatus}</span>
               </div>
            </div>
          )}

          {settingsTab === 'rates' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" /> Live Exchange API (Valas)
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Sinkronisasi Kurs Mata Uang</p>
                    <p className="text-[10px] text-slate-500 font-medium">Mendukung USD, SGD, EUR, AUD, JPY vs IDR (Sinkron Otomatis Tiap 5 Menit).</p>
                  </div>
                  <button
                    onClick={() => { triggerHaptic(15); fetchLiveRates(); }}
                    disabled={isFetchingRates}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    {isFetchingRates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {isFetchingRates ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                  </button>
                </div>
                
                {rateSyncStatus === 'success' && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-600 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Sinkronisasi Sukses (Otomatis Aktif)
                  </div>
                )}
                {rateSyncStatus === 'error' && (
                  <div className="mt-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-600 text-sm font-bold flex items-center gap-2">
                    <WifiOff className="w-4 h-4" /> Mode Offline / Gagal Sinkronisasi
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                  {['USD', 'SGD', 'EUR', 'AUD', 'JPY'].map(currency => (
                    <div key={currency} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">{currency}</p>
                      <p className="font-black text-slate-800 text-sm">{formatRupiah(rates[currency] || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" /> Harga Manual Emas (IDR)
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Antam / g <a href="https://www.logammulia.com/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Cek</a></label>
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800" value={(rates['Emas Antam (g)'] || 0).toLocaleString('id-ID')} onChange={(e) => handleRateChange('Emas Antam (g)', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Galeri24 / g <a href="https://galeri24.co.id/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Cek</a></label>
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800" value={(rates['Emas G24 (g)'] || 0).toLocaleString('id-ID')} onChange={(e) => handleRateChange('Emas G24 (g)', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Dinar KR <a href="https://dinarkr.com/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Cek</a></label>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800" value={(rates['Dinar KR'] || 0).toLocaleString('id-ID')} onChange={(e) => handleRateChange('Dinar KR', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'categories' && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-500"/> Atur Kategori Cashflow</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(categories).map(([type, list]) => (
                    <div key={type}>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 bg-slate-50 p-2 rounded-lg">{type}</h4>
                      <div className="flex flex-wrap gap-2">
                        {list.map(cat => (
                          <div key={cat} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
                            <span className="font-bold text-slate-700">{cat}</span>
                            <button onClick={() => { triggerHaptic(15); setCategories({...categories, [type]: categories[type].filter(c => c !== cat)}); }} className="text-slate-400 hover:text-rose-500 ml-1"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
               <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Tambah Kategori Baru</h4>
                  <div className="flex flex-col md:flex-row gap-3">
                    <select className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={newCatType} onChange={e => setNewCatType(e.target.value)}>
                      <option value="income">Income</option>
                      <option value="spending">Spending</option>
                      <option value="bills">Bills</option>
                      <option value="savings">Savings</option>
                      <option value="debt">Debt</option>
                    </select>
                    <input type="text" placeholder="Nama Kategori" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newCatName} onChange={e => setNewCatName(e.target.value)}/>
                    <button onClick={() => { if(newCatName) { triggerHaptic(20); setCategories({...categories, [newCatType]: [...categories[newCatType], newCatName]}); setNewCatName(''); }}} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20">Tambah</button>
                  </div>
               </div>
            </div>
          )}

          {settingsTab === 'budgets' && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-rose-500"/> Atur Budget Bulanan</h3>
               <div className="space-y-3 mb-8">
                 {Object.entries(budgets).map(([cat, limit]) => {
                   const isEditing = editingBudgetCat === cat;
                   return (
                     <div key={cat} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50">
                        <span className="font-bold text-slate-700">{cat}</span>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input type="number" className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:outline-none" value={editingBudgetLimit} onChange={e => setEditingBudgetLimit(e.target.value)} />
                              <button onClick={() => { triggerHaptic(20); setBudgets({ ...budgets, [cat]: Number(editingBudgetLimit) }); setEditingBudgetCat(null); }} className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => { triggerHaptic(10); setEditingBudgetCat(null); }} className="p-1 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900">{formatRupiah(limit)}</span>
                              <button onClick={() => { triggerHaptic(10); setEditingBudgetCat(cat); setEditingBudgetLimit(limit.toString()); }} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-md border border-slate-200"><Settings className="w-4 h-4" /></button>
                              <button onClick={() => { triggerHaptic(15); const newB = {...budgets}; delete newB[cat]; setBudgets(newB); }} className="text-rose-400 hover:text-rose-600 p-1 bg-white rounded-md border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                     </div>
                   );
                 })}
                 {Object.keys(budgets).length === 0 && <p className="text-sm text-slate-500 font-medium">Belum ada budget diatur.</p>}
               </div>
               <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Buat Budget Baru</h4>
                  <div className="flex flex-col md:flex-row gap-3">
                    <select className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex-1" value={newBudgetCat} onChange={e => setNewBudgetCat(e.target.value)}>
                      <option value="">-- Pilih Kategori --</option>
                      {[...categories.spending, ...categories.bills].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="number" placeholder="Nominal Limit (Rp)" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newBudgetLimit} onChange={e => setNewBudgetLimit(e.target.value)}/>
                    <button onClick={() => { if(newBudgetCat && newBudgetLimit) { triggerHaptic(20); setBudgets({...budgets, [newBudgetCat]: Number(newBudgetLimit)}); setNewBudgetCat(''); setNewBudgetLimit(''); }}} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20">Simpan</button>
                  </div>
               </div>
            </div>
          )}

          {settingsTab === 'assets' && (
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Landmark className="w-5 h-5 text-emerald-500"/> Atur Rekening Utama</h3>
               <div className="space-y-3 mb-8">
                 {assets.map(asset => {
                   const isEditing = editingAssetId === asset.id;
                   return (
                     <div key={asset.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col gap-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input type="text" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none" value={editingAsset.name} onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })} placeholder="Nama Kas / Bank" />
                              <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none" value={editingAsset.category} onChange={e => setEditingAsset({ ...editingAsset, category: e.target.value })}>
                                <option value="On Hand Cash">On Hand Cash</option>
                                <option value="Bank Cash">Bank Cash</option>
                                <option value="Investasi">Investasi</option>
                                <option value="Aset Fisik">Aset Fisik</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none" value={editingAsset.unit} onChange={e => setEditingAsset({ ...editingAsset, unit: e.target.value })}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                              <input type="number" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none" value={editingAsset.quantity} onChange={e => setEditingAsset({ ...editingAsset, quantity: e.target.value })} placeholder="Saldo/Kuantitas" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { triggerHaptic(20); setAssets(assets.map(a => a.id === asset.id ? { ...editingAsset, id: asset.id, amount: Number(editingAsset.quantity), quantity: Number(editingAsset.quantity) } : a)); setEditingAssetId(null); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Simpan</button>
                              <button onClick={() => { triggerHaptic(10); setEditingAssetId(null); }} className="px-3 py-1.5 bg-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-400">Batal</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                              <p className="font-bold text-slate-800">{asset.name}</p>
                              <p className="text-xs font-bold text-slate-500 mt-0.5">{asset.category}</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              <div className="text-right">
                                <span className="block font-black text-emerald-600">{displayMoney(getAssetValueInIDR(asset))}</span>
                                {asset.unit && asset.unit !== 'IDR' && <span className="text-[10px] font-bold text-slate-400">{asset.quantity !== undefined ? asset.quantity : asset.amount} {asset.unit}</span>}
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => { triggerHaptic(10); setEditingAssetId(asset.id); setEditingAsset({ name: asset.name, category: asset.category, unit: asset.unit || 'IDR', quantity: asset.quantity !== undefined ? asset.quantity : asset.amount }); }} className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-md border border-slate-200"><Settings className="w-4 h-4" /></button>
                                <button onClick={() => { triggerHaptic(15); setAssets(assets.filter(a => a.id !== asset.id)); }} className="text-rose-400 hover:text-rose-600 p-1.5 bg-white rounded-md border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>
               <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Tambah Kas / Rekening Baru</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
                    <input type="text" placeholder="Nama Bank / Aset" className="lg:col-span-4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})}/>
                    <select className="lg:col-span-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})}>
                      <option value="On Hand Cash">On Hand Cash</option>
                      <option value="Bank Cash">Bank Cash</option>
                      <option value="Investasi">Investasi</option>
                      <option value="Aset Fisik">Aset Fisik</option>
                    </select>
                    <select className="lg:col-span-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newAsset.unit} onChange={e => setNewAsset({...newAsset, unit: e.target.value})}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" placeholder="Saldo/Kuantitas" className="lg:col-span-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" value={newAsset.quantity} onChange={e => setNewAsset({...newAsset, quantity: e.target.value})}/>
                    <button onClick={() => { if(newAsset.name && newAsset.quantity) { triggerHaptic(20); setAssets([...assets, { ...newAsset, id: Date.now(), quantity: Number(newAsset.quantity) }]); setNewAsset({ name: '', category: 'Bank Cash', unit: 'IDR', quantity: '' }); }}} className="lg:col-span-12 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20">Tambah Aset Baru</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-24 md:pb-28">
      
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-xl flex items-center justify-center">
             <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 leading-tight">Loka Planner</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-wider hidden sm:block">ULTIMATE FINANCIAL TRACKER</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
           <button 
              onClick={() => { triggerHaptic(10); setPrivacyMode(!privacyMode); }}
              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title={privacyMode ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
            >
              {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

           <div 
             onClick={() => { handleTabChange('profile'); handleProfileTabChange('settings'); handleSettingsTabChange('account'); }} 
             className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden border-2 border-emerald-500 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
           >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-emerald-600" />
              )}
           </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            {activeTab === 'dashboard' ? 'Beranda' : 
             activeTab === 'transactions' ? 'Riwayat Cashflow' : 
             activeTab === 'planner' ? 'Perencanaan' : 'Profil & Aset'}
          </h2>
          
          {(activeTab === 'dashboard' || activeTab === 'transactions') && (
            <div className="flex items-center gap-2">
              <div className="bg-white border border-slate-200 rounded-xl flex items-center px-3 shadow-sm py-1">
                <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => { triggerHaptic(10); setSelectedMonth(e.target.value); }}
                  className="bg-transparent text-sm font-bold text-slate-700 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Bulan</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl flex items-center px-3 shadow-sm py-1">
                <select 
                  value={selectedYear} 
                  onChange={(e) => { triggerHaptic(10); setSelectedYear(e.target.value); }}
                  className="bg-transparent text-sm font-bold text-slate-700 py-2 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all">Semua Tahun</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                  {!availableYears.includes(new Date().getFullYear()) && (
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'planner' && renderPlanner()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto px-6 py-2 flex justify-between items-center relative">
          <button onClick={() => handleTabChange('dashboard')} className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">Beranda</span>
          </button>
          
          <button onClick={() => handleTabChange('transactions')} className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${activeTab === 'transactions' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <ListOrdered className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">Riwayat</span>
          </button>
          
          <div className="relative -top-6">
             <button 
                onClick={() => { triggerHaptic(20); setIsAddModalOpen(true); }} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-xl shadow-emerald-500/40 transform transition active:scale-95 flex items-center justify-center border-4 border-white"
             >
               <Plus className="w-7 h-7" strokeWidth={3} />
             </button>
          </div>

          <button onClick={() => handleTabChange('planner')} className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${activeTab === 'planner' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <PieChart className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">Rencana</span>
          </button>
          
          <button onClick={() => handleTabChange('profile')} className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <User className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">Profil</span>
          </button>
        </div>
      </nav>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex justify-center items-end md:items-center p-0 md:p-4 animate-in fade-in duration-200">
          <TransactionForm 
            onClose={() => { triggerHaptic(10); setIsAddModalOpen(false); }} 
            onSave={(newTx) => {
              triggerHaptic(25);
              setTransactions(prev => [{ ...newTx, id: Date.now() }, ...prev]);
              setIsAddModalOpen(false);
            }} 
            categories={categories}
          />
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}} />
    </div>
  );
}

// --- MODAL FORM COMPONENT ---
function TransactionForm({ onClose, onSave, categories }) {
  const [type, setType] = useState('spending');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(categories.spending[0] || '');
  const [description, setDescription] = useState('');

  const handleTypeChange = (newType) => {
    triggerHaptic(10);
    setType(newType);
    setCategory(categories[newType][0] || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    onSave({ type, amount: Number(amount), date, category, description });
  };

  const TYPE_OPTIONS = [
    { id: 'spending', label: 'Spending' },
    { id: 'bills', label: 'Bills' },
    { id: 'income', label: 'Income' },
    { id: 'savings', label: 'Savings' },
    { id: 'debt', label: 'Debt/Cicilan' }
  ];

  return (
    <div className="bg-white w-full max-w-lg rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xl font-black text-slate-800">Catat Transaksi Baru</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-200 p-2 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Tipe Cashflow</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTypeChange(opt.id)}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all border ${
                  type === opt.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nominal (Rp)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">Rp</span>
            <input 
              type="number" 
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tanggal</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Kategori</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
            >
              {(categories[type] || []).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Keterangan Transaksi</label>
          <input 
            type="text" 
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:font-medium placeholder:text-slate-400"
            placeholder="Contoh: Beli makan siang, Bayar kos..."
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 active:scale-[0.98] mt-4 flex justify-center items-center gap-2"
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
          Simpan Transaksi
        </button>
      </form>
    </div>
  );
}