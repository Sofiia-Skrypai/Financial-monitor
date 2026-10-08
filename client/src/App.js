import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, LogOut, User as UserIcon, Activity, Database, RefreshCcw, X } from 'lucide-react';
import { CurrencyProvider } from './context/CurrencyContext';

import { apiService } from './services/api';

import Auth        from './components/Auth';
import Sidebar     from './components/Sidebar';
import MemberPicker from './components/MemberPicker';
import AddTransactionModal from './components/AddTransactionModal';

import Dashboard from './pages/Dashboard';
import Import    from './pages/Import';
import Pension   from './pages/Pension';
import Compare   from './pages/Compare';
import History   from './pages/History';
import Accounts  from './pages/Accounts';
import Users       from './pages/Users';
import Categories  from './pages/Categories';

function App() {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const RATE_STORAGE_KEY = 'fin_exchange_rates';
  const DEFAULT_RATES    = { USD: 41.5, EUR: 45.0 };
  const getSavedRates    = () => {
    try { return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY)) ?? DEFAULT_RATES; }
    catch { return DEFAULT_RATES; }
  };
  const [rateUSD, setRateUSD] = useState(() => getSavedRates().USD);
  const [rateEUR, setRateEUR] = useState(() => getSavedRates().EUR);

  const saveRates = () => {
    const parsed = { USD: parseFloat(rateUSD) || DEFAULT_RATES.USD, EUR: parseFloat(rateEUR) || DEFAULT_RATES.EUR };
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new Event('fin_rates_updated'));
    setShowRateModal(false);
  };


  const [accountUser, setAccountUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      const account = { id: parsed.id, name: parsed.name, email: parsed.email, role: parsed.role };
      setAccountUser(account);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setUser(null);
    setAccountUser(null);
  };

  const handleSwitchUser = (session) => {
    setUser({ ...session });
  };

  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;

  const canAccessPath = (path) => {
    if (isAdmin) return true;
    if (!user?.activeMemberId) return false;
    const members = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
    const active  = members.find(m => m.id === user.activeMemberId);
    return (active?.grantedPaths || []).includes(path);
  };

  const handleSaveTransaction = async (newEntry) => {
    try {
      await apiService.saveTransaction({
        ...newEntry,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        userName: user.activeMemberName || user.name || user.email,
      });
      setIsModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Помилка збереження:', error);
      alert('Критична помилка синхронізації з базою даних');
    }
  };

  if (loading) return null;

  if (!accountUser && !user) {
    return <Auth onLogin={handleSwitchUser} />;
  }

  if (accountUser && !user) {
    return (
      <MemberPicker
        accountUser={accountUser}
        onPick={handleSwitchUser}
      />
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-[#f8f9fc] font-sans antialiased text-slate-900">

        <Sidebar onLogout={handleLogout} user={user} onSwitchUser={handleSwitchUser} />

        <main className="flex-1 transition-all duration-300">

          {}
          <header className="p-6 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 flex justify-between items-center px-10">
            <div className="flex items-center gap-5">

              {}
              <div className="flex items-center gap-3">
                <svg width="38" height="38" viewBox="0 0 52 52" fill="none">
                  <rect width="52" height="52" rx="13" fill="url(#hdrGrad)"/>
                  <path d="M12 36 L12 22 L20 16 L28 20 L36 12 L40 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="40" cy="16" r="3.5" fill="#fb923c"/>
                  <path d="M12 40 L40 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                  <rect x="14" y="30" width="5" height="10" rx="2" fill="white" fillOpacity="0.5"/>
                  <rect x="23" y="25" width="5" height="15" rx="2" fill="white" fillOpacity="0.7"/>
                  <rect x="32" y="20" width="5" height="20" rx="2" fill="white"/>
                  <defs>
                    <linearGradient id="hdrGrad" x1="0" y1="0" x2="52" y2="52">
                      <stop offset="0%" stopColor="#4338ca"/>
                      <stop offset="100%" stopColor="#f97316"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div>
                  <p className="text-sm font-black text-gray-900 tracking-tight leading-none">FinMonitor</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Smart Finance</p>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-100"></div>

              {}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity size={18} className="text-green-500"/>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Система Активна</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Database size={10} className="text-gray-400"/>
                    <p className="text-[8px] font-bold uppercase text-gray-400 tracking-tighter">API Service Mode</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {}
              <button
                onClick={() => { setRateUSD(getSavedRates().USD); setRateEUR(getSavedRates().EUR); setShowRateModal(true); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] bg-white border border-gray-100 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                title="Встановити курс валют"
              >
                <RefreshCcw size={15}/> Курс валют
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95" style={{ color:'white', background:'linear-gradient(135deg,#f97316,#ea580c)', boxShadow:'0 4px 20px rgba(249,115,22,0.40)' }} onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 28px rgba(249,115,22,0.55)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='0 4px 20px rgba(249,115,22,0.40)'}
              >
                <Plus size={18} strokeWidth={3}/> Новий запис
              </button>

              <div className="h-10 w-px bg-gray-100"></div>

              {}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Session Active</span>
                  <span className="text-sm font-black text-gray-800 tracking-tight italic">
                    {user.activeMemberName || user.name || user.email}
                  </span>
                </div>
                <div className="w-12 h-12 bg-white text-orange-600 rounded-2xl flex items-center justify-center font-black border-2 border-orange-500 shadow-lg shadow-orange-100 transition-transform hover:rotate-6">
                  {(user.activeMemberName || user.name)
                    ? (user.activeMemberName || user.name)[0].toUpperCase()
                    : <UserIcon size={20}/>}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Вийти з системи"
                >
                  <LogOut size={22}/>
                </button>
              </div>
            </div>
          </header>

          {}
          <div className="p-0">
            <Routes>
              <Route path="/"         element={<Dashboard user={user}/>}/>
              <Route path="/accounts" element={<Accounts  user={user}/>}/>
              <Route path="/import"   element={<Import    user={user}/>}/>
              <Route path="/history"  element={<History   user={user}/>}/>
              <Route path="/categories" element={<Categories user={user}/>}/>
              <Route path="/users"    element={canAccessPath('/users')   ? <Users   user={user}/> : <Navigate to="/"/>}/>
              <Route path="/compare"  element={canAccessPath('/compare') ? <Compare user={user}/> : <Navigate to="/"/>}/>
              <Route path="/pension"  element={canAccessPath('/pension') ? <Pension user={user}/> : <Navigate to="/"/>}/>
              <Route path="*"         element={<Navigate to="/"/>}/>
            </Routes>
          </div>
        </main>

        <AddTransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          user={user}
        />

        {}
        {showRateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl relative">
              <button onClick={() => setShowRateModal(false)} className="absolute right-7 top-7 text-gray-300 hover:text-red-500 transition-all">
                <X size={24}/>
              </button>
              <div className="mb-8 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCcw size={26} className="text-indigo-600"/>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">Курс валют</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Встановіть актуальний курс до гривні</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">1 USD → ₴</label>
                  <input
                    type="number" step="0.01" min="1"
                    value={rateUSD}
                    onChange={e => setRateUSD(e.target.value)}
                    className="w-full p-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-xl focus:ring-2 ring-indigo-500 transition-all"
                    placeholder="41.50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">1 EUR → ₴</label>
                  <input
                    type="number" step="0.01" min="1"
                    value={rateEUR}
                    onChange={e => setRateEUR(e.target.value)}
                    className="w-full p-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-xl focus:ring-2 ring-indigo-500 transition-all"
                    placeholder="45.00"
                  />
                </div>
              </div>

              <button
                onClick={saveRates}
                className="w-full mt-8 py-5 bg-black text-white rounded-[25px] font-black uppercase text-xs tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
              >
                Зберегти курс
              </button>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;