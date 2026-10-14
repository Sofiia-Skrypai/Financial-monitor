import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import {
  Tag, Plus, Trash2, Check, X, Edit2, Bell,
  AlertTriangle, Loader,
} from 'lucide-react';

const CATS_KEY   = 'fin_categories_local';
const NOTIFY_KEY = 'fin_cat_notified';

const DEFAULT_CATS = [
  { id: 'cat_1', name: 'Продукти',            icon: '🛒', color: '#f97316', limit: 0 },
  { id: 'cat_2', name: 'Транспорт',           icon: '🚗', color: '#0ea5e9', limit: 0 },
  { id: 'cat_3', name: 'Кафе',               icon: '☕', color: '#f59e0b', limit: 0 },
  { id: 'cat_4', name: 'Розваги',            icon: '🎬', color: '#8b5cf6', limit: 0 },
  { id: 'cat_5', name: 'Комунальні послуги', icon: '💡', color: '#14b8a6', limit: 0 },
  { id: 'cat_6', name: 'Медицина',           icon: '💊', color: '#ec4899', limit: 0 },
  { id: 'cat_7', name: 'Одяг',              icon: '👕', color: '#6366f1', limit: 0 },
  { id: 'cat_8', name: 'Зарплата',          icon: '💰', color: '#10b981', limit: 0 },
  { id: 'cat_9', name: 'Інше',              icon: '📦', color: '#64748b', limit: 0 },
];

const ICON_OPTIONS = ['🛒','🚗','☕','🎬','💡','💊','👕','📦','🏠','🍕','💻','📚','🎮','✈️','💰','🎁','🐾','🌿','💄','🧹'];
const COLOR_OPTIONS = ['#f97316','#0ea5e9','#f59e0b','#8b5cf6','#14b8a6','#ec4899','#6366f1','#64748b','#10b981','#ef4444','#1e3a8a','#d97706'];

const Toast = ({ toasts, onDismiss }) => (
  <div style={{ position:'fixed', top:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:380 }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        background: t.type === 'warn' ? '#fff7ed' : '#fef2f2',
        border: `1.5px solid ${t.type === 'warn' ? '#fed7aa' : '#fecaca'}`,
        borderRadius: 18, padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        animation: 'slideIn 0.3s ease',
        fontFamily: 'inherit',
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>
          {t.type === 'warn' ? '⚠️' : '🚨'}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 900, fontSize: 13, color: t.type === 'warn' ? '#c2410c' : '#dc2626', margin: '0 0 2px' }}>
            {t.type === 'warn' ? 'Наближення до ліміту' : 'Ліміт перевищено!'}
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>{t.message}</p>
        </div>
        <button onClick={() => onDismiss(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:2, flexShrink:0 }}>
          <X size={14}/>
        </button>
      </div>
    ))}
  </div>
);

const LimitBar = ({ spent, limit }) => {
  if (!limit || limit <= 0) return null;
  const pct = Math.min((spent / limit) * 100, 100);
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : pct >= 60 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          ₴{Math.round(spent).toLocaleString('uk-UA')} / ₴{limit.toLocaleString('uk-UA')}
        </span>
        <span style={{ fontSize:10, fontWeight:900, color }}>
          {pct >= 100 ? 'Перевищено!' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div style={{ height:6, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, transition:'width 0.5s ease' }}/>
      </div>
    </div>
  );
};

