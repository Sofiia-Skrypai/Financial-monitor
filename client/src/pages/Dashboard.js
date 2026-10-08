import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import {
  Wallet, LineChart as LineIcon, PieChart as PieIcon,
  ChevronLeft, ChevronRight, CreditCard, X, Save, Download,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Legend,
} from 'recharts';

const RATE_STORAGE_KEY = 'fin_exchange_rates';
const DEFAULT_RATES    = { USD: 41.5, EUR: 45.0 };
const readRates = () => {
  try { return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY)) ?? DEFAULT_RATES; }
  catch { return DEFAULT_RATES; }
};

const toUAH = (amount, currency, rates) => {
  const cur = String(currency).toUpperCase();
  if (cur === 'UAH') return amount;
  const rate = rates[cur];
  return rate ? amount * rate : amount;
};

const C_INCOME  = '#10b981';
const C_BALANCE = '#f59e0b';
const C_EXPENSE = '#ef4444';
const CAT_COLORS = ['#f97316','#0ea5e9','#6366f1','#10b981','#f43f5e','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#64748b'];
const MEMBER_COLORS = ['#f97316','#6366f1','#10b981','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6'];

const Gauge = ({ value, color, label, max }) => {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(Math.abs(value) / safeMax, 1);
  const cx = 70, cy = 70, R = 55, SW = 12;
  const START = 180, TOTAL = 180;
  const toRad = d => (d * Math.PI) / 180;
  const sx = cx + R * Math.cos(toRad(START));
  const sy = cy + R * Math.sin(toRad(START));
  const ex = cx + R * Math.cos(toRad(0));
  const ey = cy + R * Math.sin(toRad(0));
  const activeDeg = START + pct * TOTAL;
  const ax = cx + R * Math.cos(toRad(activeDeg));
  const ay = cy + R * Math.sin(toRad(activeDeg));
  const largeArc = pct * TOTAL > 180 ? 1 : 0;
  const arc = (x1,y1,x2,y2,la) => `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${la} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  const fmt = v => { const a = Math.abs(v); if(a>=1e6) return `${(a/1e6).toFixed(1)}M`; if(a>=1000) return `${(a/1000).toFixed(1)}k`; return a.toLocaleString('uk-UA',{maximumFractionDigits:0}); };
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100%'}}>
      <svg viewBox="0 0 140 90" width="100%" style={{maxWidth:160}}>
        <path d={arc(sx,sy,ex,ey,0)} fill="none" stroke="#e5e7eb" strokeWidth={SW} strokeLinecap="round"/>
        {pct > 0.001 && <path d={arc(sx,sy,ax,ay,largeArc)} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" style={{transition:'all 0.6s ease'}}/>}
        <text x={cx} y={cy-10} textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">{fmt(value)}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fontWeight="800" fill={color} style={{textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</text>
      </svg>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{background:'#fff',borderRadius:16,padding:'10px 16px',boxShadow:'0 8px 30px rgba(0,0,0,0.12)',fontSize:11,fontWeight:900,minWidth:110}}>
      <p style={{color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4,fontSize:9}}>{label}</p>
      <p style={{color: val>=0 ? C_INCOME : C_EXPENSE, fontSize:15}}>{val>=0?'+':''}₴{Number(val).toLocaleString('uk-UA',{maximumFractionDigits:0})}</p>
    </div>
  );
};

const _rfRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const _rfBuildTree = (X, y) => {
  const n = y.length;
  if (n === 0) return { leaf: true, value: 0 };
  if (n === 1) return { leaf: true, value: y[0] };
  const mean = y.reduce((a, b) => a + b, 0) / n;
  const variance = y.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  if (variance < 1e-9) return { leaf: true, value: mean };
  const idx = X.map((_, i) => i).sort((a, b) => X[a][0] - X[b][0]);
  const sx = idx.map(i => X[i][0]);
  const sy = idx.map(i => y[i]);
  let bestGain = -Infinity, bestSplit = -1, bestThr = null;
  let sumL = 0, sumSqL = 0;
  const tot = sy.reduce((a, b) => a + b, 0);
  const totSq = sy.reduce((a, b) => a + b * b, 0);
  for (let i = 0; i < n - 1; i++) {
    sumL += sy[i]; sumSqL += sy[i] * sy[i];
    if (sx[i] === sx[i + 1]) continue;
    const sumR = tot - sumL, sumSqR = totSq - sumSqL, nL = i + 1, nR = n - nL;
    const varL = sumSqL / nL - (sumL / nL) ** 2;
    const varR = sumSqR / nR - (sumR / nR) ** 2;
    const wVar = (nL * varL + nR * varR) / n;
    const gain = variance - wVar;
    if (gain > bestGain) { bestGain = gain; bestSplit = i; bestThr = (sx[i] + sx[i + 1]) / 2; }
  }
  if (bestSplit < 0 || bestGain <= 1e-12) return { leaf: true, value: mean };
  const lI = idx.slice(0, bestSplit + 1), rI = idx.slice(bestSplit + 1);
  return {
    leaf: false, threshold: bestThr,
    left:  _rfBuildTree(lI.map(i => X[i]), lI.map(i => y[i])),
    right: _rfBuildTree(rI.map(i => X[i]), rI.map(i => y[i])),
  };
};
const _rfPredictTree = (t, x) => t.leaf ? t.value : (x[0] <= t.threshold ? _rfPredictTree(t.left, x) : _rfPredictTree(t.right, x));
const _rfTrain = (X, y, nEstimators = 100, seed = 42) => {
  const rng = _rfRng(seed);
  const n = X.length;
  const trees = [];
  for (let t = 0; t < nEstimators; t++) {
    const Xs = [], ys = [];
    for (let j = 0; j < n; j++) {
      const i = Math.floor(rng() * n);
      Xs.push(X[i]); ys.push(y[i]);
    }
    trees.push(_rfBuildTree(Xs, ys));
  }
  return trees;
};
const _rfPredict = (trees, x) => {
  let s = 0;
  for (const t of trees) s += _rfPredictTree(t, x);
  return s / trees.length;
};

const runMLEngine = (history, selectedUser, selectedPeriod) => {
  const now = new Date();


  const filtered = history.filter(t => {
    const diff = (now - new Date(t.date)) / 86400000;
    return (selectedUser === 'all' || t.userName === selectedUser) && diff <= Number(selectedPeriod) && diff >= 0;
  });


  const allHistory = selectedUser === 'all' ? history : history.filter(t => t.userName === selectedUser);




  const expenseHistory = allHistory.filter(t => t.type === 'Витрата');

  const monthMap = {};
  expenseHistory.forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthMap[key] = (monthMap[key] || 0) + Math.abs(Number(t.amount));
  });
  const monthKeys = Object.keys(monthMap).sort();
  const monthVals = monthKeys.map(k => monthMap[k]);

  let forecastNextMonth = 0;
  let rmse = null;
  let r2   = null;
  let accuracyPct = null;
  let modelName = 'Random Forest';

  if (monthVals.length >= 3) {

    const n = monthVals.length;
    const X = monthVals.map((_, i) => [i]);
    const trees = _rfTrain(X, monthVals, 100, 42);


    const preds = X.map(x => _rfPredict(trees, x));
    const meanY = monthVals.reduce((a, b) => a + b, 0) / n;
    const ssRes = monthVals.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
    const ssTot = monthVals.reduce((s, y) => s + (y - meanY) ** 2, 0);
    rmse = Math.sqrt(ssRes / n);
    r2   = ssTot > 0 ? 1 - ssRes / ssTot : 1;


    const mape = monthVals.reduce((s, y, i) =>
      s + (Math.abs(y) > 1e-9 ? Math.abs((y - preds[i]) / y) : 0), 0) / n;
    accuracyPct = Math.max(0, Math.min(100, (1 - mape) * 100));


    forecastNextMonth = Math.max(0, _rfPredict(trees, [n]));
  } else if (expenseHistory.length > 0) {

    const totalAmt = expenseHistory.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const dates    = expenseHistory.map(t => new Date(t.date).getTime());
    const daySpan  = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / 86400000 + 1);
    forecastNextMonth = Math.round((totalAmt / daySpan) * 30);
    modelName = 'Орієнтовний прогноз';
  }


  const catMap = {};
  filtered.filter(t => t.type === 'Витрата').forEach(t => {
    const cat = t.category || 'Інше';
    catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
  });
  const totalExpense = Object.values(catMap).reduce((a,b) => a+b, 0);
  const income       = filtered.filter(t => t.type === 'Дохід').reduce((s,t) => s+Number(t.amount), 0);




  const catsSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const recommendations = catsSorted
    .filter(([, amt]) => amt > 0)
    .map(([cat, amt]) => {
      const share     = totalExpense > 0 ? amt / totalExpense : 0;
      const cutPct    = Math.min(Math.round(10 + share * 80), 30);
      const cut       = Math.round(amt * cutPct / 100);
      return { category: cat, current: Math.round(amt), cut, pct: cutPct };
    });

  const totalPossibleSave = recommendations.reduce((s, r) => s + r.cut, 0);
  const savePct = totalExpense > 0 ? (totalPossibleSave / totalExpense) * 100 : 0;


  const balance = income - totalExpense;
  const ratio   = income > 0 ? totalExpense / income : 1;
  const summaryLines = [];


  const todayDate = new Date();
  const nextMonthNames = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
  const nextMonthName = nextMonthNames[(todayDate.getMonth() + 1) % 12];

  if (income === 0 && totalExpense === 0) {
    summaryLines.push({ icon:'ℹ️', text:'Транзакцій за обраний період не знайдено. Додайте доходи та витрати, щоб побачити аналіз.', type:'info' });
  } else {

    if (balance >= 0) {
      summaryLines.push({
        icon:'✅',
        text:`За обраний період ваші доходи (₴${income.toLocaleString('uk-UA',{maximumFractionDigits:0})}) перевищили витрати (₴${totalExpense.toLocaleString('uk-UA',{maximumFractionDigits:0})}) — залишок склав ₴${balance.toLocaleString('uk-UA',{maximumFractionDigits:0})}. Це означає, що ви витратили менше, ніж заробили. Гарний результат!`,
        type:'good',
      });
    } else {
      const deficit = Math.abs(balance);
      summaryLines.push({
        icon:'⚠️',
        text:`За обраний період витрати (₴${totalExpense.toLocaleString('uk-UA',{maximumFractionDigits:0})}) перевищили доходи (₴${income.toLocaleString('uk-UA',{maximumFractionDigits:0})}) на ₴${deficit.toLocaleString('uk-UA',{maximumFractionDigits:0})}. Якщо так буде продовжуватись, заощадження зменшуватимуться. Варто переглянути найбільші статті витрат.`,
        type:'bad',
      });
    }


    if (income > 0) {
      const monthly = Math.round(income * 0.10);
      if (ratio > 0.9) {
        const overAmt = Math.round(totalExpense - income * 0.8);
        summaryLines.push({
          icon:'🔴',
          text:`Ви витрачаєте ${Math.round(ratio*100)}% від того, що заробляєте — це дуже багато. Фінансові консультанти рекомендують тримати витрати в межах 70–80% доходу. Спробуйте скоротити розваги та кафе бодай на ₴${overAmt.toLocaleString('uk-UA')} — це одразу покращить ситуацію.`,
          type:'bad',
        });
      } else if (ratio > 0.7) {
        summaryLines.push({
          icon:'🟡',
          text:`Витрати займають ${Math.round(ratio*100)}% вашого доходу — є невеликий простір для маневру. Якщо відкладати хоча б ₴${monthly.toLocaleString('uk-UA')} щомісяця (це 10% заробітку), за рік накопичиться ₴${(monthly*12).toLocaleString('uk-UA')} — наприклад, на відпустку або резервний фонд.`,
          type:'warn',
        });
      } else {
        summaryLines.push({
          icon:'🟢',
          text:`Ви витрачаєте лише ${Math.round(ratio*100)}% доходу — це чудово! Залишок (${100-Math.round(ratio*100)}%) можна відкладати. Наприклад, ₴${monthly.toLocaleString('uk-UA')} на місяць — це ₴${(monthly*12).toLocaleString('uk-UA')} накопичень за рік без жодних обмежень у звичних витратах.`,
          type:'good',
        });
      }
    }


    if (forecastNextMonth > 0) {
      const diff = forecastNextMonth - Math.round(totalExpense);
      const diffSign = diff > 0 ? '+' : '';
      summaryLines.push({
        icon:'📈',
        text:`На основі вашої фінансової історії система прогнозує, що у ${nextMonthName} ви витратите приблизно ₴${Math.round(forecastNextMonth).toLocaleString('uk-UA')}. ${Math.abs(diff) > 500 ? `Це ${diff > 0 ? 'більше' : 'менше'} за поточний період на ₴${Math.abs(diff).toLocaleString('uk-UA')} (${diffSign}${Math.round(diff/Math.max(totalExpense,1)*100)}%).` : 'Майже так само, як зараз.'}`,
        type:'info',
      });
    }
  }

  return { forecastNextMonth: Math.round(forecastNextMonth), rmse, r2, accuracyPct, modelName, recommendations, totalPossibleSave, savePct, summaryLines, totalExpense, income };
};

const buildParticipantPieData = (history, period) => {
  const now = new Date();
  const filtered = history.filter(t => {
    const diff = (now - new Date(t.date)) / 86400000;
    return diff <= Number(period) && diff >= 0;
  });
  const incomeByUser  = {};
  const expenseByUser = {};
  filtered.forEach(t => {
    const u = t.userName || 'Невідомо';
    if (t.type === 'Дохід')    incomeByUser[u]  = (incomeByUser[u]  || 0) + Number(t.amount);
    if (t.type === 'Витрата')  expenseByUser[u] = (expenseByUser[u] || 0) + Number(t.amount);
  });
  const allNames = new Set([...Object.keys(incomeByUser), ...Object.keys(expenseByUser)]);
  return Array.from(allNames).map(name => ({
    name,
    income:  Math.round(incomeByUser[name]  || 0),
    expense: Math.round(expenseByUser[name] || 0),
  }));
};

const MLModalInner = ({ mlResult, onClose, accuracyLabel, deviationText, typeIcon, getCatIcon, IcoForecast, IcoAccuracy }) => {
  const [recIndex, setRecIndex] = React.useState(0);
  const recs = mlResult.recommendations;
  const rec  = recs[recIndex] ?? null;
  const total = recs.length;

  const barColor = rec
    ? (rec.pct >= 25 ? '#ef4444' : rec.pct >= 15 ? '#f97316' : '#f59e0b')
    : '#f97316';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-[50px] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto" style={{maxHeight:'90vh'}}>


        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#1e3a8a,#4338ca)'}}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 16 L8 10 L12 13 L16 6 L20 8" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="8" r="2" fill="#fbbf24"/>
                <line x1="4" y1="19" x2="20" y2="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">Аналіз вашого бюджету</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Персональні рекомендації на основі ваших даних</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-300 hover:text-red-500 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>


        <div className="space-y-3 mb-6">
          {mlResult.summaryLines.map((l, i) => {
            const bgMap  = { good:'bg-emerald-50', bad:'bg-red-50', warn:'bg-amber-50', info:'bg-blue-50' };
            const txtMap = { good:'text-emerald-800', bad:'text-red-800', warn:'text-amber-800', info:'text-blue-800' };
            const sub    = { good:'text-emerald-600', bad:'text-red-500', warn:'text-amber-600', info:'text-blue-500' };
            const brd    = { good:'border-emerald-100', bad:'border-red-100', warn:'border-amber-100', info:'border-blue-100' };
            const t      = l.type || 'info';
            return i % 2 === 0 ? (
              <div key={i} className={`${bgMap[t]} border ${brd[t]} rounded-3xl p-5 flex items-center gap-4`}>
                <div className={`flex-shrink-0 ${sub[t]}`} style={{width:28,height:28}}>{typeIcon(t)}</div>
                <p className={`text-sm font-semibold ${txtMap[t]} leading-relaxed`}>{l.text}</p>
              </div>
            ) : (
              <div key={i} className={`${bgMap[t]} border ${brd[t]} rounded-3xl p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${sub[t]}`} style={{width:20,height:20}}>{typeIcon(t)}</div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${sub[t]}`}>
                    {t==='bad'?'Увага':t==='warn'?'Є куди рости':t==='good'?'Все добре':'До вашого відома'}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${txtMap[t]} leading-relaxed`}>{l.text}</p>
              </div>
            );
          })}
        </div>

        {}
        <div className="rounded-3xl overflow-hidden mb-6" style={{background:'linear-gradient(135deg,#1e3a8a 0%,#4338ca 100%)'}}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IcoForecast/>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{color:'rgba(255,255,255,0.7)'}}>
                  Прогноз витрат на наступний місяць
                </p>
              </div>

            </div>
            <p className="text-4xl font-black text-white tracking-tighter mb-1">
              ~₴{mlResult.forecastNextMonth.toLocaleString('uk-UA')}
            </p>
            <p className="text-sm font-medium mb-5" style={{color:'rgba(255,255,255,0.65)'}}>
              Система вивчила, скільки ви витрачали кожного місяця протягом останнього року, і розрахувала найімовірнішу суму на наступний місяць.
            </p>
            {accuracyLabel && (
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <IcoAccuracy/>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Точність прогнозу</p>
                  </div>
                  <p className="text-sm font-black text-white">{accuracyLabel.text} · {accuracyLabel.bar.toFixed(0)}%</p>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${Math.max(accuracyLabel.bar,5)}%`, backgroundColor:accuracyLabel.color}}/>
                </div>
                <p className="text-[10px] mt-2.5 font-medium" style={{color:'rgba(255,255,255,0.55)'}}>
                  {deviationText ? deviationText.replace('приблизно на', 'не більше ніж на') : 'Чим більше місяців у вашій історії, тим точнішим стає прогноз.'}
                </p>
              </div>
            )}
            {!accuracyLabel && (
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-[10px] font-medium" style={{color:'rgba(255,255,255,0.6)'}}>
                  Щоб прогноз був точнішим, потрібно хоча б три місяці витрат в історії. Наразі показано орієнтовну оцінку на основі наявних даних.
                </p>
              </div>
            )}
          </div>
        </div>

        {}
        {total > 0 && (
          <div className="mb-6">
            {}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-gray-900 text-base">Де конкретно можна заощадити?</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Нижче — категорії, де невелике скорочення дасть найвідчутніший результат
                </p>
              </div>
              {}
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                {recs.map((_,i) => (
                  <button key={i} onClick={() => setRecIndex(i)}
                    className="rounded-full transition-all"
                    style={{width: i===recIndex ? 20 : 7, height:7, background: i===recIndex ? '#f97316' : '#e2e8f0'}}/>
                ))}
              </div>
            </div>

            {}
            {rec && (
              <div className="rounded-3xl border-2 overflow-hidden" style={{borderColor:`${barColor}33`}}>
                {}
                <div className="p-6" style={{background:`linear-gradient(135deg,${barColor}10,${barColor}05)`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{background:`${barColor}18`, color:barColor}}>
                        {getCatIcon(rec.category)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-xl tracking-tight">{rec.category}</p>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">
                          Ви витрачаєте на це: <span className="font-black text-gray-700">₴{rec.current.toLocaleString('uk-UA')}</span> на місяць
                        </p>
                      </div>
                    </div>
                    {}
                    <div className="text-right flex-shrink-0 ml-4 p-4 rounded-2xl" style={{background:`${barColor}12`}}>
                      <p className="text-2xl font-black" style={{color:barColor}}>−₴{rec.cut.toLocaleString('uk-UA')}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider mt-0.5" style={{color:barColor}}>
                        економія/місяць
                      </p>
                      <p className="text-[9px] text-gray-400 font-medium mt-1">
                        якщо скоротити на {rec.pct}%
                      </p>
                    </div>
                  </div>

                  {}
                  <div className="mt-5">
                    <div className="flex justify-between text-[10px] font-black mb-1.5">
                      <span className="text-gray-400 uppercase tracking-widest">Частка у загальних витратах</span>
                      <span style={{color:barColor}}>{Math.min(rec.pct * 3, 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{width:`${Math.min(rec.pct*3,100)}%`, background:barColor}}/>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-3 leading-relaxed">
                      💡 Якщо витрачати на <strong>{rec.category.toLowerCase()}</strong> на ₴{rec.cut.toLocaleString('uk-UA')} менше щомісяця — за рік це складе <strong>₴{(rec.cut*12).toLocaleString('uk-UA')}</strong> додаткових заощаджень.
                    </p>
                  </div>
                </div>

                {}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-t" style={{borderColor:`${barColor}18`}}>
                  <button
                    onClick={() => setRecIndex(i => Math.max(0, i-1))}
                    disabled={recIndex === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30"
                    style={{color: recIndex===0 ? '#94a3b8' : barColor, background: recIndex===0 ? 'transparent' : `${barColor}10`}}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Попередня
                  </button>

                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {recIndex+1} / {total} категорій
                  </p>

                  <button
                    onClick={() => setRecIndex(i => Math.min(total-1, i+1))}
                    disabled={recIndex === total-1}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30"
                    style={{color: recIndex===total-1 ? '#94a3b8' : barColor, background: recIndex===total-1 ? 'transparent' : `${barColor}10`}}>
                    Наступна
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {}
            <div className="mt-4 rounded-2xl p-5 flex items-center justify-between"
              style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0'}}>
              <div className="flex items-center gap-3">
                {}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(16,185,129,0.15)', color:'#059669'}}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C6 2 3 5 3 9c0 3.3 2.1 6.1 5 7.3V18h4v-1.7c2.9-1.2 5-4 5-7.3 0-4-3-7-7-7z" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M8 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-black text-emerald-800 text-sm">Загальна можлива економія на місяць</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    За рік це ₴{(mlResult.totalPossibleSave*12).toLocaleString('uk-UA')} — {mlResult.totalPossibleSave*12 >= 50000 ? 'на авто чи нерухомість' : mlResult.totalPossibleSave*12 >= 20000 ? 'на відпустку або резервний фонд' : 'гарний старт для подушки безпеки'}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-black text-emerald-700 text-2xl">₴{mlResult.totalPossibleSave.toLocaleString('uk-UA')}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">на місяць</p>
              </div>
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8"/>
                <line x1="15" y1="15" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-500">За обраний період витрат не знайдено — спробуйте розширити діапазон або додайте транзакції.</p>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-2 py-5 bg-black text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all">
          Зрозуміло
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats]               = useState({ balance:0, income:0, expense:0 });
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [users, setUsers]               = useState([]);
  const [accounts, setAccounts]         = useState([]);
  const [activeChart, setActiveChart]   = useState('line');
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [newAccName, setNewAccName]         = useState('');
  const [showMLModal, setShowMLModal]   = useState(false);
  const [mlResult, setMlResult]         = useState(null);
  const [participantData, setParticipantData] = useState([]);
  const [selectedUser,   setSelectedUser]   = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [allHistory, setAllHistory]     = useState([]);

  const [rates, setRates] = useState(readRates);
  useEffect(() => {
    const onRatesUpdate = () => setRates(readRates());
    window.addEventListener('fin_rates_updated', onRatesUpdate);
    return () => window.removeEventListener('fin_rates_updated', onRatesUpdate);
  }, []);

  const processDashboardData = useCallback((history) => {
    const now = new Date();
    const filtered = history.filter(t => {
      const diff = (now - new Date(t.date)) / 86400000;
      return (selectedUser === 'all' || t.userName === selectedUser) && diff <= Number(selectedPeriod) && diff >= 0;
    });

    const income  = filtered.filter(t => t.type === 'Дохід').reduce((s,t) => s+Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'Витрата').reduce((s,t) => s+Number(t.amount), 0);
    setStats({ income, expense, balance: income - expense });

    const dayMap = {};
    [...filtered].sort((a,b) => new Date(a.date)-new Date(b.date)).forEach(t => {
      const key = new Date(t.date).toLocaleDateString('uk-UA',{day:'2-digit',month:'2-digit'});
      dayMap[key] = (dayMap[key]||0) + (t.type==='Дохід' ? Number(t.amount) : -Number(t.amount));
    });
    let tl = Object.keys(dayMap).map(k => ({ name:k, value:Math.round(dayMap[k]) }));
    if (tl.length === 1) tl = [{name:'',value:tl[0].value}, tl[0], {name:' ',value:tl[0].value}];
    setTimelineData(tl);

    const catMap = {};
    filtered.filter(t => t.type==='Витрата').forEach(t => { const c = t.category||'Інше'; catMap[c]=(catMap[c]||0)+Number(t.amount); });
    setCategoryData(Object.entries(catMap).map(([name,value]) => ({name, value:Math.round(value)})));


    setParticipantData(buildParticipantPieData(history, selectedPeriod));
  }, [selectedUser, selectedPeriod]);

  const loadAll = useCallback(async () => {
    const [history, savedUsers, savedAccs] = await Promise.all([
      apiService.getHistory(), apiService.getUsers(), apiService.getAccounts(),
    ]);
    setUsers(savedUsers);
    setAccounts(savedAccs);
    setAllHistory(history);
    processDashboardData(history);
  }, [processDashboardData]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const exportBackup = async () => {
    const d = { history: await apiService.getHistory(), accounts: await apiService.getAccounts(), users: await apiService.getUsers(), version:'2.5', exportDate: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d));
    a.download = 'Резервна_копія.json';
    a.click();
  };

  const handleAddAccount = async () => {
    if (!newAccName.trim()) return;
    const acc = { id:Date.now().toString(), name:newAccName.trim(), currentBalance:0, balance:0, currency:'UAH', color:'#6366f1', owner:'all' };
    const list = [...(await apiService.getAccounts()), acc];
    localStorage.setItem('fin_accounts_local', JSON.stringify(list));
    setAccounts(list);
    setNewAccName('');
    setIsAccModalOpen(false);
  };

  const runML = () => {
    const result = runMLEngine(allHistory, selectedUser, selectedPeriod);
    setMlResult(result);
    setShowMLModal(true);
  };

  const maxVal = Math.max(stats.income, stats.expense, 1);


  const incPieData  = participantData.filter(d => d.income  > 0).map(d => ({ name: d.name, value: d.income  }));
  const expPieData  = participantData.filter(d => d.expense > 0).map(d => ({ name: d.name, value: d.expense }));

  return (
    <div className="ml-64 p-8 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
      <div className="max-w-7xl mx-auto">


        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Дашборд</h1>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1 flex items-center gap-1.5">Список рахунків</p>
          </div>
          <button onClick={exportBackup} className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-all shadow-sm">
            <Download size={16}/> Резервна копія
          </button>
        </div>


        <div className="flex gap-6 mb-8 flex-wrap">
          {accounts.map(acc => {
            const cur = (acc.currency || 'UAH').toUpperCase();
            const rawBal = Number(acc.currentBalance || 0);
            const balUAH = toUAH(rawBal, cur, rates);
            const currencySymbol = { UAH: '₴', USD: '$', EUR: '€' }[cur] || cur;
            const isNonUAH = cur !== 'UAH';
            return (
              <div key={acc.id} className="text-white p-7 rounded-[35px] flex-1 shadow-lg flex justify-between items-center" style={{backgroundColor:acc.color||'#065f46',minWidth:160}}>
                <div>
                  <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{acc.name}</p>
                  {}
                  <h4 className="text-2xl font-black mt-1">
                    {rawBal.toLocaleString('uk-UA',{minimumFractionDigits:2})} {currencySymbol}
                  </h4>
                  {}
                  {isNonUAH && (
                    <p className="text-[10px] font-bold opacity-70 mt-0.5">
                      ≈ {balUAH.toLocaleString('uk-UA',{minimumFractionDigits:0})} ₴
                    </p>
                  )}
                </div>
                <CreditCard size={32} className="opacity-25"/>
              </div>
            );
          })}
          <button onClick={() => setIsAccModalOpen(true)} className="bg-white border-2 border-dashed border-gray-200 text-gray-400 p-7 rounded-[35px] flex-1 hover:border-orange-400 transition-all font-black uppercase text-[10px] tracking-widest" style={{minWidth:160}}>
            + Додати рахунок
          </button>
        </div>

        {}
        <div className="flex justify-between items-center mb-10" style={{overflow:'visible',position:'relative',zIndex:30}}>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100" style={{overflow:'visible',position:'relative',zIndex:30}}>
            <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronLeft size={18}/></button>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              style={{background:'transparent',border:'none',fontWeight:900,fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',padding:'6px 16px',outline:'none',cursor:'pointer',minWidth:140}}>
              <option value="all">Усі учасники</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronRight size={18}/></button>
          </div>
          <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
            {[['7','Тиждень'],['30','Місяць'],['365','Рік']].map(([v,l]) => (
              <button key={v} onClick={() => setSelectedPeriod(v)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedPeriod===v ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {}
          <div className="bg-white p-8 rounded-[45px] shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest mb-6">Монітор стану</h3>
            <div className="bg-amber-50 rounded-3xl p-5 flex flex-col items-center fi-gauge-wrap">
              <Gauge value={stats.balance} label="Баланс" color={C_BALANCE} max={maxVal}/>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-emerald-50 rounded-3xl p-4 flex flex-col items-center">
                <Gauge value={stats.income} label="Дохід" color={C_INCOME} max={maxVal}/>
              </div>
              <div className="bg-red-50 rounded-3xl p-4 flex flex-col items-center">
                <Gauge value={stats.expense} label="Витрати" color={C_EXPENSE} max={maxVal}/>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              {[['Баланс',stats.balance,C_BALANCE],['Дохід',stats.income,C_INCOME],['Витрати',stats.expense,C_EXPENSE]].map(([lbl,val,color]) => (
                <div key={lbl}>
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{lbl}</p>
                  <p className="text-sm font-black mt-0.5" style={{color}}>{Number(val).toLocaleString('uk-UA',{maximumFractionDigits:0})}</p>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="bg-white p-10 rounded-[45px] shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest">
                {activeChart==='line' ? 'Динаміка балансу' : 'Структура витрат'}
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button onClick={() => setActiveChart('line')} className={`p-3 rounded-xl transition-all ${activeChart==='line' ? 'bg-white text-orange-500' : 'text-gray-400'}`}><LineIcon size={20}/></button>
                <button onClick={() => setActiveChart('pie')}  className={`p-3 rounded-xl transition-all ${activeChart==='pie'  ? 'bg-white text-orange-500' : 'text-gray-400'}`}><PieIcon  size={20}/></button>
              </div>
            </div>

            {activeChart === 'line' && (
              <div style={{width:'100%',height:288}}>
                {timelineData.length === 0 ? (
                  <div style={{height:288,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <p className="text-gray-300 font-black uppercase text-xs tracking-widest">Немає даних за цей період</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{top:10,right:16,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:10,fontWeight:900,fill:'#cbd5e1'}} interval={timelineData.length>20 ? Math.floor(timelineData.length/8) : 0}/>
                      <YAxis hide domain={['auto','auto']}/>
                      <Tooltip content={<LineTooltip/>}/>
                      <Line type="monotone" dataKey="value" stroke={C_BALANCE} strokeWidth={4}
                        dot={timelineData.length<=20 ? {r:5,fill:C_BALANCE,strokeWidth:3,stroke:'#fff'} : false}
                        activeDot={{r:8,fill:C_BALANCE}}/>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeChart === 'pie' && (
              <div style={{width:'100%',height:288}}>
                {categoryData.length === 0 ? (
                  <div style={{height:288,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <p className="text-gray-300 font-black uppercase text-xs tracking-widest">Витрат за цей період немає</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                        {categoryData.map((_,i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n) => [`₴${Number(v).toLocaleString('uk-UA')}`,n]} contentStyle={{borderRadius:16,border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeChart==='pie' && categoryData.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  {categoryData.map((c,i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:CAT_COLORS[i%CAT_COLORS.length]}}/>
                      <span className="text-[10px] font-black text-gray-500 uppercase">{c.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-400 font-black uppercase text-[10px] tracking-widest mt-2">
                  Всього витрат: ₴{stats.expense.toLocaleString('uk-UA',{maximumFractionDigits:0})}
                </p>
              </>
            )}

            <div className="mt-auto pt-6 flex justify-end">
              <button onClick={runML} className="px-10 py-4 rounded-[20px] text-[10px] tracking-[0.25em] flex items-center gap-3 fi-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M8 1L2 8h5l-1 5 6-7H7L8 1z"/></svg> ML-Оптимізація
              </button>
            </div>
          </div>
        </div>

        {}
        {participantData.length > 0 && (
          <div className="mt-8 bg-white rounded-[45px] shadow-sm border border-gray-100 p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Users size={20} className="text-indigo-600"/>
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl">Внесок учасників</h3>
                <p className="text-xs font-bold text-gray-400 mt-0.5">Частка доходів та витрат кожного члена родини</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

              {}
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-emerald-600 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Доходи за учасниками
                </p>
                {incPieData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-300 font-black uppercase text-xs tracking-widest">Доходів немає</div>
                ) : (
                  <>
                    <div style={{height:220}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={incPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {incPieData.map((_,i) => <Cell key={i} fill={MEMBER_COLORS[i%MEMBER_COLORS.length]}/>)}
                          </Pie>
                          <Tooltip formatter={(v,n) => [`₴${Number(v).toLocaleString('uk-UA')}`,n]} contentStyle={{borderRadius:14,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {incPieData.map((d,i) => {
                        const total = incPieData.reduce((s,x) => s+x.value,0);
                        const pct   = total > 0 ? Math.round(d.value/total*100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:MEMBER_COLORS[i%MEMBER_COLORS.length]}}/>
                            <span className="text-sm font-black text-gray-700">{d.name}</span>
                            <span className="text-sm font-black text-emerald-600">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {}
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-red-500 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Витрати за учасниками
                </p>
                {expPieData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-300 font-black uppercase text-xs tracking-widest">Витрат немає</div>
                ) : (
                  <>
                    <div style={{height:220}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {expPieData.map((_,i) => <Cell key={i} fill={MEMBER_COLORS[i%MEMBER_COLORS.length]}/>)}
                          </Pie>
                          <Tooltip formatter={(v,n) => [`₴${Number(v).toLocaleString('uk-UA')}`,n]} contentStyle={{borderRadius:14,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {expPieData.map((d,i) => {
                        const total = expPieData.reduce((s,x) => s+x.value,0);
                        const pct   = total > 0 ? Math.round(d.value/total*100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:MEMBER_COLORS[i%MEMBER_COLORS.length]}}/>
                            <span className="text-sm font-black text-gray-700">{d.name}</span>
                            <span className="text-sm font-black text-red-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Детальний розподіл</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {participantData.map((d,i) => {
                  const net = d.income - d.expense;
                  return (
                    <div key={i} className="bg-gray-50 rounded-3xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{backgroundColor:MEMBER_COLORS[i%MEMBER_COLORS.length]}}>
                          {d.name[0]?.toUpperCase()}
                        </div>
                        <p className="font-black text-gray-800 text-base tracking-tight">{d.name}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-gray-400 uppercase tracking-wide text-xs">Дохід</span>
                          <span className="font-black text-emerald-600">+₴{d.income.toLocaleString('uk-UA')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-gray-400 uppercase tracking-wide text-xs">Витрати</span>
                          <span className="font-black text-red-500">−₴{d.expense.toLocaleString('uk-UA')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200">
                          <span className="text-gray-400 uppercase tracking-wide text-xs">Баланс</span>
                          <span className="font-black" style={{color: net>=0 ? C_INCOME : C_EXPENSE}}>{net>=0?'+':''}₴{net.toLocaleString('uk-UA')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {}
      {showMLModal && mlResult && (() => {

        const IcoBalance = () => (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.8"/>
            <line x1="10" y1="7" x2="10" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M4 10l-2 5h4L4 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <path d="M16 10l-2 5h4L16 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <line x1="4" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
          </svg>
        );
        const IcoWarning = () => (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L18 17H2L10 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="10" cy="14.5" r="0.9" fill="currentColor"/>
          </svg>
        );
        const IcoOk = () => (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
        const IcoInfo = () => (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <line x1="10" y1="9" x2="10" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="10" cy="6.5" r="1" fill="currentColor"/>
          </svg>
        );
        const IcoForecast = () => (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polyline points="1,13 5,7 9,10 13,4 17,6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="13" y1="4" x2="17" y2="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="17" y1="4" x2="17" y2="8" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        );
        const IcoAccuracy = () => (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4"/>
            <circle cx="8" cy="8" r="3.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4"/>
            <circle cx="8" cy="8" r="1.2" fill="rgba(255,255,255,0.9)"/>
            <line x1="8" y1="1" x2="8" y2="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        );


        const getCatIcon = (cat) => {
          const c = (cat || '').toLowerCase();
          if (/продукт|food|grocery/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M5 3v6a6 6 0 0 0 12 0V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="11" y1="9" x2="11" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          );
          if (/транспорт|transport|такс|uber|bolt/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="7" width="16" height="9" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="15" cy="17" r="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 11h16" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2"/>
              <path d="M7 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          );
          if (/кафе|cafe|coffee|ресторан|їжа/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M6 3c0 2 2 2 2 4s-2 2-2 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M10 3c0 2 2 2 2 4s-2 2-2 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M3 13h16l-1.5 6H4.5L3 13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          );
          if (/розваг|entertainment|кіно|steam|netflix/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
              <polygon points="9,8 9,14 15,11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            </svg>
          );
          if (/комунал|utilities|газ|вода|електр/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2l-2 8h4l-2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 10c0 2.8 2.2 5 5 5s5-2.2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          );
          if (/медицин|health|аптека|лікар/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="3" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8"/>
              <line x1="11" y1="7" x2="11" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="7" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          );
          if (/одяг|cloth|fashion|shopping/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M8 3L4 7l2 2 1-1v11h10V8l1 1 2-2-4-4-2 2a2 2 0 0 1-4 0L8 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          );
          if (/зарплат|salary|дохід|income/.test(c)) return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M6 6V5a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="11" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          );
          return (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="12" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="3" y="12" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="12" y="12" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          );
        };


        const accuracyLabel = (() => {
          if (mlResult.accuracyPct === null || mlResult.accuracyPct === undefined) return null;
          const pct = mlResult.accuracyPct;
          if (pct >= 88) return { text: 'Дуже висока', color: '#10b981', bar: pct };
          if (pct >= 75) return { text: 'Хороша',      color: '#f59e0b', bar: pct };
          if (pct >= 50) return { text: 'Середня',     color: '#f97316', bar: pct };
          return               { text: 'Низька',       color: '#ef4444', bar: pct };
        })();
        const deviationText = mlResult.rmse !== null
          ? `Прогноз може відрізнятися від реальності приблизно на ₴${Math.round(mlResult.rmse).toLocaleString('uk-UA')} — це нормально для домашнього бюджету.`
          : null;


        const typeIcon = (t) => {
          if (t === 'good') return <IcoOk/>;
          if (t === 'bad')  return <IcoWarning/>;
          if (t === 'warn') return <IcoBalance/>;
          return <IcoInfo/>;
        };

        return (
        <MLModalInner
          mlResult={mlResult}
          onClose={() => setShowMLModal(false)}
          accuracyLabel={accuracyLabel}
          deviationText={deviationText}
          typeIcon={typeIcon}
          getCatIcon={getCatIcon}
          IcoForecast={IcoForecast}
          IcoAccuracy={IcoAccuracy}
        />
        );
      })()}

      {}
      {isAccModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-slate-800">
          <div className="bg-white rounded-[50px] p-12 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Новий рахунок</h3>
              <button onClick={() => setIsAccModalOpen(false)} className="p-2 text-gray-300 hover:text-red-500"><X size={28}/></button>
            </div>
            <input autoFocus type="text" value={newAccName} onChange={e => setNewAccName(e.target.value)}
              placeholder="Назва рахунку"
              className="w-full p-6 bg-gray-50 rounded-3xl border-none outline-none font-bold mb-8 text-lg"/>
            <button onClick={handleAddAccount} className="w-full bg-black text-white p-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl">
              <Save size={20}/> Зберегти
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;