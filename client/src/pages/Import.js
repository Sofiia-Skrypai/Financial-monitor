import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import {
  Upload, FileText, CheckCircle2, Loader2, X,
  User, RefreshCw, AlertTriangle, Link2, ExternalLink,
  CreditCard, Check, ArrowRight, Loader, HelpCircle,
  ChevronLeft, ChevronRight, Unlink, Trash2,
} from 'lucide-react';

const MONO_TOKEN_KEY    = 'mono_token';
const MONO_ACCOUNTS_KEY = 'mono_accounts';
const MONO_SYNCS_KEY    = 'mono_syncs';

const monoCardType     = (t) => ({0:'Чорна',1:'Біла',2:'Platinum',3:'Iron',4:'ФОП',5:'Yellow',8:'Iron'}[t]??'Картка');
const monoCardCurrency = (c) => ({980:'UAH',840:'USD',978:'EUR',826:'GBP'}[c]??String(c));

const parseDate = (raw) => {
  if (!raw) return new Date().toISOString();
  if (typeof raw === 'number') {
    if (raw > 1e9) return new Date(raw * 1000).toISOString();
    const d = new Date(new Date(1899,11,30).getTime() + raw * 86400000);
    if (!isNaN(d)) return d.toISOString();
  }
  if (typeof raw === 'string') {
    const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
    if (m) {
      const y  = m[3].length===2?`20${m[3]}`:m[3];
      const dt = `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}${m[4]?'T'+m[4]:''}`;
      const d  = new Date(dt);
      if (!isNaN(d)) return d.toISOString();
    }
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString();
  }
  if (raw instanceof Date && !isNaN(raw)) return raw.toISOString();
  return new Date().toISOString();
};

const MCC = {
  '5411':'Продукти','5412':'Продукти','5422':'Продукти','5441':'Продукти','5451':'Продукти','5499':'Продукти',
  '5812':'Кафе','5813':'Кафе','5814':'Кафе',
  '7011':'Розваги','7922':'Розваги','7996':'Розваги','7999':'Розваги','5734':'Розваги','4816':'Розваги',
  '4111':'Транспорт','4112':'Транспорт','4121':'Транспорт','4131':'Транспорт','4784':'Транспорт','7523':'Транспорт',
  '5912':'Медицина','8011':'Медицина','8049':'Медицина','8099':'Медицина',
  '5621':'Одяг','5651':'Одяг','5661':'Одяг','5691':'Одяг','5699':'Одяг',
  '4900':'Комунальні послуги','4911':'Комунальні послуги','4941':'Комунальні послуги',
  '6011':'Зарплата','6012':'Зарплата',
  '4829':'Перекази','6051':'Перекази',
};
const guessCategory = (desc='', mcc='') => {
  if (MCC[String(mcc)]) return MCC[String(mcc)];
  const d = desc.toLowerCase();
  if (/atb|сільпо|novus|ашан|fozzy|fora|varus|лоток|продукт/i.test(d)) return 'Продукти';
  if (/uber|bolt|uklon|taxi|таксі|нова пошта|укрпошта|київ цифр/i.test(d)) return 'Транспорт';
  if (/starbucks|mcdonald|kfc|pizza|coffee|cafe|кафе|ресторан|coffeespace/i.test(d)) return 'Кафе';
  if (/netflix|spotify|steam|кіно|cinema|розваг/i.test(d)) return 'Розваги';
  if (/комунал|квартплат|газ|вода|електр/i.test(d)) return 'Комунальні послуги';
  if (/аптека|ліки|лікар|clinic|hospital|медик/i.test(d)) return 'Медицина';
  if (/zara|h&m|одяг|cloth|fashion/i.test(d)) return 'Одяг';
  if (/зарплат|salary|аванс|payroll/i.test(d)) return 'Зарплата';
  if (/від:|на картку|переказ|перевод/i.test(d)) return 'Перекази';
  if (/пенсі/i.test(d)) return 'Пенсія';
  return 'Інше';
};