const Categories = ({ user }) => {
  const [categories, setCategories] = useState([]);
  const [spent, setSpent]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [toasts, setToasts]         = useState([]);
  const [editingId, setEditingId]   = useState(null);
  const [showForm, setShowForm]     = useState(false);


  const [form, setForm] = useState({ name:'', icon:'📦', color:'#f97316', limit:'' });

  const [editForm, setEditForm] = useState({});

  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;


  const loadCategories = useCallback(() => {
    const raw = localStorage.getItem(CATS_KEY);
    if (!raw) {
      localStorage.setItem(CATS_KEY, JSON.stringify(DEFAULT_CATS));
      setCategories(DEFAULT_CATS);
    } else {
      setCategories(JSON.parse(raw));
    }
  }, []);


  const computeSpent = useCallback(async () => {
    const history = await apiService.getHistory();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth  = history.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && (t.type === 'Витрата');
    });
    const map = {};
    thisMonth.forEach(t => {
      const cat = t.category || 'Інше';
      map[cat] = (map[cat] || 0) + Math.abs(Number(t.amount));
    });
    setSpent(map);
    return map;
  }, []);


  const checkLimits = useCallback((cats, spentMap) => {
    const notified = JSON.parse(sessionStorage.getItem(NOTIFY_KEY) || '{}');
    const newToasts = [];

    cats.forEach(cat => {
      if (!cat.limit || cat.limit <= 0) return;
      const s   = spentMap[cat.name] || 0;
      const pct = (s / cat.limit) * 100;
      const key80  = `${cat.id}_80`;
      const key100 = `${cat.id}_100`;

      if (pct >= 100 && !notified[key100]) {
        newToasts.push({ id: `${cat.id}_${Date.now()}`, type:'error', message:`Категорія "${cat.name}": витрачено ₴${Math.round(s).toLocaleString('uk-UA')} з ₴${cat.limit.toLocaleString('uk-UA')} (ліміт перевищено на ${Math.round(pct-100)}%).` });
        notified[key100] = true;
      } else if (pct >= 80 && pct < 100 && !notified[key80]) {
        newToasts.push({ id: `${cat.id}_${Date.now()}`, type:'warn', message:`Категорія "${cat.name}": використано ${Math.round(pct)}% ліміту (ще ₴${Math.round(cat.limit - s).toLocaleString('uk-UA')}).` });
        notified[key80] = true;
      }
    });

    if (newToasts.length > 0) {
      sessionStorage.setItem(NOTIFY_KEY, JSON.stringify(notified));
      setToasts(prev => [...prev, ...newToasts]);

      newToasts.forEach(t => {
        setTimeout(() => dismissToast(t.id), 8000);
      });
    }
  }, []);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const loadAll = useCallback(async () => {
    setLoading(true);
    loadCategories();
    const spentMap = await computeSpent();
    const cats = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    checkLimits(cats, spentMap);
    setLoading(false);
  }, [loadCategories, computeSpent, checkLimits]);

  useEffect(() => { loadAll(); }, [loadAll]);


  const saveCats = (updated) => {
    localStorage.setItem(CATS_KEY, JSON.stringify(updated));
    setCategories(updated);
    checkLimits(updated, spent);
  };


  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const newCat = { id:`cat_${Date.now()}`, name:form.name.trim(), icon:form.icon, color:form.color, limit: parseFloat(form.limit) || 0 };
    saveCats([...categories, newCat]);
    setForm({ name:'', icon:'📦', color:'#f97316', limit:'' });
    setShowForm(false);
  };


  const handleDelete = (id) => {
    if (!window.confirm('Видалити категорію?')) return;
    saveCats(categories.filter(c => c.id !== id));
  };


  const startEdit = (cat) => { setEditingId(cat.id); setEditForm({ ...cat, limit: cat.limit || '' }); };
  const saveEdit  = () => {
    saveCats(categories.map(c => c.id === editingId ? { ...c, ...editForm, limit: parseFloat(editForm.limit) || 0 } : c));
    setEditingId(null);
  };


  const catsWithLimits  = categories.filter(c => c.limit > 0);
  const catsExceeded    = catsWithLimits.filter(c => (spent[c.name] || 0) >= c.limit);
  const catsNearLimit   = catsWithLimits.filter(c => { const pct = ((spent[c.name]||0)/c.limit)*100; return pct>=80 && pct<100; });

  if (loading) return (
    <div className="ml-64 flex items-center justify-center h-screen bg-[#f8f9fc]">
      <div className="flex flex-col items-center gap-4 text-orange-500">
        <Loader className="animate-spin" size={48}/>
        <p className="font-black uppercase tracking-widest text-xs">Завантаження категорій...</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <Toast toasts={toasts} onDismiss={dismissToast}/>

      <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
        <div className="max-w-5xl mx-auto">


          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic flex items-center gap-4">
                <Tag className="text-orange-500" size={36}/> Категорії
              </h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                Ліміти витрат на поточний місяць
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowForm(v => !v)}
                className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-orange-600 transition-all shadow-xl active:scale-95">
                <Plus size={18}/> {showForm ? 'Скасувати' : 'Нова категорія'}
              </button>
            )}
          </div>


          <div className="flex gap-4 mb-8 flex-wrap">
            <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <Tag size={16} className="text-orange-500"/>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Всього категорій</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{categories.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <Bell size={16} className="text-indigo-500"/>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">З лімітом</p>
                <p className="text-xl font-black text-gray-900 leading-tight">{catsWithLimits.length}</p>
              </div>
            </div>
            {catsNearLimit.length > 0 && (
              <div className="bg-orange-50 rounded-2xl px-6 py-4 border border-orange-100 shadow-sm flex items-center gap-3">
                <AlertTriangle size={16} className="text-orange-500"/>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">Наближаються до ліміту</p>
                  <p className="text-xl font-black text-orange-600 leading-tight">{catsNearLimit.length}</p>
                </div>
              </div>
            )}
            {catsExceeded.length > 0 && (
              <div className="bg-red-50 rounded-2xl px-6 py-4 border border-red-100 shadow-sm flex items-center gap-3">
                <AlertTriangle size={16} className="text-red-500"/>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Ліміт перевищено</p>
                  <p className="text-xl font-black text-red-600 leading-tight">{catsExceeded.length}</p>
                </div>
              </div>
            )}
          </div>


          {isAdmin && showForm && (
            <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-100 mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Нова категорія</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

                <div className="md:col-span-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Назва</label>
                  <input required value={form.name} onChange={e => setForm({...form, name:e.target.value})}
                    placeholder="***" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-black focus:ring-2 ring-orange-500 transition-all"/>
                </div>


                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Іконка</label>
                  <select value={form.icon} onChange={e => setForm({...form, icon:e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-black text-xl focus:ring-2 ring-orange-500 transition-all cursor-pointer">
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>


                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Колір</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({...form, color:c})}
                        className="w-7 h-7 rounded-lg transition-all flex-shrink-0"
                        style={{ backgroundColor:c, outline: form.color===c ? `3px solid ${c}` : 'none', outlineOffset:2, opacity: form.color===c ? 1 : 0.6 }}/>
                    ))}
                  </div>
                </div>

                {}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Ліміт на місяць (₴)</label>
                  <input type="number" min="0" value={form.limit} onChange={e => setForm({...form, limit:e.target.value})}
                    placeholder="0 = без ліміту" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-black focus:ring-2 ring-orange-500 transition-all"/>
                </div>
              </div>

              {}
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{background:`${form.color}18`}}>
                  <span className="text-2xl">{form.icon}</span>
                  <span className="font-black text-gray-800">{form.name || 'Назва'}</span>
                  {form.limit > 0 && <span className="text-xs font-bold text-gray-500 ml-1">· ₴{Number(form.limit).toLocaleString('uk-UA')}/міс</span>}
                </div>
                <button type="submit"
                  className="px-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2">
                  <Check size={16}/> Створити
                </button>
              </div>
            </form>
          )}

          {}
          <div className="grid grid-cols-1 gap-4">
            {categories.map(cat => {
              const catSpent = spent[cat.name] || 0;
              const pct      = cat.limit > 0 ? Math.min((catSpent / cat.limit) * 100, 100) : 0;
              const exceeded = cat.limit > 0 && catSpent >= cat.limit;
              const nearLim  = cat.limit > 0 && pct >= 80 && !exceeded;
              const isEditing = editingId === cat.id;

              return (
                <div key={cat.id} className={`bg-white rounded-[36px] shadow-sm border transition-all hover:shadow-md overflow-hidden ${exceeded ? 'border-red-200' : nearLim ? 'border-orange-200' : 'border-gray-100'}`}>
                  <div className="p-7 flex items-center gap-6">

                    {}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
                      style={{background: isEditing ? (editForm.color || cat.color) : cat.color, opacity:1}}>
                      {isEditing ? (editForm.icon || cat.icon) : cat.icon}
                    </div>

                    {isEditing ? (
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input value={editForm.name} onChange={e => setEditForm({...editForm, name:e.target.value})}
                          className="p-3 bg-gray-50 rounded-xl border-none outline-none font-black focus:ring-2 ring-orange-400"/>

                        <select value={editForm.icon} onChange={e => setEditForm({...editForm, icon:e.target.value})}
                          className="p-3 bg-gray-50 rounded-xl border-none outline-none font-black text-xl cursor-pointer focus:ring-2 ring-orange-400">
                          {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                        </select>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          {COLOR_OPTIONS.map(c => (
                            <button key={c} type="button" onClick={() => setEditForm({...editForm, color:c})}
                              className="w-6 h-6 rounded-lg flex-shrink-0"
                              style={{backgroundColor:c, outline:editForm.color===c ? `2px solid ${c}` : 'none', outlineOffset:2, opacity:editForm.color===c?1:0.55}}/>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Ліміт (₴/міс)</p>
                            <input type="number" min="0" value={editForm.limit}
                              onChange={e => setEditForm({...editForm, limit:e.target.value})}
                              className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none font-black focus:ring-2 ring-orange-400"
                              placeholder="0 = без ліміту"/>
                          </div>
                          <button onClick={saveEdit} className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all mt-5">
                            <Check size={18}/>
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 transition-all mt-5">
                            <X size={18}/>
                          </button>
                        </div>
                      </div>
                    ) : (
                                            <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-black text-gray-900 text-xl tracking-tight">{cat.name}</h3>
                            {exceeded && (
                              <span className="px-3 py-1 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle size={9}/> Перевищено
                              </span>
                            )}
                            {nearLim && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                <Bell size={9}/> Близько до ліміту
              </span>
                            )}
                            {cat.limit > 0 && !exceeded && !nearLim && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest">
                                Ліміт: ₴{cat.limit.toLocaleString('uk-UA')}
                              </span>
                            )}
                            {!cat.limit && (
                              <span className="px-3 py-1 bg-gray-50 text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-widest">
                                Без ліміту
                              </span>
                            )}
                          </div>

                          {}
                          <p className="text-sm text-gray-400 font-bold mt-1">
                            Витрачено цього місяця: <span className="font-black" style={{color: exceeded ? '#ef4444' : nearLim ? '#f97316' : '#374151'}}>₴{Math.round(catSpent).toLocaleString('uk-UA')}</span>
                          </p>

                          {cat.limit > 0 && <LimitBar spent={catSpent} limit={cat.limit}/>}
                        </div>

                        {}
                        {isAdmin && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => startEdit(cat)}
                              className="p-3 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-2xl transition-all">
                              <Edit2 size={18}/>
                            </button>
                            <button onClick={() => handleDelete(cat.id)}
                              className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[60px] border-4 border-dashed border-gray-100 text-gray-300 font-black uppercase italic tracking-widest mt-8">
              Категорій ще немає — додайте першу!
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Categories;