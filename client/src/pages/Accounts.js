import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import {
  Plus, MoreVertical, Pencil, Trash2, X, Wallet, Loader,
  CreditCard, Save, Globe, PiggyBank, Lock, Link2, Unlink,
  RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, ChevronDown,
} from 'lucide-react';

const PENSION_STORAGE_KEY = 'fin_pension_savings_local';
const MONO_TOKEN_KEY      = 'mono_token';
const MONO_ACCOUNTS_KEY   = 'mono_accounts';

const monoCardType = (type) => {
  const map = { 0:'Чорна', 1:'Біла', 2:'Platinum', 3:'Iron', 4:'ФОП', 5:'Yellow', 6:'eBoy', 7:'Дитяча', 8:'Iron' };
  return map[type] ?? 'Картка';
};
const monoCardCurrency = (code) => {
  const map = { 980:'UAH', 840:'USD', 978:'EUR', 826:'GBP' };
  return map[code] ?? String(code);
};

const BANKS = [
  {
    name: 'Monobank',
    emoji: '🐱',
    available: true,
    note: 'Пряме підключення через офіційний Open API',
  },
  {
    name: 'PrivatBank',
    emoji: '🟢',
    available: false,
    note: 'API вимагає серверних merchant-ключів — використовуйте імпорт виписки',
  },
  {
    name: 'Інші банки',
    emoji: '🏦',
    available: false,
    note: 'Імпорт через CSV/XLS на сторінці «Імпорт»',
  },
];