const parseMonobank = (rows) => rows
  .filter(r => r['Дата'] || r['Опис операції'])
  .map((r,i) => {
    const amt  = parseFloat(String(r['Сума в валюті картки']??r['Сума в валюті транзакції']??0).replace(/\s/g,'').replace(',','.')) || 0;
    const desc = r['Опис операції'] || '';
    const cat  = r['Категорія'] || guessCategory(desc);
    const type = /пенсі/i.test(cat)||/пенсі/i.test(desc) ? 'Пенсійні заощадження' : amt >= 0 ? 'Дохід' : 'Витрата';
    return { _importId:`mono_${Date.now()}_${i}`, date:parseDate(r['Дата']), description:desc, amount:Math.abs(amt), category:cat, type, bank:'monobank', assignedUser:null };
  }).filter(t => t.amount > 0);

const parsePrivatBank = (rows) => rows
  .filter(r => r['Дата i час операції'] || r['Деталі операції'])
  .map((r,i) => {
    const amt  = parseFloat(String(r['Сума в валюті картки (UAH)']??r['Сума в валюті операції']??0).replace(/\s/g,'').replace(',','.')) || 0;
    const desc = r['Деталі операції'] || '';
    const mcc  = String(r['MCC']||'');
    const cat  = guessCategory(desc, mcc);
    const type = /пенсі/i.test(cat)||/пенсі/i.test(desc) ? 'Пенсійні заощадження' : amt >= 0 ? 'Дохід' : 'Витрата';
    return { _importId:`privat_${Date.now()}_${i}`, date:parseDate(r['Дата i час операції']), description:desc, amount:Math.abs(amt), category:cat, type, bank:'privatbank', assignedUser:null };
  }).filter(t => t.amount > 0);

const parseGeneric = (rows) => rows.map((r,i) => {
  const amt  = parseFloat(String(r['Сума']??r['Amount']??0).replace(/\s/g,'').replace(',','.')) || 0;
  const cat  = r['Категорія']||r['Category']||guessCategory(r['Опис']||'');
  const type = cat==='Пенсійні заощадження' ? 'Пенсійні заощадження' : amt >= 0 ? 'Дохід' : 'Витрата';
  return { _importId:`gen_${Date.now()}_${i}`, date:parseDate(r['Дата']||r['Date']), description:r['Опис']||r['Description']||`Імпорт: ${cat}`, amount:Math.abs(amt), category:cat, type, bank:'generic', assignedUser:r['Учасник']||r['User']||null };
}).filter(t => t.amount > 0);

const readSheetRows = (wb) => {
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const all = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
  let headerIdx = 0;
  for (let i = 0; i < Math.min(all.length, 30); i++) {
    if ((all[i]||[]).filter(c => c!==null && c!=='').length >= 4) { headerIdx = i; break; }
  }
  const headers  = all[headerIdx];
  return all.slice(headerIdx+1)
    .map(row => Object.fromEntries(headers.map((h,j)=>[h, row[j]??null])))
    .filter(r => Object.values(r).some(v => v!==null));
};

const detectAndParse = (rows) => {
  if (!rows?.length) return { bank:'generic', transactions:[] };
  const cols = Object.keys(rows[0]).join('|');
  if (cols.includes('Опис операції') && cols.includes('Сума в валюті картки'))
    return { bank:'monobank', transactions:parseMonobank(rows) };
  if (cols.includes('Дата i час операції') || cols.includes('Деталі операції'))
    return { bank:'privatbank', transactions:parsePrivatBank(rows) };
  return { bank:'generic', transactions:parseGeneric(rows) };
};

const fetchMonobankStatement = async (token, accountId, days) => {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const res  = await fetch(`https://api.monobank.ua/personal/statement/${accountId}/${from}/${to}`, {
    headers: { 'X-Token': token },
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).errorDescription || `HTTP ${res.status}`);
  return (await res.json()).map((t,i) => ({
    _importId:    `monosync_${t.id||i}`,
    date:         new Date(t.time*1000).toISOString(),
    description:  t.description || t.comment || 'Monobank',
    amount:       Math.abs(t.amount/100),
    category:     guessCategory(t.description||'', String(t.mcc||'')),
    type:         t.amount < 0 ? 'Витрата' : 'Дохід',
    bank:         'monobank',
    assignedUser: null,
  }));
};

