import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { Target, ArrowLeft, Loader2, PiggyBank, Plus, X, Save, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

const PENSION_STORAGE_KEY = 'fin_pension_savings_local';

const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 2L4 6v8c0 6 4.5 10.5 10 12 5.5-1.5 10-6 10-12V6L14 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M9 14l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconBalance = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="6" r="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="14" y1="8" x2="14" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 12l-4 8h8L6 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <path d="M22 12l-4 8h8L22 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <line x1="6" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
  </svg>
);
const IconRocket = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3C14 3 20 6 20 14l-6 8-6-8C8 6 14 3 14 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <circle cx="14" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 20l-3 4M18 20l3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconRisk = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2L16 15H2L9 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <line x1="9" y1="7" x2="9" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
  </svg>
);
const IconReturn = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <polyline points="2,12 6,7 10,10 16,4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="12,4 16,4 16,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconHorizon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="9" y1="1" x2="9" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9" y1="15" x2="9" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="1" y1="9" x2="3" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="15" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconVolatility = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <polyline points="1,9 4,4 7,13 10,5 13,12 16,7 18,9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <line x1="9" y1="1" x2="9" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const STRATEGIES = {
  conservative: {
    key:      'conservative',
    name:     'Консервативна',
    nameEn:   'Conservative',
    rate:     0.05,
    Icon:     IconShield,
    color:    '#6366f1',
    colorBg:  'rgba(99,102,241,0.10)',
    desc:     'Депозити та державні облігації',
    tagline:  'Надійність понад усе',
    earliestRetire: 60,
    retireNote: 'Через низьку дохідність потрібен довший горизонт — виходити на пенсію раніше 60 складно без значно більших внесків',
    riskScore: 15,
    returnScore: 30,
    liquidityScore: 80,
    stabilityScore: 95,
    details: {
      risk:       'Низький — держоблігації, банківські депозити, захищені фонди',
      volatility: 'Мінімальна. Капітал практично не коливається',
      horizon:    'Від 15 до 40 років. Чим більше часу — тим краще, бо ставка невисока',
      monthly:    'Для ранньої пенсії потрібні більші щомісячні внески, ніж при агресивній стратегії',
      pros:       ['Гарантований захист капіталу', 'Передбачуваний дохід', 'Мінімальний стрес', 'Підходить будь-якому віку'],
      cons:       ['Дохід може не перевищувати інфляцію', 'Повільне зростання вимагає більших внесків', 'Рання пенсія практично недосяжна'],
      ideal:      'Для тих, хто вже близько до пенсії, або хоче повністю виключити ризик. Рання пенсія тут вимагає дуже великих щомісячних внесків',
    }
  },
  moderate: {
    key:      'moderate',
    name:     'Помірна',
    nameEn:   'Moderate',
    rate:     0.10,
    Icon:     IconBalance,
    color:    '#f97316',
    colorBg:  'rgba(249,115,22,0.10)',
    desc:     'Збалансований портфель активів',
    tagline:  'Золота середина',
    earliestRetire: 52,
    retireNote: 'Збалансована дохідність дозволяє вийти на пенсію приблизно на 8 років раніше, ніж при консервативній стратегії',
    riskScore: 50,
    returnScore: 62,
    liquidityScore: 65,
    stabilityScore: 65,
    details: {
      risk:       'Середній — змішаний портфель: акції + облігації + депозити',
      volatility: 'Помірна. Короткострокові коливання є, але тенденція стабільна',
      horizon:    'Від 10 до 30 років. Оптимально для більшості людей',
      monthly:    'Стандартні 10% доходу забезпечать гідний капітал',
      pros:       ['Баланс між ризиком та прибутком', 'Широка диверсифікація', 'Стійкий до ринкових криз', 'Гнучкість вибору інструментів'],
      cons:       ['Потребує регулярного перегляду портфеля', 'Неповна захищеність у кризи', 'Складніше управляти, ніж депозитом'],
      ideal:      'Для людей 30–50 років із середнім доходом, яким потрібен баланс надійності та зростання',
    }
  },
  aggressive: {
    key:      'aggressive',
    name:     'Агресивна',
    nameEn:   'Aggressive',
    rate:     0.15,
    Icon:     IconRocket,
    color:    '#ec4899',
    colorBg:  'rgba(236,72,153,0.10)',
    desc:     'Акції та диверсифіковані фонди',
    tagline:  'Максимальне зростання',
    earliestRetire: 45,
    retireNote: 'Висока дохідність дозволяє накопичити достатній капітал значно швидше — реалістична ціль виходу на пенсію вже у 45 років',
    riskScore: 90,
    returnScore: 95,
    liquidityScore: 40,
    stabilityScore: 30,
    details: {
      risk:       'Високий — переважно акції, ETF, венчурні інструменти',
      volatility: 'Висока. Капітал може впасти на 30–50% у кризу, але відновлюється',
      horizon:    'Від 15 до 30 років. Висока ставка дозволяє накопичити швидше — рання пенсія реальна',
      monthly:    'Для тієї ж цілі потрібен менший щомісячний внесок, ніж при консервативній стратегії',
      pros:       ['Найвищий потенційний прибуток', 'Складний відсоток максимально ефективний', 'Захист від інфляції', 'Менший місячний внесок для тієї ж цілі — або рання пенсія'],
      cons:       ['Серйозні просідання капіталу в кризи', 'Потрібна висока терпимість до ризику', 'Не підходить без тривалого горизонту', 'Потребує часу та знань'],
      ideal:      'Для молодих людей (20–35 років) із тривалим горизонтом та готовністю терпіти просідання. Реалістична мета — вийти на пенсію на 15–20 років раніше за консервативний план',
    }
  }
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0f172a', borderRadius:14, padding:'10px 16px', fontSize:11, fontFamily:'inherit' }}>
      <p style={{ color:'#94a3b8', marginBottom:6, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight:900 }}>
          {p.name}: ₴{Number(p.value).toLocaleString('uk-UA', {maximumFractionDigits:0})}
        </p>
      ))}
    </div>
  );
};