const MonobankConnector = ({ linked, onLink, onUnlink }) => {
  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState('token');
  const [token, setToken]         = useState(() => localStorage.getItem(MONO_TOKEN_KEY) || '');
  const [monoAccs, setMonoAccs]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(MONO_ACCOUNTS_KEY) || '[]'); } catch { return []; }
  });
  const [clientName, setClientName] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [selectedId, setSelectedId] = useState('');


  useEffect(() => {
    if (monoAccs.length > 0) { setStep('pick'); setSelectedId(monoAccs[0]?.id ?? ''); }
  }, []);

  const connect = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('https://api.monobank.ua/personal/client-info', {
      headers: { 'X-Token': token.trim() },
    });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.errorDescription || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setClientName(data.name || '');
      const accs = data.accounts || [];
      setMonoAccs(accs);
      setSelectedId(accs[0]?.id ?? '');
      localStorage.setItem(MONO_TOKEN_KEY, token.trim());
      localStorage.setItem(MONO_ACCOUNTS_KEY, JSON.stringify(accs));
      setStep('pick');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const confirmLink = () => {
    const acc = monoAccs.find(a => a.id === selectedId);
    if (!acc) return;
    onLink({
      monoAccountId:  acc.id,
      monoPan:        acc.maskedPan?.[0] ?? '****',
      monoType:       monoCardType(acc.type),
      monoBalance:    acc.balance / 100,
      monoCurrency:   monoCardCurrency(acc.currencyCode),
      monoClientName: clientName,
    });
    setOpen(false);
  };

  const resetToken = () => {
    localStorage.removeItem(MONO_ACCOUNTS_KEY);
    setMonoAccs([]); setStep('token'); setSelectedId(''); setClientName(''); setError('');
  };


  if (linked?.monoAccountId) {
    return (
      <div className="mt-2 flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
        <span className="text-2xl">🐱</span>
        <div className="flex-1">
          <p className="font-black text-emerald-800 text-sm">Monobank прив'язано</p>
          <p className="text-[10px] text-emerald-600 font-medium">
            {linked.monoType} · {linked.monoPan} · {linked.monoClientName}
          </p>
        </div>
        <button type="button" onClick={onUnlink}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 transition-all">
          <Unlink size={12}/> Від'єднати
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-gray-100 rounded-2xl overflow-hidden">

      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-indigo-50 transition-all">
        <span className="text-xl">🐱</span>
        <div className="flex-1 text-left">
          <p className="font-black text-gray-800 text-sm">Прив'язати картку Monobank</p>
          <p className="text-[10px] text-gray-400 font-medium">Через офіційний Monobank API</p>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="p-5 border-t border-gray-100 space-y-4">

          {}
          <div className="space-y-2">
            {BANKS.map(b => (
              <div key={b.name} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${b.available ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                <span className="text-lg flex-shrink-0">{b.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-black text-xs ${b.available ? 'text-emerald-800' : 'text-gray-500'}`}>{b.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${b.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                      {b.available ? 'Доступно' : 'Лише імпорт'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{b.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            {}
            {step === 'token' && (
              <>
                <p className="text-xs text-gray-500 font-medium mb-3 leading-relaxed">
                  Отримайте токен на{' '}
                  <a href="https://api.monobank.ua" target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 font-black underline underline-offset-2 inline-flex items-center gap-1">
                    api.monobank.ua <ExternalLink size={10}/>
                  </a>
                  {' '}та вставте нижче:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={token}
                    onChange={e => { setToken(e.target.value); setError(''); }}
                    placeholder="u••••••••••••••••••"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), connect())}
                    className="flex-1 p-3.5 bg-white rounded-2xl border border-gray-200 outline-none font-mono text-sm focus:ring-2 ring-indigo-400 transition-all"
                  />
                  <button type="button" onClick={connect} disabled={loading || !token.trim()}
                    className="px-5 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center gap-2">
                    {loading ? <Loader size={13} className="animate-spin"/> : <Link2 size={13}/>}
                    {loading ? '...' : 'Підключити'}
                  </button>
                </div>
                {error && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600 font-bold bg-red-50 rounded-xl p-3 border border-red-100">
                    <AlertTriangle size={12} className="flex-shrink-0"/> {error}
                  </div>
                )}
              </>
            )}

            {}
            {step === 'pick' && (
              <>
                {clientName && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0"/>
                    <p className="text-xs font-bold text-emerald-700">Підключено: {clientName}</p>
                    <button type="button" onClick={resetToken}
                      className="ml-auto text-[10px] font-black text-gray-400 hover:text-red-400 transition-all flex items-center gap-1">
                      <Unlink size={10}/> Змінити
                    </button>
                  </div>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Оберіть картку для прив'язки
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {monoAccs.map(acc => {
                    const bal  = (acc.balance / 100).toLocaleString('uk-UA', { minimumFractionDigits: 2 });
                    const cur  = monoCardCurrency(acc.currencyCode);
                    const pan  = acc.maskedPan?.[0] ?? '••••';
                    const type = monoCardType(acc.type);
                    const sel  = selectedId === acc.id;
                    return (
                      <button key={acc.id} type="button" onClick={() => setSelectedId(acc.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${sel ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${sel ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                          🐱
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-sm ${sel ? 'text-indigo-800' : 'text-gray-700'}`}>
                            {type} · {pan}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">{bal} {cur}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'border-indigo-500 bg-indigo-500' : 'border-gray-200'}`}>
                          {sel && <div className="w-2 h-2 bg-white rounded-full"/>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-wider text-gray-400 hover:bg-gray-50 transition-all">
                    Скасувати
                  </button>
                  <button type="button" onClick={confirmLink} disabled={!selectedId}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    <CheckCircle2 size={13}/> Прив'язати
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Accounts = ({ user }) => {
  const [accounts, setAccounts]             = useState([]);
  const [participants, setParticipants]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showFormModal, setShowFormModal]   = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [openMenuId, setOpenMenuId]         = useState(null);
  const containerRef = useRef(null);

  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;

  const emptyForm = {
    name: '', balance: 0, owner: 'all', color: '#6366f1', currency: 'UAH',

    monoAccountId: '', monoPan: '', monoType: '', monoClientName: '', monoBalance: 0, monoCurrency: 'UAH',
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [savedAccs, savedUsers] = await Promise.all([
        apiService.getAccounts(), apiService.getUsers(),
      ]);
      setAccounts(savedAccs);
      setParticipants(savedUsers);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { loadInitialData(); }, []);

  const getPensionBalance = () => {
    try { return JSON.parse(localStorage.getItem(PENSION_STORAGE_KEY) || '{"total":0}').total || 0; }
    catch { return 0; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const finalData = {
      ...formData,
      currentBalance: parseFloat(formData.balance) || 0,
      id: editingAccount ? editingAccount.id : Date.now().toString(),
    };
    const current = await apiService.getAccounts();
    const updated = editingAccount
      ? current.map(a => a.id === editingAccount.id ? finalData : a)
      : [...current, finalData];
    localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
    setAccounts(updated);
    closeModal();
  };

  const deleteAccount = async (id) => {
    if (!isAdmin) return;
    setOpenMenuId(null);
    if (!window.confirm('Ви впевнені, що хочете видалити цей рахунок?')) return;
    const current = await apiService.getAccounts();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
    setAccounts(updated);
  };

  const closeModal = () => {
    setShowFormModal(false);
    setEditingAccount(null);
    setFormData(emptyForm);
    setOpenMenuId(null);
  };

  const openEdit = (acc) => {
    setEditingAccount(acc);
    setFormData({ ...emptyForm, ...acc });
    setShowFormModal(true);
    setOpenMenuId(null);
  };


  const handleMonoLink = (monoData) => setFormData(f => ({ ...f, ...monoData, name: f.name || `Monobank ${monoData.monoType}`, currency: monoData.monoCurrency }));
  const handleMonoUnlink = () => setFormData(f => ({ ...f, monoAccountId: '', monoPan: '', monoType: '', monoClientName: '', monoBalance: 0 }));

  const currencySymbols = { UAH: '₴', USD: '$', EUR: '€' };

  const pensionAccount = {
    id: 'pension_default',
    name: 'Пенсійні заощадження',
    currentBalance: getPensionBalance(),
    currency: 'UAH',
    color: '#6366f1',
    owner: 'all',
    isPension: true,
  };

  const allAccounts = [pensionAccount, ...accounts];

  if (loading) return (
    <div className="ml-64 p-10 flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader className="animate-spin text-orange-500" size={48}/>
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Синхронізація...</p>
      </div>
    </div>
  );

  return (
    <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
      <div className="max-w-5xl mx-auto">

        {}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3 italic">
              <Wallet className="text-orange-500" size={36}/> Мої рахунки
            </h2>
            {!isAdmin && (
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1 flex items-center gap-1.5">
                <Lock size={10}/> Перегляд — редагування доступне лише адміністратору
              </p>
            )}
          </div>
          {isAdmin && (
            <button onClick={() => setShowFormModal(true)}
              className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl active:scale-95">
              <Plus size={20}/> Новий рахунок
            </button>
          )}
        </div>

        {}
        <div className="grid gap-6" ref={containerRef}>
          {allAccounts.map(acc => (
            <div key={acc.id}
              className={`bg-white p-8 rounded-[40px] shadow-sm border flex justify-between items-center transition-all hover:shadow-md fi-account-card ${acc.isPension ? 'border-indigo-200 bg-gradient-to-r from-white to-indigo-50/40' : 'border-gray-100'}`}>

              {}
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black shadow-lg text-2xl"
                  style={{ backgroundColor: acc.color }}>
                  {acc.isPension ? <PiggyBank size={28}/> : acc.monoAccountId ? '🐱' : acc.owner === 'all' ? <Wallet size={28}/> : acc.owner ? acc.owner[0].toUpperCase() : <CreditCard size={28}/>}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-black text-gray-900 text-2xl tracking-tight">{acc.name}</h3>
                    {acc.isPension && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-600 flex items-center gap-1">
                        <Lock size={8}/> За замовчуванням
                      </span>
                    )}
                    {!acc.isPension && (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${acc.owner === 'all' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {acc.owner === 'all' ? 'Спільний' : acc.owner}
                      </span>
                    )}
                    {}
                    {acc.monoAccountId && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 flex items-center gap-1.5 border border-emerald-100">
                        <Link2 size={9}/> Monobank · {acc.monoPan}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                    {acc.currency} Гаманець
                    <span className="w-1 h-1 bg-gray-300 rounded-full"/>
                    {acc.isPension ? 'Захищений рахунок' : acc.monoAccountId ? `${acc.monoType} · ${acc.monoClientName}` : 'Активний'}
                  </p>
                </div>
              </div>

              {}
              <div className="flex items-center gap-10">
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">
                    {Number(acc.currentBalance || 0).toLocaleString('uk-UA')}
                    <span className="ml-2 text-orange-500">{currencySymbols[acc.currency] || acc.currency}</span>
                  </p>
                </div>

                {isAdmin && !acc.isPension && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(p => p === acc.id ? null : acc.id); }}
                      className="p-3 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                      <MoreVertical size={24}/>
                    </button>
                    {openMenuId === acc.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50">
                        <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); openEdit(acc); }}
                          className="w-full px-6 py-4 text-left flex items-center gap-3 hover:bg-gray-50 font-black text-[10px] uppercase tracking-widest transition-all rounded-2xl">
                          <Pencil size={14} className="text-indigo-500"/> Редагувати
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); deleteAccount(acc.id); }}
                          className="w-full px-6 py-4 text-left flex items-center gap-3 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest text-red-500 transition-all rounded-2xl">
                          <Trash2 size={14}/> Видалити
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {}
        {isAdmin && showFormModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-6 pt-10 overflow-y-auto">
            <form onSubmit={handleSubmit}
              className="bg-white w-full max-w-xl rounded-[50px] p-10 relative shadow-2xl overflow-y-auto my-6"
              style={{ maxHeight: '92vh' }}>
              <button type="button" onClick={closeModal}
                className="absolute right-8 top-8 text-gray-300 hover:text-red-500 transition-all">
                <X size={28}/>
              </button>
              <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter text-center">
                {editingAccount ? 'Редагувати' : 'Новий'} рахунок
              </h3>

              <div className="space-y-5">
                {}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">Назва рахунку</label>
                  <input required value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-[20px] border-none outline-none font-black text-lg focus:ring-2 ring-orange-500 transition-all"
                    placeholder="***"/>
                </div>

                {}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">Власник</label>
                    <select value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})}
                      className="w-full p-5 bg-gray-50 rounded-[20px] border-none font-black text-[11px] uppercase outline-none cursor-pointer">
                      <option value="all">Спільний</option>
                      {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">Валюта</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}
                      className="w-full p-5 bg-orange-50 text-orange-600 rounded-[20px] border-none font-black text-[11px] uppercase outline-none cursor-pointer">
                      <option value="UAH">Гривня (₴)</option>
                      <option value="USD">Долар ($)</option>
                      <option value="EUR">Євро (€)</option>
                    </select>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">Початковий баланс</label>
                    <input type="number" value={formData.balance}
                      onChange={e => setFormData({...formData, balance: e.target.value})}
                      className="w-full p-5 bg-gray-50 rounded-[20px] border-none font-black text-xl focus:ring-2 ring-orange-500 transition-all"
                      placeholder="0.00"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest">Колір</label>
                    <input type="color" value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      className="w-full h-[62px] bg-gray-50 cursor-pointer rounded-[20px] p-2.5 border-none shadow-inner"/>
                  </div>
                </div>

                {}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest flex items-center gap-2">
                    <Link2 size={11}/> Прив'язати банківську картку
                  </label>
                  <MonobankConnector
                    linked={formData.monoAccountId ? formData : null}
                    onLink={handleMonoLink}
                    onUnlink={handleMonoUnlink}
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full py-5 bg-black text-white rounded-[25px] font-black uppercase text-xs tracking-[0.3em] mt-8 hover:bg-orange-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
                <Save size={16}/>
                {editingAccount ? 'Зберегти зміни' : 'Створити рахунок'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default Accounts;