const BANKS_GUIDE = [
  {
    id: 'monobank',
    name: 'Monobank',
    emoji: '🐱',
    color: '#1a1a1a',
    steps: [
      { img: null, text: 'Відкрийте додаток Monobank і натисніть на картку, виписку якої хочете отримати.' },
      { img: null, text: 'Прокрутіть вниз і оберіть «Надіслати виписку за карткою».' },
      { img: null, text: 'Оберіть мову документа — Українська, тип файлу — CSV або XLS, та вкажіть потрібний період.' },
      { img: null, text: 'Натисніть «Продовжити», потім «Надіслати» — файл надійде на вашу пошту або можна зберегти одразу.' },
      { img: null, text: 'Завантажте отриманий файл у FinMonitor через зону завантаження вище.' },
    ],
    note: 'Або скористайтесь вкладкою «Синхронізація API» для автоматичного підключення без завантаження файлів.',
  },
  {
    id: 'privatbank',
    name: 'PrivatBank',
    emoji: '🟢',
    color: '#008000',
    steps: [
      { img: null, text: 'Відкрийте додаток Privat24 або сайт privatbank.ua.' },
      { img: null, text: 'Перейдіть на вкладку «Картки» (нижня панель) і оберіть потрібну картку.' },
      { img: null, text: 'Натисніть «Історія» внизу екрана.' },
      { img: null, text: 'У правому верхньому куті натисніть три крапки (⋮) → «Отримати історію операцій».' },
      { img: null, text: 'Вкажіть email, оберіть картки та період — натисніть «Надіслати». Файл надійде на пошту у форматі XLS.' },
      { img: null, text: 'Завантажте отриманий файл у FinMonitor — формат розпізнається автоматично.' },
    ],
    note: 'Пряме API-підключення PrivatBank недоступне — потрібна серверна авторизація. Використовуйте файловий імпорт.',
  },
  {
    id: 'custom',
    name: 'Власний формат',
    emoji: '📊',
    color: '#6366f1',
    steps: [
      { img: null, text: 'Підготуйте Excel або CSV файл з такими колонками:' },
      { img: null, text: '• Сума — числове значення (+ дохід, − витрата)' },
      { img: null, text: '• Опис — текстовий опис операції' },
      { img: null, text: '• Категорія — назва категорії (необов\'язково)' },
      { img: null, text: '• Учасник — ім\'я учасника (необов\'язково)' },
      { img: null, text: '• Дата — дата у форматі дд.мм.рррр' },
    ],
    note: 'Якщо колонки відповідають формату Monobank або PrivatBank — вони розпізнаються автоматично.',
  },
];

