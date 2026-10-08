import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiService } from '../services/api';
import {
  History as HistoryIcon, ArrowDownRight, ArrowUpRight, PlusCircle,
  Trash2, Wallet, Loader, Search, SlidersHorizontal, X,
  RotateCcw, Pencil, Check, ChevronDown,
} from 'lucide-react';

const getUserColor = (name) => {
  const colors = ['bg-orange-500', 'bg-black', 'bg-indigo-600', 'bg-slate-700', 'bg-orange-800'];
  if (!name) return colors[0];
  return colors[name.length % colors.length];
};

const fieldStyle = "p-5 bg-gray-50 rounded-2xl border-none outline-none font-black text-sm uppercase tracking-widest focus:ring-2 ring-orange-500 transition-all cursor-pointer";

const getCategories = () => {
  try {
    const raw = JSON.parse(localStorage.getItem('fin_categories_local') || '[]');
    if (raw.length > 0) return raw.map(c => c.name);
  } catch {}
  return ['Продукти', 'Зарплата', 'Транспорт', 'Кафе', 'Розваги', 'Комунальні послуги', 'Медицина', 'Одяг', 'Інше'];
};
const CATEGORIES = getCategories();
const TYPES      = ['Витрата', 'Дохід', 'Пенсійні заощадження'];

const typeOptions = [
  { value: 'Витрата',               label: 'Витрата (-)' },
  { value: 'Дохід',                 label: 'Дохід (+)' },
  { value: 'Пенсійні заощадження',  label: 'Пенсійні заощадження' },
];

const getTypeColor  = (t) => t === 'Дохід' ? 'text-green-500' : t === 'Пенсійні заощадження' ? 'text-indigo-600' : 'text-gray-900';
const getTypeIcon   = (t) => t === 'Дохід' ? <ArrowUpRight size={20} strokeWidth={3}/> : t === 'Пенсійні заощадження' ? <span className="text-base">🐷</span> : <ArrowDownRight size={20} className="text-red-400" strokeWidth={3}/>;
const getTypePrefix = (t) => t === 'Витрата' ? '−' : '+';

const EditModal = ({ transaction, participants, accounts, onSave, onClose }) => {
  const [form, setForm] = useState({ ...transaction });

  const handleSave = () => {
    if (!form.amount) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  const inputCls = "w-full p-5 bg-gray-50 rounded-[20px] border-none outline-none font-black focus:ring-2 ring-orange-500 transition-all";
  const labelCls = "text-[11px] font-black uppercase text-gray-400 ml-2 mb-1.5 block tracking-widest";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[50px] p-10 relative shadow-2xl font-sans overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <button onClick={onClose} className="absolute right-8 top-8 text-gray-300 hover:text-red-500 transition-all">
          <X size={28}/>
        </button>

        <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter text-center">Редагувати запис</h3>

        <div className="space-y-5">
          {}
          <div>
            <label className={labelCls}>Учасник</label>
            <select value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} className={inputCls + " text-[11px] uppercase cursor-pointer text-orange-600"}>
              {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Сума ₴</label>
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls + " text-xl"} placeholder="0"/>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {}
            <div>
              <label className={labelCls}>Категорія</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls + " text-[11px] uppercase cursor-pointer"}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {}
            <div>
              <label className={labelCls}>Тип</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls + " text-[11px] uppercase cursor-pointer"}>
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {}
          <div>
            <label className={labelCls}>Рахунок</label>
            <select value={form.account} onChange={e => setForm({...form, account: e.target.value})} className={inputCls + " text-[11px] uppercase cursor-pointer"} disabled={form.type === 'Пенсійні заощадження'}>
              {form.type === 'Пенсійні заощадження'
                ? <option>Пенсійні заощадження</option>
                : accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)
              }
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Опис</label>
            <input type="text" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className={inputCls} placeholder="Опис операції"/>
          </div>


          <div>
            <label className={labelCls}>Дата операції</label>
            <input
              type="date"
              value={form.date ? new Date(form.date).toISOString().slice(0,10) : ''}
              onChange={e => setForm({...form, date: e.target.value ? new Date(e.target.value).toISOString() : form.date})}
              className={inputCls + " cursor-pointer"}
            />

          </div>
        </div>

        <button onClick={handleSave}
          className="w-full py-5 bg-black text-white rounded-[25px] font-black uppercase text-xs tracking-[0.3em] mt-8 hover:bg-orange-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
          <Check size={16}/> Зберегти зміни
        </button>
      </div>
    </div>,
    document.body
  );
};