const StrategyInfoModal = ({ strategy, onClose }) => {
  const s = STRATEGIES[strategy];
  if (!s) return null;
  const { Icon } = s;

  const radarData = [
    { subject:'Дохідність', value: s.returnScore },
    { subject:'Надійність', value: s.stabilityScore },
    { subject:'Ліквідність', value: s.liquidityScore },
    { subject:'Захист',     value: 100 - s.riskScore },
    { subject:'Простота',   value: strategy === 'conservative' ? 90 : strategy === 'moderate' ? 60 : 35 },
  ];

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[44px] w-full max-w-2xl shadow-2xl overflow-hidden" style={{maxHeight:'92vh'}}>

        {}
        <div className="relative p-9 pb-7 overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)`, borderBottom:`2px solid ${s.color}22` }}>
          <button onClick={onClose} className="absolute right-7 top-7 p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <X size={22}/>
          </button>
          <div className="flex items-center gap-5 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: s.colorBg, color: s.color, border:`2px solid ${s.color}33` }}>
              <Icon/>
            </div>
            <div>
              <div style={{ color: s.color }} className="text-xs font-black uppercase tracking-[0.2em] mb-1">{s.tagline}</div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">{s.name} стратегія</h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">{s.desc} · ~{s.rate * 100}% річних</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto" style={{maxHeight:'calc(92vh - 160px)'}}>
          <div className="p-9 space-y-7">

            {}
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: IconRisk,       label:'Рівень ризику',   val: s.details.risk       },
                { Icon: IconVolatility, label:'Волатильність',   val: s.details.volatility },
                { Icon: IconHorizon,    label:'Горизонт',        val: s.details.horizon    },
                { Icon: IconTarget,     label:'Внески',          val: s.details.monthly    },
              ].map(({ Icon: I, label, val }) => (
                <div key={label} className="p-5 rounded-3xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                    <I/><span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
                  </div>
                  <p className="text-base font-bold text-gray-700 leading-relaxed">{val}</p>
                </div>
              ))}
            </div>

            {}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Профіль стратегії</p>
              <div style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:13, fontWeight:700, fill:'#64748b' }}/>
                    <Radar name={s.name} dataKey="value" stroke={s.color} fill={s.color} fillOpacity={0.22} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {}
            <div className="grid grid-cols-2 gap-5">
              <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#059669" strokeWidth="1.5"/><path d="M3.5 6l2 2 3-3" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Переваги
                </p>
                <ul className="space-y-2">
                  {s.details.pros.map((p,i) => (
                    <li key={i} className="text-sm font-bold text-emerald-800 flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"/>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 bg-red-50 rounded-3xl border border-red-100">
                <p className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#ef4444" strokeWidth="1.5"/><path d="M4 4l4 4M8 4l-4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Недоліки
                </p>
                <ul className="space-y-2">
                  {s.details.cons.map((c,i) => (
                    <li key={i} className="text-sm font-bold text-red-700 flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5"/>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {}
            <div className="p-5 rounded-3xl border-l-4" style={{ borderColor: s.color, background: s.colorBg }}>
              <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{color: s.color}}>Кому підходить</p>
              <p className="text-base font-semibold text-gray-700 leading-relaxed">{s.details.ideal}</p>
            </div>

            {}
            <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                <IconHorizon/> Вік виходу на пенсію
              </p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-3xl font-black" style={{color: s.color}}>
                  {s.key === 'aggressive' ? '~45' : s.key === 'moderate' ? '~52' : '~60'}
                </span>
                <span className="text-base font-bold text-gray-500">років (найраніше реалістично)</span>
              </div>
              <p className="text-base text-gray-600 font-medium leading-relaxed">{s.retireNote}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const CompareModal = ({ monthlyDeposit, currentAge, retireAge, onClose }) => {


  const buildTimeSeries = () => {
    const years = retireAge - currentAge;
    if (years <= 0) return [];
    const points = [];
    for (let y = 0; y <= years; y += Math.max(1, Math.floor(years / 20))) {
      const row = { year: `${currentAge + y}р.` };
      Object.values(STRATEGIES).forEach(s => {
        const m = s.rate / 12;
        const n = y * 12;
        row[s.nameEn] = Math.round(monthlyDeposit * ((Math.pow(1 + m, n) - 1) / m));
      });
      points.push(row);
    }
    return points;
  };


  const buildFinalBar = () =>
    Object.values(STRATEGIES).map(s => {
      const m = s.rate / 12;
      const n = (retireAge - currentAge) * 12;
      const final = Math.round(monthlyDeposit * ((Math.pow(1 + m, n) - 1) / m));
      const deposited = Math.round(monthlyDeposit * 12 * (retireAge - currentAge));
      return {
        name: s.name,
        'Прибуток': final - deposited,
        'Внески':   deposited,
        color: s.color,
      };
    });


  const radarCompare = [
    { subject:'Дохідність',   Conservative:30,  Moderate:62,  Aggressive:95  },
    { subject:'Надійність',   Conservative:95,  Moderate:65,  Aggressive:30  },
    { subject:'Ліквідність',  Conservative:80,  Moderate:65,  Aggressive:40  },
    { subject:'Захист',       Conservative:85,  Moderate:50,  Aggressive:10  },
    { subject:'Простота',     Conservative:90,  Moderate:60,  Aggressive:35  },
  ];


  const tableRows = [
    { label:'Річна ставка', Conservative:'~5%', Moderate:'~10%', Aggressive:'~15%' },
    { label:'Рівень ризику', Conservative:'Низький', Moderate:'Середній', Aggressive:'Високий' },
    { label:'Волатильність', Conservative:'Мінімальна', Moderate:'Помірна', Aggressive:'Висока' },
    { label:'Найраніший вихід на пенсію', Conservative:'від 60 років', Moderate:'від 52 років', Aggressive:'від 45 років' },
    { label:'Ідеальний горизонт', Conservative:'15–40 р.', Moderate:'10–30 р.', Aggressive:'15–25 р.' },
    { label:'Щомісячний внесок', Conservative:`₴${monthlyDeposit.toLocaleString('uk-UA')}`, Moderate:`₴${monthlyDeposit.toLocaleString('uk-UA')}`, Aggressive:`₴${monthlyDeposit.toLocaleString('uk-UA')}` },
    { label:'Для однакового капіталу внесок', Conservative:'Найвищий', Moderate:'Середній', Aggressive:'Найнижчий' },
  ];

  const timeSeries = buildTimeSeries();
  const finalBar   = buildFinalBar();
  const years      = retireAge - currentAge;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[44px] w-full shadow-2xl overflow-hidden" style={{ maxWidth:900, maxHeight:'94vh' }}>

        {}
        <div className="flex items-center justify-between px-10 py-7 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Порівняння стратегій</h2>
            <p className="text-sm text-gray-400 font-bold mt-0.5 uppercase tracking-widest">
              Внесок ₴{monthlyDeposit.toLocaleString('uk-UA')}/міс · горизонт {years} р. · вік {currentAge}→{retireAge}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
            <X size={24}/>
          </button>
        </div>

        <div className="overflow-y-auto" style={{maxHeight:'calc(94vh - 100px)'}}>
          <div className="p-10 space-y-10">

            {}
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">Зростання капіталу з роками</p>
              <p className="text-sm text-gray-500 font-medium mb-5">Як накопичується капітал при внеску ₴{monthlyDeposit.toLocaleString('uk-UA')}/міс за кожною стратегією</p>
              <div style={{height:280}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{top:10,right:10,left:0,bottom:0}}>
                    <defs>
                      {Object.values(STRATEGIES).map(s => (
                        <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={s.color} stopOpacity={0.22}/>
                          <stop offset="95%" stopColor={s.color} stopOpacity={0.02}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="year" tick={{fontSize:12,fontWeight:700,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fontWeight:700,fill:'#cbd5e1'}} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:13,fontWeight:700,paddingTop:12}}/>
                    {Object.values(STRATEGIES).map(s => (
                      <Area key={s.key} type="monotone" dataKey={s.nameEn} name={s.name}
                        stroke={s.color} strokeWidth={2.5} fill={`url(#grad_${s.key})`} dot={false}
                        activeDot={{r:6, fill:s.color, strokeWidth:3, stroke:'#fff'}}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {}
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">Підсумковий капітал до {retireAge} років</p>
              <p className="text-sm text-gray-500 font-medium mb-5">Розподіл між вашими внесками та прибутком від інвестицій</p>
              <div style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finalBar} margin={{top:10,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{fontSize:13,fontWeight:700,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fontWeight:700,fill:'#cbd5e1'}} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:13,fontWeight:700,paddingTop:12}}/>
                    <Bar dataKey="Внески"   stackId="a" fill="#e0e7ff" radius={[0,0,12,12]}/>
                    <Bar dataKey="Прибуток" stackId="a"
                      fill="url(#barGrad)" radius={[12,12,0,0]}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316"/>
                          <stop offset="100%" stopColor="#6366f1"/>
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {}
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">Профіль характеристик</p>
              <p className="text-sm text-gray-500 font-medium mb-5">Радарна карта ключових параметрів кожної стратегії</p>
              <div style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarCompare}>
                    <PolarGrid stroke="#e2e8f0"/>
                    <PolarAngleAxis dataKey="subject" tick={{fontSize:13,fontWeight:700,fill:'#64748b'}}/>
                    {Object.values(STRATEGIES).map(s => (
                      <Radar key={s.key} name={s.name} dataKey={s.nameEn}
                        stroke={s.color} fill={s.color} fillOpacity={0.14} strokeWidth={2}/>
                    ))}
                    <Legend wrapperStyle={{fontSize:13,fontWeight:700,paddingTop:8}}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {}
            <div className="grid grid-cols-3 gap-5">
              {Object.values(STRATEGIES).map(s => {
                const m   = s.rate / 12;
                const n   = years * 12;
                const fin = Math.round(monthlyDeposit * ((Math.pow(1+m,n)-1)/m));
                const dep = Math.round(monthlyDeposit * 12 * years);
                const pct = dep > 0 ? Math.round(((fin-dep)/dep)*100) : 0;
                const { Icon } = s;
                return (
                  <div key={s.key} className="rounded-3xl p-6 border-2" style={{ borderColor:`${s.color}33`, background: s.colorBg }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:`${s.color}22`, color: s.color }}>
                        <Icon/>
                      </div>
                      <p className="font-black text-gray-900 text-base">{s.name}</p>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-0.5">Капітал</p>
                    <p className="text-2xl font-black tracking-tighter" style={{color: s.color}}>
                      ₴{fin.toLocaleString('uk-UA')}
                    </p>
                    <p className="text-sm font-bold text-gray-500 mt-1">
                      Прибуток: <span className="font-black text-emerald-600">+{pct}%</span>
                    </p>
                    <p className="text-sm font-bold text-gray-400 mt-0.5">Ставка: {s.rate*100}% річних</p>
                  </div>
                );
              })}
            </div>

            {}
            <div className="rounded-3xl overflow-hidden border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-gray-500 w-[30%]">Характеристика</th>
                    {Object.values(STRATEGIES).map(s => (
                      <th key={s.key} className="p-4 text-xs font-black uppercase tracking-widest" style={{color: s.color}}>
                        <div className="flex items-center gap-2"><s.Icon/> {s.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="p-4 text-sm font-bold text-gray-600">{row.label}</td>
                      <td className="p-4 text-sm font-black text-gray-800">{row.Conservative}</td>
                      <td className="p-4 text-sm font-black text-gray-800">{row.Moderate}</td>
                      <td className="p-4 text-sm font-black text-gray-800">{row.Aggressive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="6" cy="10" r="4" stroke="#6366f1" strokeWidth="1.8"/>
                  <circle cx="14" cy="10" r="4" stroke="#ec4899" strokeWidth="1.8"/>
                  <path d="M10 7.5c1 .8 1 4.2 0 5" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <p className="text-sm font-black uppercase tracking-widest text-gray-500">Як правильно поєднувати стратегії</p>
              </div>
              <p className="text-base text-gray-500 font-medium mb-7">Більшість успішних інвесторів не використовують одну стратегію все життя — вони змінюють баланс разом зі своїм віком та ситуацією</p>

              {}
              <div className="relative">
                {}
                <div className="absolute left-[28px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 via-orange-400 to-pink-400" style={{marginLeft:'-1px'}}/>

                <div className="space-y-6">
                  {[
                    {
                      age: '20–35',
                      label: 'Молодість — максимальний ризик',
                      colorFrom: '#ec4899', colorTo: '#f97316',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <path d="M11 2C11 2 17 5.5 17 12l-6 7-6-7C5 5.5 11 2 11 2z" stroke="#ec4899" strokeWidth="1.8" strokeLinejoin="round"/>
                          <circle cx="11" cy="10" r="2" stroke="#ec4899" strokeWidth="1.8"/>
                        </svg>
                      ),
                      split: { aggressive: 80, moderate: 20, conservative: 0 },
                      text: 'У молодому віці час — ваш головний актив. Просідання ринку у 30 років ніщо: до пенсії є 25+ років для відновлення. Вкладайте переважно в агресивні інструменти — ETF, акції зростання. Навіть якщо ринок впаде на 40%, за 5 років він відновиться і піде далі.',
                      tip: 'Агресивна 80% · Помірна 20%',
                    },
                    {
                      age: '35–50',
                      label: 'Зрілість — поступовий перехід',
                      colorFrom: '#f97316', colorTo: '#6366f1',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <line x1="3" y1="11" x2="19" y2="11" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M3 7l4 4-4 4" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 7l-4 4 4 4" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ),
                      split: { aggressive: 50, moderate: 40, conservative: 10 },
                      text: 'Капітал вже значний — його потрібно не лише нарощувати, а й захищати. Переміщайте частину з агресивних у збалансовані інструменти. Продовжуйте тримати акції для зростання, але додайте облігації та дивідендні активи для стабільності.',
                      tip: 'Агресивна 50% · Помірна 40% · Консервативна 10%',
                    },
                    {
                      age: '50–55',
                      label: 'Передпенсійний — збереження',
                      colorFrom: '#6366f1', colorTo: '#10b981',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <path d="M11 2L3 6v7c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6L11 2z" stroke="#6366f1" strokeWidth="1.8" strokeLinejoin="round"/>
                          <path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ),
                      split: { aggressive: 20, moderate: 40, conservative: 40 },
                      text: 'До пенсії 5–10 років — ризик просідання вже неприйнятний. Основне завдання: зберегти накопичене та забезпечити передбачуваний дохід. Переводьте більшу частину в облігації, депозити, дивідендні акції.',
                      tip: 'Агресивна 20% · Помірна 40% · Консервативна 40%',
                    },
                    {
                      age: '55+',
                      label: 'На пенсії — захист та дохід',
                      colorFrom: '#10b981', colorTo: '#6366f1',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="11" cy="11" r="7" stroke="#10b981" strokeWidth="1.8"/>
                          <path d="M11 7v4l3 2" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      ),
                      split: { aggressive: 5, moderate: 25, conservative: 70 },
                      text: 'Капітал тепер має годувати вас. Основна ціль — стабільний пасивний дохід та захист від інфляції. Тримайте більшість у консервативних інструментах з регулярними виплатами. Невелика частка у помірних активах захистить від інфляції.',
                      tip: 'Консервативна 70% · Помірна 25% · Агресивна 5%',
                    },
                  ].map((stage, idx) => (
                    <div key={idx} className="flex gap-5 relative">
                      {}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10 bg-white border-2 shadow-sm"
                        style={{ borderColor: stage.colorFrom }}>
                        {stage.icon}
                      </div>
                      {}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-lg font-black" style={{ background:`linear-gradient(135deg,${stage.colorFrom},${stage.colorTo})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                            {stage.age} р.
                          </span>
                          <span className="text-sm font-black text-gray-800">{stage.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed mb-3">{stage.text}</p>
                        {}
                        <div className="mb-2">
                          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                            {stage.split.aggressive > 0 && (
                              <div style={{ width:`${stage.split.aggressive}%`, background:'#ec4899' }} className="transition-all"/>
                            )}
                            {stage.split.moderate > 0 && (
                              <div style={{ width:`${stage.split.moderate}%`, background:'#f97316' }} className="transition-all"/>
                            )}
                            {stage.split.conservative > 0 && (
                              <div style={{ width:`${stage.split.conservative}%`, background:'#6366f1' }} className="transition-all"/>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{stage.tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div className="mt-8 p-6 rounded-3xl" style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(249,115,22,0.06))', border:'1.5px solid rgba(99,102,241,0.15)' }}>
                <p className="text-sm font-black uppercase tracking-widest mb-3" style={{ color:'#4338ca' }}>
                  Золоте правило розподілу
                </p>
                <p className="text-base font-bold text-gray-700 leading-relaxed mb-4">
                  Класична формула: <strong>% у консервативних активах = ваш вік</strong>. Тобто в 30 років — 30% консервативно, 70% агресивно. У 60 — 60% консервативно, 40% агресивно.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { color:'#ec4899', label:'Агресивна', note:'Максимальне зростання' },
                    { color:'#f97316', label:'Помірна',   note:'Баланс і захист' },
                    { color:'#6366f1', label:'Консервативна', note:'Стабільний дохід' },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:t.color}}/>
                      <span className="text-sm font-black text-gray-700">{t.label}</span>
                      <span className="text-xs text-gray-400 font-medium">— {t.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const Pension = () => {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(true);
  const [currentAge, setCurrentAge]     = useState(25);
  const [retireAge, setRetireAge]       = useState(60);
  const [monthlyDeposit, setMonthlyDeposit] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState('moderate');
  const [userStats, setUserStats]       = useState({ avgIncome: 0 });
  const [pensionSavings, setPensionSavings]   = useState(0);
  const [showAddSavingsModal, setShowAddSavingsModal] = useState(false);
  const [savingsInput, setSavingsInput] = useState('');
  const [savingsNote, setSavingsNote]   = useState('');
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [showInfoModal, setShowInfoModal]   = useState(null);
  const [showCompare, setShowCompare]       = useState(false);




  const [calcMode, setCalcMode]               = useState('contribution');
  const [monthlySpend, setMonthlySpend]       = useState(10000);
  const [inflationEnabled, setInflationEnabled] = useState(false);
  const [inflationRate, setInflationRate]     = useState(5);
  const [accounts, setAccounts]               = useState([]);
  const [savingsAccount, setSavingsAccount]   = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const history = await apiService.getHistory();
        const incomes = history.filter(t => t.type === 'Дохід');
        if (incomes.length > 0) {
          const avg = incomes.reduce((s,t) => s+Number(t.amount), 0) / incomes.length;
          setUserStats({ avgIncome: avg });
          setMonthlyDeposit(Math.round(avg * 0.1));
        }
        const stored = JSON.parse(localStorage.getItem(PENSION_STORAGE_KEY) || '{"total":0,"history":[]}');
        setPensionSavings(stored.total || 0);
        setSavingsHistory(stored.history || []);
        const accs = await apiService.getAccounts();
        setAccounts(accs);
        if (accs.length > 0) setSavingsAccount(accs[0].name);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleAddSavings = (e) => {
    e.preventDefault();
    const amount = parseFloat(savingsInput);
    if (!amount || amount <= 0) return alert('Введіть коректну суму');

    const now = new Date().toISOString();
    const txId = Date.now().toString();


    const transaction = {
      id: txId, date: now, amount,
      type: 'Пенсійні заощадження', category: 'Пенсійні заощадження',
      account: savingsAccount || 'Готівка',
      description: savingsNote || 'Поповнення пенсійних заощаджень',
      userName: '',
    };
    const hist = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    localStorage.setItem('fin_history_local', JSON.stringify([transaction, ...hist]));


    if (savingsAccount) {
      const accs = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
      localStorage.setItem('fin_accounts_local', JSON.stringify(
        accs.map(a => a.name !== savingsAccount ? a : { ...a, currentBalance: (parseFloat(a.currentBalance) || 0) - amount })
      ));
    }


    const entry = { id: txId, amount, note: savingsNote || 'Поповнення', date: now };
    const newTotal   = pensionSavings + amount;
    const newHistory = [entry, ...savingsHistory];
    localStorage.setItem(PENSION_STORAGE_KEY, JSON.stringify({ total: newTotal, history: newHistory }));
    setPensionSavings(newTotal);
    setSavingsHistory(newHistory);
    setSavingsInput(''); setSavingsNote('');
    setShowAddSavingsModal(false);
  };


  const realRate = (nominalRate) => {
    if (!inflationEnabled) return nominalRate;
    return (1 + nominalRate) / (1 + inflationRate / 100) - 1;
  };


  const calcFinal = (rate) => {
    const years = retireAge - currentAge;
    if (years <= 0) return 0;
    const m = rate / 12, n = years * 12;
    return monthlyDeposit * ((Math.pow(1 + m, n) - 1) / m);
  };


  const calcFinalReal = (rate) => {
    const nominal = calcFinal(rate);
    if (!inflationEnabled) return nominal;
    const years = retireAge - currentAge;
    return nominal / Math.pow(1 + inflationRate / 100, years);
  };


  const RETIREMENT_YEARS = 25;
  const calcRequiredCapital = (rate) => {
    const years = retireAge - currentAge;
    const inflatedSpend = inflationEnabled
      ? monthlySpend * Math.pow(1 + inflationRate / 100, years)
      : monthlySpend;
    const rW = rate / 12, nW = RETIREMENT_YEARS * 12;
    return rW > 0
      ? inflatedSpend * (1 - Math.pow(1 + rW, -nW)) / rW
      : inflatedSpend * nW;
  };

  const calcRequiredDeposit = (rate) => {
    const years = retireAge - currentAge;
    if (years <= 0) return 0;
    const capital  = Math.max(0, calcRequiredCapital(rate) - pensionSavings);
    const rA = rate / 12, nA = years * 12;
    if (rA <= 0) return capital / nA;
    return capital * rA / (Math.pow(1 + rA, nA) - 1);
  };

  const selRate         = STRATEGIES[selectedStrategy].rate;
  const finalAmount     = calcMode === 'contribution' ? calcFinal(selRate) : calcRequiredCapital(selRate);
  const finalAmountReal = calcMode === 'contribution' ? calcFinalReal(selRate) : finalAmount;
  const requiredDeposit = calcMode === 'spend' ? calcRequiredDeposit(selRate) : monthlyDeposit;
  const totalWithSavings = finalAmount + pensionSavings;
  const yearsLeft       = retireAge - currentAge;

  if (loading) return (
    <div className="ml-64 p-10 flex flex-col items-center justify-center h-screen bg-[#f8f9fc]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={48}/>
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400">Аналіз фінансового профілю...</p>
    </div>
  );

  const selS = STRATEGIES[selectedStrategy];

  return (
    <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">

      {showInfoModal  && <StrategyInfoModal strategy={showInfoModal} onClose={() => setShowInfoModal(null)}/>}
      {showCompare    && <CompareModal monthlyDeposit={monthlyDeposit} currentAge={currentAge} retireAge={retireAge} onClose={() => setShowCompare(false)}/>}

      <div className="max-w-5xl mx-auto">

        {}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4 italic">
              <Target className="text-indigo-600" size={36}/> Пенсійний план
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 ml-1">Калькулятор стратегій накопичень</p>
          </div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl text-gray-400 hover:text-indigo-600 font-black shadow-sm border border-gray-100 uppercase text-[10px] tracking-widest transition-all active:scale-95">
            <ArrowLeft size={18}/> Назад
          </button>
        </div>

        {}
        <div className="bg-indigo-900 rounded-[50px] p-10 mb-10 shadow-2xl">
          <style>{`
            @keyframes pension-bar-grow { from{width:0%} to{width:var(--pension-pct)} }
            @keyframes pension-shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
            .pension-bar-fill {
              background: linear-gradient(90deg,#818cf8 0%,#a78bfa 20%,#fb923c 45%,#fbbf24 55%,#a78bfa 80%,#818cf8 100%);
              background-size: 200% 100%;
              animation: pension-bar-grow 1.2s cubic-bezier(.22,.68,0,1.1) 0.2s both,
                         pension-shimmer 2.4s linear 1.4s infinite;
            }
          `}</style>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-700 rounded-3xl flex items-center justify-center">
                <PiggyBank size={32} className="text-indigo-300"/>
              </div>
              <div>
                <p className="text-indigo-300 font-black uppercase text-[10px] tracking-[0.3em] mb-1">Мої пенсійні заощадження</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">
                  ₴ {pensionSavings.toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-indigo-400 text-[10px] font-black uppercase mt-1 tracking-widest">
                  {savingsHistory.length > 0 ? `Останнє: ${new Date(savingsHistory[0].date).toLocaleDateString('uk-UA')}` : 'Поки що немає поповнень'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowAddSavingsModal(true)}
              className="flex items-center gap-3 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl active:scale-95">
              <Plus size={18}/> Поповнити заощадження
            </button>
          </div>

          {finalAmount > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-3">
                <p className="text-indigo-300 font-black text-[10px] uppercase tracking-widest">Прогрес до цільового капіталу</p>
                <p className="text-white font-black text-[10px]">{Math.min(Math.round((pensionSavings/finalAmount)*100),100)}%</p>
              </div>
              <div className="w-full h-4 bg-indigo-900/60 rounded-full overflow-hidden" style={{boxShadow:'inset 0 2px 6px rgba(0,0,0,0.3)'}}>
                <div className="pension-bar-fill h-full rounded-full" style={{'--pension-pct':`${Math.min((pensionSavings/finalAmount)*100,100)}%`, width:`${Math.min((pensionSavings/finalAmount)*100,100)}%`}}/>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-indigo-400 text-[9px] font-bold">₴ {pensionSavings.toLocaleString('uk-UA')}</p>
                <p className="text-indigo-400 text-[9px] font-bold">₴ {Math.round(finalAmount).toLocaleString('uk-UA')}</p>
              </div>
            </div>
          )}

          {savingsHistory.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {savingsHistory.slice(0,3).map(entry => (
                <div key={entry.id} className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                  <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('uk-UA')}</p>
                  <p className="text-white font-black text-lg mt-1">+₴ {entry.amount.toLocaleString('uk-UA')}</p>
                  <p className="text-indigo-400 text-[9px] mt-0.5">{entry.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[45px] shadow-sm border border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Параметри віку</label>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-black uppercase">Зараз</span>
                    <span className="text-indigo-600 font-black">{currentAge} років</span>
                  </div>
                  <input type="range" min="18" max="60" value={currentAge} onChange={e=>setCurrentAge(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-black uppercase">Вік виходу на пенсію</span>
                    <span className="text-indigo-600 font-black">{retireAge} років</span>
                  </div>
                  <input type="range" min="50" max="80" value={retireAge} onChange={e=>setRetireAge(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white p-8 rounded-[45px] shadow-sm border border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Режим розрахунку</label>
              <div className="flex p-1.5 bg-gray-100 rounded-[20px] gap-1 mb-5">
                <button onClick={() => setCalcMode('contribution')}
                  className={`flex-1 py-3 rounded-[16px] font-black text-[10px] uppercase tracking-widest transition-all ${calcMode === 'contribution' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  Внесок / міс
                </button>
                <button onClick={() => setCalcMode('spend')}
                  className={`flex-1 py-3 rounded-[16px] font-black text-[10px] uppercase tracking-widest transition-all ${calcMode === 'spend' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  Витрати на пенсії
                </button>
              </div>

              {calcMode === 'contribution' ? (
                <>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Щомісячний внесок (₴)</label>
                  <input type="number" value={monthlyDeposit} onChange={e=>setMonthlyDeposit(Number(e.target.value))}
                    className="w-full p-6 bg-gray-50 rounded-[25px] border-none outline-none font-black text-3xl text-indigo-600 focus:ring-2 ring-indigo-500 transition-all"/>
                  <p className="text-[9px] font-bold text-gray-400 mt-3 uppercase tracking-tighter italic">
                    * ~10% від доходу (~{Math.round(userStats.avgIncome*0.1).toLocaleString('uk-UA')} ₴)
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Бажані витрати на пенсії (₴/міс)</label>
                  <input type="number" value={monthlySpend} onChange={e=>setMonthlySpend(Number(e.target.value))}
                    className="w-full p-6 bg-gray-50 rounded-[25px] border-none outline-none font-black text-3xl text-green-600 focus:ring-2 ring-green-500 transition-all"/>
                  <p className="text-[9px] font-bold text-gray-400 mt-3 uppercase tracking-tighter italic">
                    * Скільки ₴ ви хочете витрачати щомісяця на пенсії
                  </p>
                  {yearsLeft > 0 && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-2xl">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Необхідний внесок зараз</p>
                      <p className="text-xl font-black text-indigo-700">₴ {Math.round(requiredDeposit).toLocaleString('uk-UA')} / міс</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {}
            <div className="bg-white p-8 rounded-[45px] shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Врахувати інфляцію</label>
                <button onClick={() => setInflationEnabled(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 ${inflationEnabled ? 'bg-orange-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${inflationEnabled ? 'left-6' : 'left-0.5'}`}/>
                </button>
              </div>
              {inflationEnabled ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Річна інфляція</span>
                      <span className="font-black text-orange-500">{inflationRate}%</span>
                    </div>
                    <input type="range" min="1" max="25" step="0.5" value={inflationRate}
                      onChange={e => setInflationRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-gray-300 font-bold">1%</span>
                      <span className="text-[9px] text-gray-300 font-bold">25%</span>
                    </div>
                  </div>
                  <input type="number" min="1" max="25" step="0.1" value={inflationRate}
                    onChange={e => setInflationRate(Math.min(25, Math.max(1, Number(e.target.value))))}
                    className="w-full p-4 bg-orange-50 rounded-[20px] border-none outline-none font-black text-lg text-orange-600 focus:ring-2 ring-orange-400 transition-all text-center"/>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter italic">
                    {calcMode === 'contribution'
                      ? '* Показує реальну купівельну спроможність у сьогоднішніх цінах'
                      : '* Бажана сума перераховується в ціни на момент виходу на пенсію'}
                  </p>
                </div>
              ) : (
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter italic">
                  Розрахунок без поправки на знецінення грошей
                </p>
              )}
            </div>
          </div>

          {}
          <div className="lg:col-span-2 space-y-10">

            {}
            <div className="grid grid-cols-3 gap-5">
              {Object.values(STRATEGIES).map(s => {
                const { Icon } = s;
                const active = selectedStrategy === s.key;
                return (
                  <div key={s.key} className="relative">
                    <button onClick={() => setSelectedStrategy(s.key)}
                      className={`w-full p-7 rounded-[36px] border-4 transition-all flex flex-col items-center text-center gap-3 ${active ? 'border-indigo-600 bg-indigo-50 shadow-xl scale-105' : 'border-white bg-white shadow-sm hover:border-gray-100'}`}>
                      <div style={{ color: active ? s.color : '#d1d5db' }} className="transition-all">
                        <Icon/>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{s.name}</span>
                      <span className="text-[10px] font-black text-indigo-400 italic">~{s.rate*100}% річних</span>
                    </button>
                    {}
                    <button onClick={() => setShowInfoModal(s.key)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-100 opacity-50"
                      style={{ background: s.colorBg, color: s.color }}
                      title="Детальніше про стратегію">
                      <Info size={14}/>
                    </button>
                  </div>
                );
              })}
            </div>

            {}
            <div className="bg-indigo-900 rounded-[60px] p-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={180}/>
              </div>
              <div className="relative z-10">
                <p className="text-indigo-200 font-black uppercase text-[10px] tracking-[0.3em] mb-2">
                  {calcMode === 'contribution'
                    ? `Розрахунковий капітал до ${retireAge} років`
                    : `Необхідний капітал для ₴${monthlySpend.toLocaleString('uk-UA')}/міс на пенсії`}
                </p>
                <h3 className="text-5xl font-black mb-1 tracking-tighter">₴ {Math.round(finalAmount).toLocaleString('uk-UA')}</h3>
                {inflationEnabled && calcMode === 'contribution' && (
                  <p className="text-orange-300 text-sm font-black mb-2">
                    ≈ ₴{Math.round(finalAmountReal).toLocaleString('uk-UA')} у сьогоднішніх цінах ({inflationRate}%/рік)
                  </p>
                )}
                {inflationEnabled && calcMode === 'spend' && (
                  <p className="text-orange-300 text-sm font-black mb-2">
                    З урахуванням інфляції {inflationRate}%/рік за {yearsLeft} р.
                  </p>
                )}
                {pensionSavings > 0 && (
                  <p className="text-indigo-300 text-sm font-black mb-5">+ ₴{pensionSavings.toLocaleString('uk-UA')} вже заощаджено = <span className="text-white">₴{Math.round(totalWithSavings).toLocaleString('uk-UA')}</span></p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {calcMode === 'contribution' ? (
                    <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                      <p className="text-[10px] font-black text-indigo-200 uppercase mb-2 tracking-widest">Прибуток від відсотків</p>
                      <p className="text-2xl font-black">₴ {Math.round(finalAmount-(monthlyDeposit*12*yearsLeft)).toLocaleString('uk-UA')}</p>
                    </div>
                  ) : (
                    <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                      <p className="text-[10px] font-black text-indigo-200 uppercase mb-2 tracking-widest">Необхідний внесок / міс</p>
                      <p className="text-2xl font-black text-green-300">₴ {Math.round(requiredDeposit).toLocaleString('uk-UA')}</p>
                    </div>
                  )}
                  <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                    <p className="text-[10px] font-black text-indigo-200 uppercase mb-2 tracking-widest">Горизонт накопичення</p>
                    <p className="text-2xl font-black">{yearsLeft > 0 ? yearsLeft : 0} років</p>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h4 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                    <Info size={16} className="text-indigo-500"/> Порівняння стратегій
                  </h4>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Підсумкові суми при однаковому внеску</p>
                </div>
                <button onClick={() => setShowCompare(true)}
                  className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 fi-btn" style={{color:'white'}}>
                  Детальне порівняння →
                </button>
              </div>
              <div className="space-y-4">
                {Object.values(STRATEGIES).map(s => {
                  const amount = calcFinal(s.rate);
                  const { Icon } = s;
                  const active = selectedStrategy === s.key;
                  return (
                    <div key={s.key} className={`flex items-center justify-between p-5 rounded-[28px] transition-colors ${active ? 'bg-indigo-50/70' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: active ? s.color : '#d1d5db', background: active ? s.colorBg : 'transparent' }}>
                          <Icon/>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{s.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 italic">{s.desc}</p>
                        </div>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">₴ {Math.round(amount).toLocaleString('uk-UA')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      {showAddSavingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-6 pt-10 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[55px] p-12 relative shadow-2xl my-auto">
            <button onClick={() => setShowAddSavingsModal(false)} className="absolute right-10 top-10 text-gray-300 hover:text-red-500 transition-all">
              <X size={32}/>
            </button>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <PiggyBank size={28} className="text-indigo-600"/>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Поповнити заощадження</h3>
            </div>
            <form onSubmit={handleAddSavings} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block tracking-widest">Сума поповнення (₴)</label>
                <input autoFocus type="number" value={savingsInput} onChange={e=>setSavingsInput(e.target.value)} placeholder="0.00" required
                  className="w-full p-6 bg-gray-50 rounded-[25px] border-none outline-none font-black text-3xl text-indigo-600 focus:ring-2 ring-indigo-500 transition-all"/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block tracking-widest">Списати з рахунку</label>
                <select value={savingsAccount} onChange={e => setSavingsAccount(e.target.value)}
                  className="w-full p-5 bg-gray-50 rounded-[25px] border-none outline-none font-black text-[11px] uppercase cursor-pointer focus:ring-2 ring-indigo-500 transition-all">
                  {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  <option value="Готівка">Готівка</option>
                </select>
                {savingsAccount && savingsInput && parseFloat(savingsInput) > 0 && (() => {
                  const acc = accounts.find(a => a.name === savingsAccount);
                  const bal = acc ? parseFloat(acc.currentBalance) || 0 : null;
                  if (bal === null) return null;
                  const after = bal - parseFloat(savingsInput);
                  return (
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ml-2 ${after < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      Залишок після: ₴ {after.toLocaleString('uk-UA', {minimumFractionDigits:2})}
                      {after < 0 && ' ⚠ Недостатньо коштів'}
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block tracking-widest">Примітка</label>
                <input type="text" value={savingsNote} onChange={e=>setSavingsNote(e.target.value)} placeholder="***"
                  className="w-full p-5 bg-gray-50 rounded-[25px] border-none outline-none font-bold focus:ring-2 ring-indigo-500 transition-all"/>
              </div>
              <div className="bg-indigo-50 rounded-[25px] p-5">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Поточні заощадження</p>
                <p className="text-2xl font-black text-indigo-700">₴ {pensionSavings.toLocaleString('uk-UA')}</p>
                {savingsInput && parseFloat(savingsInput) > 0 && (
                  <p className="text-[10px] font-black text-indigo-500 mt-2">
                    Після поповнення: ₴ {(pensionSavings+parseFloat(savingsInput)).toLocaleString('uk-UA')}
                  </p>
                )}
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[30px] font-black uppercase text-xs tracking-[0.3em] hover:bg-indigo-800 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <Save size={18}/> Зберегти
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pension;