const InstructionsModal = ({ onClose }) => {
  const [selectedBank, setSelectedBank] = useState(null);
  const [step, setStep]                 = useState(0);

  const bank = BANKS_GUIDE.find(b => b.id === selectedBank);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden" style={{maxHeight:'90vh'}}>

        {}
        <div className="flex items-center justify-between p-7 pb-5 border-b border-gray-100">
          {selectedBank && (
            <button onClick={() => { setSelectedBank(null); setStep(0); }}
              className="p-2 text-gray-400 hover:text-gray-700 transition-all -ml-1">
              <ChevronLeft size={20}/>
            </button>
          )}
          <div className="flex-1">
            <h3 className="font-black text-gray-900 text-lg tracking-tighter">
              {selectedBank ? `Як отримати виписку — ${bank?.name}` : 'Як отримати виписку?'}
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {selectedBank ? `Крок ${step+1} з ${bank?.steps.length}` : 'Оберіть свій банк'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-300 hover:text-red-400 transition-all">
            <X size={22}/>
          </button>
        </div>

        <div className="overflow-y-auto" style={{maxHeight:'calc(90vh - 80px)'}}>
          {}
          {!selectedBank && (
            <div className="p-7 space-y-3">
              {BANKS_GUIDE.map(b => (
                <button key={b.id} onClick={() => { setSelectedBank(b.id); setStep(0); }}
                  className="w-full flex items-center gap-4 p-5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-3xl text-left transition-all group">
                  <span className="text-3xl flex-shrink-0">{b.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-base group-hover:text-indigo-700 transition-colors">{b.name}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {b.id === 'monobank' ? 'Виписка у файлі або пряма синхронізація' :
                       b.id === 'privatbank' ? 'Виписка через Privat24' : 'Excel / CSV свого формату'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors"/>
                </button>
              ))}
            </div>
          )}

          {}
          {selectedBank && bank && (
            <div className="p-7">
              {}
              <div className="space-y-3 mb-6">
                {bank.steps.map((s, i) => (
                  <div key={i}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                      i === step
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : i < step
                          ? 'border-emerald-100 bg-emerald-50/60'
                          : 'border-gray-100 bg-gray-50'
                    }`}
                    onClick={() => setStep(i)}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs mt-0.5 ${
                      i < step  ? 'bg-emerald-500 text-white' :
                      i === step ? 'bg-indigo-600 text-white' :
                                   'bg-gray-200 text-gray-500'
                    }`}>
                      {i < step ? <Check size={12}/> : i+1}
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      i === step ? 'font-bold text-indigo-800' :
                      i < step  ? 'font-medium text-emerald-700' :
                                  'font-medium text-gray-500'
                    }`}>{s.text}</p>
                  </div>
                ))}
              </div>

              {}
              {bank.note && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs font-bold text-amber-700 leading-relaxed">💡 {bank.note}</p>
                </div>
              )}

              {}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step === 0}
                  className="flex-1 py-3 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-wider text-gray-400 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center gap-2">
                  <ChevronLeft size={14}/> Назад
                </button>
                {step < bank.steps.length - 1 ? (
                  <button onClick={() => setStep(s => s+1)}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-700 flex items-center justify-center gap-2">
                    Далі <ChevronRight size={14}/>
                  </button>
                ) : (
                  <button onClick={onClose}
                    className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-600 flex items-center justify-center gap-2">
                    <Check size={14}/> Зрозуміло
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AssignModal = ({ transactions, participants, onConfirm, onCancel }) => {
  const [assignments, setAssignments] = useState(() =>
    transactions.reduce((a,t) => ({...a,[t._importId]:t.assignedUser||''}),{})
  );
  const [bulkUser, setBulkUser] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="p-8 pb-0 flex-shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">Призначити учасників</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Знайдено <strong>{transactions.length}</strong> операцій — вкажіть, хто здійснив кожен платіж
              </p>
            </div>
            <button onClick={onCancel} className="p-2 text-gray-300 hover:text-red-400"><X size={24}/></button>
          </div>
          <div className="flex gap-3 mt-5 mb-5 p-4 bg-indigo-50 rounded-2xl items-center">
            <User size={15} className="text-indigo-500 flex-shrink-0"/>
            <p className="text-xs font-bold text-indigo-700 flex-shrink-0">Всі одному учаснику:</p>
            <select value={bulkUser} onChange={e=>setBulkUser(e.target.value)}
              className="flex-1 p-2 bg-white rounded-xl border border-indigo-200 outline-none font-bold text-sm cursor-pointer">
              <option value="">— оберіть —</option>
              {participants.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <button onClick={() => { if(bulkUser) setAssignments(transactions.reduce((a,t)=>({...a,[t._importId]:bulkUser}),{})); }}
              disabled={!bulkUser}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
              <Check size={12}/> Застосувати
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-8">
          <div className="space-y-2 pb-2">
            {transactions.map(t => (
              <div key={t._importId} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">{new Date(t.date).toLocaleDateString('uk-UA')}</span>
                    <span className={`text-[10px] font-black ${t.type==='Дохід'?'text-emerald-600':'text-red-500'}`}>
                      {t.type==='Дохід'?'+':'−'}₴{t.amount.toLocaleString('uk-UA')}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-lg font-bold">{t.category}</span>
                  </div>
                </div>
                <select value={assignments[t._importId]||''} onChange={e=>setAssignments(p=>({...p,[t._importId]:e.target.value}))}
                  className={`p-2 rounded-xl border outline-none font-bold text-sm cursor-pointer flex-shrink-0 ${assignments[t._importId]?'bg-orange-50 border-orange-200 text-orange-700':'bg-white border-gray-200 text-gray-400'}`}
                  style={{minWidth:130}}>
                  <option value="">Не призначено</option>
                  {participants.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="p-8 pt-5 flex-shrink-0 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">
              Призначено: {Object.values(assignments).filter(Boolean).length} / {transactions.length}
            </p>
            <div className="flex gap-3">
              <button onClick={onCancel}
                className="px-6 py-3 border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-wider text-gray-500 hover:bg-gray-50">
                Скасувати
              </button>
              <button onClick={() => onConfirm(transactions.map(t=>({...t,assignedUser:assignments[t._importId]||'Система'})))}
                className="px-8 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 flex items-center gap-2">
                <ArrowRight size={14}/> Імпортувати {transactions.length}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MonobankSyncPanel = ({ appAccounts, onFetched }) => {
  const [token, setToken]           = useState(() => localStorage.getItem(MONO_TOKEN_KEY)||'');
  const [monoAccs, setMonoAccs]     = useState(() => { try { return JSON.parse(localStorage.getItem(MONO_ACCOUNTS_KEY)||'[]'); } catch { return []; } });
  const [syncs, setSyncs]           = useState(() => { try { return JSON.parse(localStorage.getItem(MONO_SYNCS_KEY)||'[]'); } catch { return []; } });
  const [clientName, setClientName] = useState('');
  const [step, setStep]             = useState(monoAccs.length>0 ? 'manage' : 'token');
  const [selectedMonoId, setSelectedMonoId] = useState('');
  const [selectedAppAcc, setSelectedAppAcc] = useState(appAccounts[0]?.name||'');
  const [days, setDays]             = useState(30);
  const [loading, setLoading]       = useState(false);
  const [syncingId, setSyncingId]   = useState(null);
  const [error, setError]           = useState('');

  const saveSyncs = (updated) => {
    setSyncs(updated);
    localStorage.setItem(MONO_SYNCS_KEY, JSON.stringify(updated));
  };

  const connect = async () => {
    setError(''); setLoading(true);
    try {
      const res  = await fetch('https://api.monobank.ua/personal/client-info', { headers:{'X-Token':token.trim()} });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).errorDescription||`HTTP ${res.status}`);
      const data = await res.json();
      setClientName(data.name||'');
      const accs = data.accounts||[];
      setMonoAccs(accs);
      setSelectedMonoId(accs[0]?.id||'');
      localStorage.setItem(MONO_TOKEN_KEY, token.trim());
      localStorage.setItem(MONO_ACCOUNTS_KEY, JSON.stringify(accs));
      setStep('manage');
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const addSync = () => {
    if (!selectedMonoId || !selectedAppAcc) return;
    const acc = monoAccs.find(a => a.id === selectedMonoId);
    if (!acc) return;

    if (syncs.some(s => s.monoAccountId === selectedMonoId)) {
      setError('Ця картка вже додана до синхронізацій.'); return;
    }
    const entry = {
      id:             `sync_${Date.now()}`,
      monoAccountId:  selectedMonoId,
      label:          `${monoCardType(acc.type)} · ${acc.maskedPan?.[0]??'••••'}`,
      balance:        acc.balance / 100,
      currency:       monoCardCurrency(acc.currencyCode),
      appAccountName: selectedAppAcc,
      lastSync:       null,
    };
    saveSyncs([...syncs, entry]);
    setError('');
  };

  const removeSync = (id) => {
    if (!window.confirm('Видалити цю синхронізацію?')) return;
    saveSyncs(syncs.filter(s => s.id !== id));
  };

  const runSync = async (syncEntry) => {
    setSyncingId(syncEntry.id); setError('');
    try {
      const txs = await fetchMonobankStatement(token.trim(), syncEntry.monoAccountId, days);

      const tagged = txs.map(t => ({ ...t, _linkedAccount: syncEntry.appAccountName }));
      saveSyncs(syncs.map(s => s.id===syncEntry.id ? {...s, lastSync: new Date().toISOString()} : s));
      onFetched(tagged, syncEntry.appAccountName);
    } catch(e) { setError(`Помилка синхронізації: ${e.message}`); }
    setSyncingId(null);
  };

  const disconnectAll = () => {
    if (!window.confirm('Від\'єднати Monobank? Усі налаштування синхронізації буде видалено.')) return;
    localStorage.removeItem(MONO_TOKEN_KEY);
    localStorage.removeItem(MONO_ACCOUNTS_KEY);
    localStorage.removeItem(MONO_SYNCS_KEY);
    setMonoAccs([]); setSyncs([]); setToken(''); setClientName(''); setStep('token');
  };

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">

      <div className="flex items-center gap-4 p-7 pb-5 border-b border-gray-100">
        <span className="text-2xl">🐱</span>
        <div>
          <p className="font-black text-gray-900 text-base">Monobank — пряма синхронізація</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Через офіційний Open API · лише Monobank</p>
        </div>
        {step === 'manage' && (
          <button onClick={disconnectAll}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-600 transition-all">
            <Unlink size={12}/> Від'єднати
          </button>
        )}
        {step === 'token' && (
          <a href="https://api.monobank.ua" target="_blank" rel="noopener noreferrer"
            className="ml-auto text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
            Отримати токен <ExternalLink size={10}/>
          </a>
        )}
      </div>

      <div className="p-7 space-y-5">

        {step === 'token' && (
          <>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Авторизуйтесь на{' '}
              <a href="https://api.monobank.ua" target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 font-black underline-offset-2 underline inline-flex items-center gap-0.5">
                api.monobank.ua<ExternalLink size={10}/>
              </a>
              {' '}та вставте персональний токен:
            </p>
            <div className="flex gap-2">
              <input type="password" value={token} onChange={e=>{setToken(e.target.value);setError('');}}
                placeholder="u••••••••••••••••••"
                onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),connect())}
                className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-mono text-sm focus:ring-2 ring-indigo-400"/>
              <button onClick={connect} disabled={loading||!token.trim()}
                className="px-5 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2">
                {loading ? <Loader size={14} className="animate-spin"/> : <Link2 size={14}/>}
                Підключити
              </button>
            </div>
          </>
        )}


        {step === 'manage' && (
          <>

            {clientName && (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0"/>
                <p className="text-xs font-bold text-emerald-700 flex-1">Підключено: {clientName}</p>
              </div>
            )}


            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Додати синхронізацію</p>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Картка Monobank</label>
                <select value={selectedMonoId} onChange={e=>setSelectedMonoId(e.target.value)}
                  className="w-full p-3.5 bg-white rounded-2xl border border-gray-200 outline-none font-bold text-sm cursor-pointer focus:ring-2 ring-indigo-400">
                  <option value="">— оберіть картку —</option>
                  {monoAccs.map(a => (
                    <option key={a.id} value={a.id}>
                      {monoCardType(a.type)} · {a.maskedPan?.[0]??'••••'} · {(a.balance/100).toLocaleString('uk-UA')} {monoCardCurrency(a.currencyCode)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Рахунок у FinMonitor
                </label>
                <select value={selectedAppAcc} onChange={e=>setSelectedAppAcc(e.target.value)}
                  className="w-full p-3.5 bg-white rounded-2xl border border-gray-200 outline-none font-bold text-sm cursor-pointer focus:ring-2 ring-indigo-400">
                  {appAccounts.length > 0
                    ? appAccounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)
                    : <option>Немає рахунків — спочатку створіть рахунок</option>}
                </select>
              </div>

              <button onClick={addSync} disabled={!selectedMonoId||!selectedAppAcc||appAccounts.length===0}
                className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                <Link2 size={13}/> Додати підключення
              </button>
            </div>


            {syncs.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Активні синхронізації</p>


                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Глибина синхронізації: <span className="text-indigo-500">{days} днів</span>
                  </label>
                  <div className="flex gap-2">
                    {[7,14,30,60,90].map(d=>(
                      <button key={d} type="button" onClick={()=>setDays(d)}
                        className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${days===d?'bg-black text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {d}д
                      </button>
                    ))}
                  </div>
                </div>

                {syncs.map(s => (
                  <div key={s.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <span className="text-xl flex-shrink-0">🐱</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-800 text-sm">{s.label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <CreditCard size={9}/> {s.appAccountName}
                        </span>
                        {s.lastSync && (
                          <span className="text-[10px] text-gray-300 font-medium">
                            · синхр. {new Date(s.lastSync).toLocaleDateString('uk-UA')} {new Date(s.lastSync).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => runSync(s)} disabled={!!syncingId}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-100 transition-all disabled:opacity-50">
                        {syncingId === s.id
                          ? <Loader2 size={12} className="animate-spin"/>
                          : <RefreshCw size={12}/>}
                        Синхр.
                      </button>
                      <button onClick={() => removeSync(s.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {syncs.length === 0 && (
              <div className="text-center py-6 text-gray-300">
                <p className="font-black text-xs uppercase tracking-widest">Немає активних синхронізацій</p>
                <p className="text-[10px] font-medium mt-1">Додайте підключення вище</p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl border border-red-100">
            <AlertTriangle size={13} className="text-red-500 flex-shrink-0"/>
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};


const Import = ({ user }) => {
  const [appAccounts, setAppAccounts]         = useState([]);
  const [participants, setParticipants]       = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading]                 = useState(true);
  const [activeTab, setActiveTab]             = useState('file');
  const [pendingTxs, setPendingTxs]           = useState(null);
  const [pendingAccount, setPendingAccount]   = useState(''); // account from sync
  const [importStatus, setImportStatus]       = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [accs, users] = await Promise.all([apiService.getAccounts(), apiService.getUsers()]);
      setAppAccounts(accs); setParticipants(users);
      if (accs.length > 0) setSelectedAccount(accs[0].name);
      setLoading(false);
    })();
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type:'binary', cellDates:true });
        const rows = readSheetRows(wb);
        if (!rows.length) { alert('Файл порожній або має непідтримуваний формат.'); return; }
        const { transactions } = detectAndParse(rows);
        if (!transactions.length) { alert('Не вдалося знайти транзакції у файлі.'); return; }
        setPendingAccount(selectedAccount);
        setPendingTxs(transactions);
      } catch(err) { console.error(err); alert('Помилка читання файлу.'); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleSyncFetched = (txs, linkedAccount) => {
    setPendingAccount(linkedAccount);
    setPendingTxs(txs);
  };

  const handleImportConfirmed = async (txs) => {
    const account = pendingAccount || selectedAccount;
    const entries = txs.map((t, i) => ({
      id: `${Date.now()}_${i}`,
      date: t.date, description: t.description,
      amount: t.amount, category: t.category, type: t.type,
      account,
      userName: t.assignedUser || 'Система',
    }));

    entries.filter(e=>e.type==='Пенсійні заощадження').forEach(e=>{
      try {
        const s = JSON.parse(localStorage.getItem('fin_pension_savings_local')||'{"total":0,"history":[]}');
        s.total = (s.total||0)+e.amount;
        s.history = [{id:e.id,amount:e.amount,note:e.description,date:e.date},...(s.history||[])];
        localStorage.setItem('fin_pension_savings_local', JSON.stringify(s));
      } catch(_) {}
    });

    const existing = await apiService.getHistory();
    localStorage.setItem('fin_history_local', JSON.stringify([...entries, ...existing]));
    setPendingTxs(null); setPendingAccount('');
    setImportStatus({ count: entries.length, account });
    setTimeout(() => setImportStatus(null), 7000);
  };

  if (loading) return (
    <div className="ml-64 flex items-center justify-center h-screen bg-[#f8f9fc]">
      <Loader2 className="animate-spin text-indigo-600" size={40}/>
    </div>
  );

  return (
    <>
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)}/>}
      {pendingTxs && (
        <AssignModal
          transactions={pendingTxs}
          participants={participants}
          onConfirm={handleImportConfirmed}
          onCancel={() => { setPendingTxs(null); setPendingAccount(''); }}
        />
      )}

      <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
        <div className="max-w-3xl mx-auto">


          <div className="flex items-start justify-between mb-10">
            <div>
              <h2 className="text-4xl font-black mb-2 flex items-center gap-4 uppercase tracking-tighter italic">
                <Upload className="text-indigo-600" size={38}/> Імпорт операцій
              </h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                Банківські виписки та власні файли
              </p>
            </div>

            <button onClick={() => setShowInstructions(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
              <HelpCircle size={15}/> Як отримати виписку?
            </button>
          </div>


          {importStatus && (
            <div className="mb-6 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4">
              <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0"/>
              <p className="font-black text-emerald-700 text-sm">
                Успішно імпортовано <strong>{importStatus.count}</strong> операцій
                {importStatus.account && <span className="font-medium text-emerald-600"> → {importStatus.account}</span>}
              </p>
            </div>
          )}


          {activeTab === 'file' && (
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-6 flex items-center gap-4">
              <CreditCard size={18} className="text-gray-400 flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Зарахувати на рахунок</p>
                <select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-black text-sm cursor-pointer text-gray-800">
                  {appAccounts.length > 0
                    ? appAccounts.map(a=><option key={a.id} value={a.name}>{a.name}</option>)
                    : <option>Немає активних рахунків</option>}
                </select>
              </div>
            </div>
          )}


          <div className="flex bg-white border border-gray-100 rounded-3xl p-1.5 mb-6 shadow-sm">
            {[
              ['file', (
                <span key="file-label" className="flex items-center justify-center gap-2">

                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 2C3 1.44772 3.44772 1 4 1H9L13 5V14C13 14.5523 12.5523 15 12 15H4C3.44772 15 3 14.5523 3 14V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M9 1V5H13" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M6 8H10M6 11H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Банківська виписка / Файл
                </span>
              )],
              ['sync', (
                <span key="sync-label" className="flex items-center justify-center gap-2">

                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 6.5L11 5M5 9.5L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M9.5 3.5L11 5L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.5 9L5 10.5L6.5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Синхронізація API
                </span>
              )],
            ].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab===k?'bg-black text-white shadow-md':'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {}
          {activeTab === 'file' && (
            <div className="space-y-5">
              {}
              <label className="block border-2 border-dashed border-gray-200 p-14 text-center rounded-[40px] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group">
                <div className="flex flex-col items-center">
                  <div className="bg-gray-50 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-white transition-all shadow-sm" style={{width:72,height:72}}>
                    <FileText size={36} className="text-indigo-200 group-hover:text-indigo-600 transition-colors"/>
                  </div>
                  <p className="font-black text-gray-400 uppercase tracking-widest text-xs group-hover:text-indigo-600 mb-1">
                    Перетягніть файл або натисніть для вибору
                  </p>
                  <p className="text-[10px] text-gray-300 uppercase font-bold mb-2">XLS · XLSX · CSV</p>
                  <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">
                    Формат банківської виписки визначається автоматично
                  </p>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFile}/>
              </label>

              {}
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setShowInstructions(true)}
                  className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-all underline underline-offset-2">
                  <HelpCircle size={13}/> Де знайти виписку в банківському додатку?
                </button>
              </div>
            </div>
          )}

          {}
          {activeTab === 'sync' && (
            <MonobankSyncPanel appAccounts={appAccounts} onFetched={handleSyncFetched}/>
          )}

        </div>
      </div>
    </>
  );
};

export default Import;