const SORT_OPTIONS = [
  { value: 'date_desc',   label: 'Часом (від найновішого)' },
  { value: 'date_asc',    label: 'Часом (від найстарішого)' },
  { value: 'amount_desc', label: 'Сумою (від найбільшої)' },
  { value: 'amount_asc',  label: 'Сумою (від найменшої)' },
];

const FilterSidebar = ({ filters, onChange, participants, accounts, onReset }) => {
  const labelCls  = "text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block";
  const selectCls = "w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 outline-none font-bold text-sm focus:ring-2 ring-orange-400 transition-all cursor-pointer text-gray-700";
  const inputCls  = "w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 outline-none font-bold text-sm focus:ring-2 ring-orange-400 transition-all text-gray-700 placeholder:text-gray-400 placeholder:font-medium";

  const hasActive = filters.search || filters.participant !== 'all' || filters.category !== 'all' || filters.type !== 'all' || filters.account !== 'all';

  return (
    <div className="w-72 flex-shrink-0">
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 sticky top-28">

        {}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={18} className="text-orange-500"/>
            <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Фільтри</h3>
          </div>
          {hasActive && (
            <button onClick={onReset} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-all">
              <RotateCcw size={11}/> Скинути
            </button>
          )}
        </div>

        <div className="space-y-5">

          {}
          <div>
            <label className={labelCls}>Пошук</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                type="text"
                placeholder="Опис, категорія..."
                value={filters.search}
                onChange={e => onChange('search', e.target.value)}
                className={inputCls + " pl-9"}
              />
            </div>
          </div>

          {}
          <div>
            <label className={labelCls}>Сортувати за</label>
            <div className="relative">
              <select value={filters.sort} onChange={e => onChange('sort', e.target.value)} className={selectCls}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {}
          <div>
            <label className={labelCls}>Учасник</label>
            <select value={filters.participant} onChange={e => onChange('participant', e.target.value)} className={selectCls}>
              <option value="all">Усі учасники</option>
              {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Тип операції</label>
            <select value={filters.type} onChange={e => onChange('type', e.target.value)} className={selectCls}>
              <option value="all">Усі типи</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Категорія</label>
            <select value={filters.category} onChange={e => onChange('category', e.target.value)} className={selectCls}>
              <option value="all">Усі категорії</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Рахунок</label>
            <select value={filters.account} onChange={e => onChange('account', e.target.value)} className={selectCls}>
              <option value="all">Усі рахунки</option>
              {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              <option value="Готівка">Готівка</option>
              <option value="Пенсійні заощадження">Пенсійні заощадження</option>
            </select>
          </div>

          {}
          <div>
            <label className={labelCls}>Сума (₴)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Від" value={filters.amountMin} onChange={e => onChange('amountMin', e.target.value)} className={inputCls + " w-1/2"} min="0"/>
              <input type="number" placeholder="До"  value={filters.amountMax} onChange={e => onChange('amountMax', e.target.value)} className={inputCls + " w-1/2"} min="0"/>
            </div>
          </div>

          {}
          <div>
            <label className={labelCls}>Дата</label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-gray-400 pointer-events-none">Від</span>
                <input type="date" value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)}
                  className="w-full box-border pl-9 pr-3 py-3.5 bg-gray-50 rounded-2xl border border-gray-100 outline-none font-bold text-sm focus:ring-2 ring-orange-400 transition-all text-gray-700 cursor-pointer"/>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-gray-400 pointer-events-none">До</span>
                <input type="date" value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)}
                  className="w-full box-border pl-9 pr-3 py-3.5 bg-gray-50 rounded-2xl border border-gray-100 outline-none font-bold text-sm focus:ring-2 ring-orange-400 transition-all text-gray-700 cursor-pointer"/>
              </div>
            </div>
          </div>

          {hasActive && (
            <button onClick={onReset}
              className="w-full py-3 border-2 border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all flex items-center justify-center gap-2">
              <RotateCcw size={12}/> Скинути фільтр
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const defaultFilters = {
  search: '', sort: 'date_desc',
  participant: 'all', type: 'all', category: 'all', account: 'all',
  amountMin: '', amountMax: '', dateFrom: '', dateTo: '',
};

const History = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [accounts, setAccounts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showFilters, setShowFilters]   = useState(true);
  const [filters, setFilters]           = useState(defaultFilters);
  const [editing, setEditing]           = useState(null);

  const [newItem, setNewItem] = useState({ amount: '', category: 'Продукти', type: 'Витрата', account: '', userName: '', date: '' });

  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const history = await apiService.getHistory();
      const users   = await apiService.getUsers();
      const accs    = await apiService.getAccounts();
      setTransactions(history);
      setParticipants(users);
      setAccounts(accs);
      if (users.length > 0) setNewItem(p => ({ ...p, userName: users[0].name }));
      if (accs.length > 0)  setNewItem(p => ({ ...p, account:  accs[0].name  }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);


  const filtered = useMemo(() => {
    let list = [...transactions];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.category    || '').toLowerCase().includes(q) ||
        (t.userName    || '').toLowerCase().includes(q)
      );
    }
    if (filters.participant !== 'all') list = list.filter(t => t.userName === filters.participant);
    if (filters.type        !== 'all') list = list.filter(t => t.type     === filters.type);
    if (filters.category    !== 'all') list = list.filter(t => t.category === filters.category);
    if (filters.account     !== 'all') list = list.filter(t => t.account  === filters.account);
    if (filters.amountMin)  list = list.filter(t => Math.abs(t.amount) >= parseFloat(filters.amountMin));
    if (filters.amountMax)  list = list.filter(t => Math.abs(t.amount) <= parseFloat(filters.amountMax));
    if (filters.dateFrom)   list = list.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
    if (filters.dateTo)     list = list.filter(t => new Date(t.date) <= new Date(filters.dateTo + 'T23:59:59'));

    list.sort((a, b) => {
      if (filters.sort === 'date_desc')   return new Date(b.date) - new Date(a.date);
      if (filters.sort === 'date_asc')    return new Date(a.date) - new Date(b.date);
      if (filters.sort === 'amount_desc') return Math.abs(b.amount) - Math.abs(a.amount);
      if (filters.sort === 'amount_asc')  return Math.abs(a.amount) - Math.abs(b.amount);
      return 0;
    });
    return list;
  }, [transactions, filters]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const resetFilters = () => setFilters(defaultFilters);


  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.amount || !newItem.userName) return alert('Заповніть суму та оберіть учасника!');

    const newEntry = {
      id: Date.now().toString(),
      description: newItem.type === 'Пенсійні заощадження'
        ? 'Поповнення пенсійних заощаджень'
        : newItem.category === 'Зарплата' ? 'Надходження' : `Запис: ${newItem.category}`,
      amount: parseFloat(newItem.amount),
      category: newItem.category,
      type: newItem.type,
      account: newItem.type === 'Пенсійні заощадження' ? 'Пенсійні заощадження' : newItem.account,
      userName: newItem.userName,
      date: newItem.date ? new Date(newItem.date).toISOString() : new Date().toISOString(),
    };

    if (newItem.type === 'Пенсійні заощадження') {
      try {
        const stored = JSON.parse(localStorage.getItem('fin_pension_savings_local') || '{"total":0,"history":[]}');
        localStorage.setItem('fin_pension_savings_local', JSON.stringify({
          total: (stored.total || 0) + newEntry.amount,
          history: [{ id: newEntry.id, amount: newEntry.amount, note: `Записано через журнал: ${newItem.category}`, date: newEntry.date }, ...(stored.history || [])],
        }));
      } catch (err) { console.error(err); }
    }

    try {
      const updated = await apiService.saveTransaction(newEntry);
      setTransactions(updated);
      setNewItem({ ...newItem, amount: '', date: '' });
    } catch { alert('Не вдалося зберегти запис'); }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Видалити цей запис?')) return;
    try {
      const history = await apiService.getHistory();
      const updated = history.filter(t => t.id !== id);
      localStorage.setItem('fin_history_local', JSON.stringify(updated));
      setTransactions(updated);
    } catch { alert('Помилка при видаленні'); }
  };


  const handleEditSave = async (updatedTx) => {
    try {
      const history = await apiService.getHistory();
      const updated = history.map(t => t.id === updatedTx.id ? updatedTx : t);
      localStorage.setItem('fin_history_local', JSON.stringify(updated));
      setTransactions(updated);
      setEditing(null);
    } catch { alert('Помилка при збереженні'); }
  };


  const activeCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'sort' && v !== '' && v !== 'all'
  ).length;

  if (loading) return (
    <div className="ml-64 p-10 font-black text-orange-500 flex items-center justify-center h-screen bg-[#f8f9fc]">
      <div className="flex flex-col items-center gap-4">
        <Loader className="animate-spin" size={48}/>
        <p className="uppercase tracking-[0.3em] text-xs">Синхронізація через API сервіс...</p>
      </div>
    </div>
  );

  return (
    <div className="ml-64 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
      <div className="max-w-[1400px] mx-auto p-10">

        {}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-black text-gray-900 flex items-center gap-4 uppercase tracking-tighter italic">
            <HistoryIcon className="text-orange-500" size={38}/> Журнал операцій
          </h2>
          <div className="flex items-center gap-4">
            {}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                showFilters ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200'
              }`}
            >
              <SlidersHorizontal size={15}/>
              Фільтри
              {activeCount > 0 && (
                <span className="w-5 h-5 bg-white text-orange-500 rounded-full text-[9px] flex items-center justify-center font-black">
                  {activeCount}
                </span>
              )}
            </button>
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Підключення до бази: <span className="text-green-500">Активне</span>
              </p>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white p-8 rounded-[40px] shadow-sm mb-8 border border-gray-100 hover:shadow-md transition-all">
          <h3 className="text-[10px] font-black text-gray-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
            <PlusCircle size={18} className="text-orange-500"/> Швидкий запис операції
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <select value={newItem.userName} onChange={e => setNewItem({...newItem, userName: e.target.value})} className={`${fieldStyle} text-orange-600 bg-orange-50`}>
              {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              {participants.length === 0 && <option>Немає учасників</option>}
            </select>
            <input type="number" placeholder="Сума ₴" required value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value})} className="p-5 bg-gray-50 rounded-2xl border-none outline-none font-black text-xl focus:ring-2 ring-orange-500 transition-all"/>
            <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className={fieldStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} className={`${fieldStyle} ${newItem.type === 'Дохід' ? 'text-green-600 bg-green-50' : newItem.type === 'Пенсійні заощадження' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'}`}>
              {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={newItem.account} onChange={e => setNewItem({...newItem, account: e.target.value})} className={fieldStyle} disabled={newItem.type === 'Пенсійні заощадження'}>
              {newItem.type === 'Пенсійні заощадження'
                ? <option>Пенсійні заощадження</option>
                : accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <input
              type="date"
              value={newItem.date}
              onChange={e => setNewItem({...newItem, date: e.target.value})}
              className={`${fieldStyle} text-gray-600`}
              title="Дата операції (порожнє = сьогодні)"
            />
            <button type="submit" className="bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl active:scale-95">Додати</button>
          </form>
          {newItem.type === 'Пенсійні заощадження' && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-2xl flex items-center gap-3">
              <span className="text-xl">🐷</span>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Сума буде автоматично зарахована на рахунок "Пенсійні заощадження"</p>
            </div>
          )}
        </div>

        {}
        <div className="flex gap-7 items-start">

          {}
          {showFilters && (
            <FilterSidebar
              filters={filters}
              onChange={setFilter}
              participants={participants}
              accounts={accounts}
              onReset={resetFilters}
            />
          )}

          {}
          <div className="flex-1 min-w-0">

            {}
            <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Знайдено: <span className="text-gray-700">{filtered.length}</span> з <span className="text-gray-700">{transactions.length}</span> записів
              </p>
              {activeCount > 0 && (
                <button onClick={resetFilters} className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 flex items-center gap-1.5">
                  <RotateCcw size={11}/> Скинути фільтри
                </button>
              )}
            </div>

            <div className="bg-white rounded-[44px] shadow-sm overflow-hidden border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100 font-black uppercase text-[9px] text-gray-400 tracking-[0.2em]">
                    <th className="p-6 pl-8">Дата / Рахунок</th>
                    <th className="p-6 text-center">Учасник</th>
                    <th className="p-6">Категорія / Опис</th>
                    <th className="p-6 text-right">Сума</th>
                    <th className="p-6 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-24 text-center text-gray-300 font-black uppercase italic tracking-widest text-sm">
                        {transactions.length === 0 ? 'Журнал операцій порожній...' : 'Жодного запису не знайдено за обраними фільтрами'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/40 transition-all group fi-row">
                        <td className="p-6 pl-8">
                          <p className="font-black text-gray-800 text-sm tracking-tight">
                            {new Date(t.date).toLocaleDateString('uk-UA')}
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1.5 uppercase font-black tracking-widest mt-1">
                            <Wallet size={10} className="text-orange-400"/> {t.account}
                          </p>
                        </td>

                        <td className="p-6">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className={`w-10 h-10 ${getUserColor(t.userName)} text-white rounded-[16px] flex items-center justify-center text-sm font-black uppercase shadow-lg transition-transform group-hover:rotate-12`}>
                              {t.userName ? t.userName.charAt(0) : '?'}
                            </div>
                            <p className="font-black text-[9px] text-gray-400 uppercase tracking-widest">{t.userName || 'Гість'}</p>
                          </div>
                        </td>

                        <td className="p-6">
                          <p className="font-black text-gray-800 text-sm uppercase tracking-tight mb-1">{t.description}</p>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'Пенсійні заощадження' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                            {t.category}
                          </span>
                        </td>

                        <td className="p-6 text-right">
                          <div className={`flex items-center justify-end gap-1.5 text-xl font-black tracking-tighter ${getTypeColor(t.type)}`}>
                            {getTypeIcon(t.type)}
                            {getTypePrefix(t.type)} {Math.abs(t.amount).toLocaleString('uk-UA')} ₴
                          </div>
                          {t.type === 'Пенсійні заощадження' && (
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">🐷 Накопичення</p>
                          )}
                        </td>

                        {}
                        <td className="p-6 text-center">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditing(t)}
                              className="p-2.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">
                              <Pencil size={16}/>
                            </button>
                            <button onClick={() => handleDelete(t.id)}
                              className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={16}/>
                            </button>
                          </div>
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

      {}
      {editing && (
        <EditModal
          transaction={editing}
          participants={participants}
          accounts={accounts}
          onSave={handleEditSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default History;