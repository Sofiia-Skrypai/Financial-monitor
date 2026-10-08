import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import {
  Scale, TrendingUp, Lightbulb, ArrowLeft, FileText,
  Loader, ChevronDown, CreditCard, Wallet, Calendar,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEJAVU_SANS_REGULAR, DEJAVU_SANS_BOLD } from './dejavuSansFont';

const tr = (text) => {
  if (!text) return '';
  const map = {
    'А':'A','Б':'B','В':'V','Г':'H','Ґ':'G','Д':'D','Е':'E','Є':'Ye','Ж':'Zh','З':'Z',
    'И':'Y','І':'I','Ї':'Yi','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P',
    'Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Shch',
    'Ю':'Yu','Я':'Ya','а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye',
    'ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n',
    'о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch',
    'ш':'sh','щ':'shch','ю':'yu','я':'ya','ь':'','\'':'','\u2019':'',
  };
  return text.split('').map(c => map[c] ?? c).join('');
};

const pt = (text) => String(text || '');

const fmtUAH = (n) => Number(n || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 });

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

const buildForecast = (history) => {

  const monthMap = {};
  history.filter(t => t.type === 'Витрата').forEach(t => {
    const d = new Date(t.date);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthMap[k] = (monthMap[k]||0) + Math.abs(Number(t.amount));
  });
  const vals = Object.keys(monthMap).sort().map(k => monthMap[k]);

  if (vals.length < 2) {
    return { forecast: Math.round(vals[0]||0), rmse: null, accuracy: 'Потрібно більше даних', accuracyNote: 'Додайте транзакції хоча б за два різних місяці.', accuracyPct: null };
  }

  if (vals.length < 3) {

    const avg = Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
    return { forecast: avg, rmse: null, accuracy: 'Середня', accuracyNote: 'Прогноз орієнтовний — додайте ще місяць історії для точнішої моделі.', accuracyPct: null };
  }


  const n = vals.length;
  const X = vals.map((_, i) => [i]);
  const trees = _rfTrain(X, vals, 100, 42);
  const preds = X.map(x => _rfPredict(trees, x));
  const meanY = vals.reduce((a, b) => a + b, 0) / n;
  const ssRes = vals.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
  const ssTot = vals.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const rmse = Math.round(Math.sqrt(ssRes / n));
  const r2   = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  const mape = vals.reduce((s, y, i) =>
    s + (Math.abs(y) > 1e-9 ? Math.abs((y - preds[i]) / y) : 0), 0) / n;
  const accuracyPct = Math.max(0, Math.min(100, (1 - mape) * 100));
  const forecast = Math.max(0, Math.round(_rfPredict(trees, [n])));


  const accuracy = accuracyPct >= 88 ? 'Висока'
                 : accuracyPct >= 75 ? 'Хороша'
                 : accuracyPct >= 50 ? 'Середня'
                 : 'Низька';
  const accuracyNote = accuracyPct >= 88
    ? 'Прогноз дуже надійний — ваші витрати стабільні з місяця в місяць.'
    : accuracyPct >= 75
    ? 'Прогноз досить точний — невеликі відхилення можливі.'
    : accuracyPct >= 50
    ? 'Прогноз орієнтовний — витрати нерегулярні.'
    : 'Недостатньо стабільних даних для точного прогнозу.';

  return { forecast, rmse, accuracy, accuracyNote, accuracyPct: Math.round(accuracyPct * 10) / 10 };
};

const MONTH_NAMES = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                     'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];

const getAvailableMonths = (history) => {
  const seen = new Set();
  history.forEach(t => {
    const d = new Date(t.date);
    seen.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  });
  return [...seen].sort().reverse();
};

const filterByPeriod = (history, period) => {
  if (period === 'all') return history;
  const [year, month] = period.split('-').map(Number);
  return history.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth()+1 === month;
  });
};

const formatPeriodLabel = (period) => {
  if (period === 'all') return 'Весь час';
  if (period === 'current') {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
  const parts = period.split('-');
  if (parts.length !== 2) return period;
  const year = Number(parts[0]), month = Number(parts[1]);
  if (isNaN(year) || isNaN(month)) return period;
  return `${MONTH_NAMES[month-1]} ${year}`;
};

const AccountBalanceWidget = ({ accounts }) => {
  const real   = accounts.filter(a => !a.isPension && a.name);
  const total  = real.reduce((s,a) => s + Number(a.currentBalance||0), 0);
  const maxBal = Math.max(...real.map(a => Math.abs(Number(a.currentBalance||0))), 1);
  const COLORS = ['#6366f1','#f97316','#10b981','#ec4899','#0ea5e9','#f59e0b','#8b5cf6','#14b8a6'];

  return (
    <div className="bg-white rounded-[45px] shadow-sm border border-gray-100 p-8 mb-6">
      <h3 className="font-black text-gray-900 text-xl tracking-tighter mb-1 flex items-center gap-3">
        <Wallet className="text-indigo-500" size={22}/> Баланс за рахунками
      </h3>
      <p className="text-xs text-gray-400 font-medium mb-5">На яких рахунках найбільше грошей?</p>
      <p className="text-4xl font-black text-gray-900 tracking-tighter mb-6">
        {fmtUAH(total)} <span className="text-xl text-gray-400 font-bold">грн</span>
      </p>
      <div className="space-y-4">
        {real
          .sort((a,b) => Number(b.currentBalance||0) - Number(a.currentBalance||0))
          .map((acc, i) => {
            const bal   = Number(acc.currentBalance||0);
            const pct   = Math.abs(bal) / maxBal * 100;
            const color = COLORS[i % COLORS.length];
            return (
              <div key={acc.id||i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-black text-gray-800 text-sm">{acc.name}</span>
                  <span className="font-black text-sm" style={{color}}>{fmtUAH(bal)} грн</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${Math.max(pct,1)}%`, backgroundColor:color }}/>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const Compare = () => {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(true);
  const [rawData, setRawData]       = useState({ users:[], history:[], accounts:[] });
  const [period, setPeriod]         = useState('current');
  const [reportTarget, setReportTarget] = useState('all');
  const [mlRec, setMlRec]           = useState('');
  const [forecastData, setForecastData] = useState({ forecast:0, rmse:null, accuracy:'', accuracyNote:'', accuracyPct:null });

  const availableMonths = useMemo(() => getAvailableMonths(rawData.history), [rawData.history]);


  const filteredHistory = useMemo(() => {
    if (period === 'current') {
      const now = new Date();
      return rawData.history.filter(t => {
        const d = new Date(t.date);
        return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
      });
    }
    return filterByPeriod(rawData.history, period);
  }, [rawData.history, period]);


  const processedUsers = useMemo(() => {
    return rawData.users.map(user => {
      const txs     = filteredHistory.filter(t => t.userName === user.name);
      const income  = txs.filter(t=>t.type==='Дохід').reduce((s,t)=>s+Number(t.amount),0);
      const expense = txs.filter(t=>t.type==='Витрата').reduce((s,t)=>s+Number(t.amount),0);
      const catMap  = {};
      txs.filter(t=>t.type==='Витрата').forEach(t => {
        const c = t.category||'Інше';
        catMap[c] = (catMap[c]||0) + Number(t.amount);
      });
      return { name:user.name, income, expense, catMap,
        chartData: [
          { name:'Дохід',   value: income||0.1,  color:'#10b981' },
          { name:'Витрати', value: expense||0.1, color:'#f97316' },
        ],
      };
    });
  }, [rawData.users, filteredHistory]);


  const catBarData = useMemo(() => {
    const map = {};
    filteredHistory.filter(t=>t.type==='Витрата').forEach(t => {
      const c = t.category||'Інше';
      map[c] = (map[c]||0) + Number(t.amount);
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([name,value]) => ({ name: name.length>10 ? name.slice(0,9)+'…' : name, value: Math.round(value) }));
  }, [filteredHistory]);


  useEffect(() => {
    if (!rawData.history.length) return;
    const fd = buildForecast(rawData.history);
    setForecastData(fd);

    const totalIncome  = processedUsers.reduce((s,u)=>s+u.income, 0);
    const totalExpense = processedUsers.reduce((s,u)=>s+u.expense, 0);
    const balance      = totalIncome - totalExpense;

    let rec = '';
    if (totalIncome===0 && totalExpense===0) {
      rec = 'Даних за вибраний період недостатньо. Спробуйте обрати інший діапазон або додайте транзакції.';
    } else if (balance >= 0) {
      const savSug = Math.round(totalIncome * 0.1);
      const ratio  = totalIncome > 0 ? totalExpense / totalIncome : 0;
      rec = ratio > 0.8
        ? `Витрати складають ${Math.round(ratio*100)}% від доходу. Рекомендується скоротити необов'язкові категорії та відкладати ₴${savSug.toLocaleString('uk-UA')} щомісяця.`
        : `Баланс позитивний. Рекомендується виділити ₴${savSug.toLocaleString('uk-UA')} (10% доходу) у заощадження.`;
    } else {
      const deficit = Math.abs(balance);
      rec = `Витрати перевищують доходи на ₴${deficit.toLocaleString('uk-UA')}. Скоротіть витрати на розваги та кафе, перегляньте регулярні платежі.`;
    }
    setMlRec(rec);
  }, [processedUsers, rawData.history]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [history, users, accounts] = await Promise.all([
          apiService.getHistory(), apiService.getUsers(), apiService.getAccounts(),
        ]);
        setRawData({ users, history, accounts });
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);


  const generatePDF = () => {
    const doc    = new jsPDF();


    doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_REGULAR);
    doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD);
    doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
    doc.setFont('DejaVuSans', 'normal');

    const isAll  = reportTarget === 'all';
    const tName  = isAll ? 'Всі дані' : reportTarget;
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const mg     = 14;
    const checkY = (y, need = 20) => {
      if (y + need > pageH - 20) { doc.addPage(); return mg + 10; }
      return y;
    };

    const txPool = isAll
      ? rawData.history
      : rawData.history.filter(t => t.userName === reportTarget);


    const sectionTitle = (y, n, title) => {
      doc.setFontSize(13); doc.setFont('DejaVuSans','bold'); doc.setTextColor(15,23,42);
      doc.text(`${n}. ${title}`, mg, y);
      return y + 8;
    };


    doc.setFillColor(15,23,42);
    doc.rect(0,0,pageW,55,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22); doc.setFont('DejaVuSans','bold');
    doc.text('FinMonitor — Фінансовий звіт', pageW/2, 22, { align:'center' });
    doc.setFontSize(10); doc.setFont('DejaVuSans','normal');
    doc.text(`Звіт для: ${tName}`, pageW/2, 33, { align:'center' });
    doc.text(`Період: ${formatPeriodLabel(period)}`, pageW/2, 39, { align:'center' });
    doc.text(`Згенеровано: ${new Date().toLocaleDateString('uk-UA')}`, pageW/2, 45, { align:'center' });


    let y = 65;
    y = sectionTitle(y, 1, 'Статистика учасників');
    const usersToShow = isAll ? processedUsers : processedUsers.filter(u => u.name===reportTarget);
    autoTable(doc, {
      head: [['Учасник','Дохід (грн)','Витрати (грн)','Баланс (грн)']],
      body: usersToShow.map(u => [
        u.name,
        `+${Math.round(u.income).toLocaleString('uk-UA')} грн`,
        `-${Math.round(u.expense).toLocaleString('uk-UA')} грн`,
        `${u.income>=u.expense?'+':''}${Math.round(u.income-u.expense).toLocaleString('uk-UA')} грн`,
      ]),
      startY: y,
      headStyles: { fillColor:[15,23,42], textColor:255, fontStyle:'bold', fontSize:10 },
      bodyStyles: { fontSize:10 },
      columnStyles: { 1:{textColor:[16,185,129]}, 2:{textColor:[239,68,68]}, 3:{textColor:[99,102,241]} },
      styles: { font:'DejaVuSans', cellPadding:4 },
      margin: { left:mg, right:mg },
    });
    y = doc.lastAutoTable.finalY + 10;


    y = checkY(y, 30);
    y = sectionTitle(y, 2, 'Баланс за рахунками');
    const realAccs   = rawData.accounts.filter(a => !a.isPension && a.name);
    const totalAccBal = realAccs.reduce((s,a)=>s+Number(a.currentBalance||0),0);
    autoTable(doc, {
      head: [['Рахунок','Валюта','Баланс']],
      body: [
        ...realAccs.sort((a,b)=>Number(b.currentBalance||0)-Number(a.currentBalance||0))
          .map(a => [a.name, a.currency||'UAH',
            `${Number(a.currentBalance||0).toLocaleString('uk-UA',{minimumFractionDigits:2})} ${a.currency||'грн'}`]),
        ['','Усього:', `${totalAccBal.toLocaleString('uk-UA',{minimumFractionDigits:2})} грн`],
      ],
      startY: y,
      headStyles: { fillColor:[99,102,241], textColor:255, fontStyle:'bold', fontSize:10 },
      bodyStyles: { fontSize:10 },
      styles: { font:'DejaVuSans', cellPadding:4 },
      margin: { left:mg, right:mg },
    });
    y = doc.lastAutoTable.finalY + 10;


    y = checkY(y, 30);
    y = sectionTitle(y, 3, 'Витрати за категоріями за період');
    const catTotals = {};
    txPool.filter(t=>t.type==='Витрата').forEach(t => {
      catTotals[t.category||'Inshi'] = (catTotals[t.category||'Inshi']||0) + Number(t.amount);
    });
    const catRows  = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    const catTotal = catRows.reduce((s,[,v])=>s+v,0);
    autoTable(doc, {
      head: [['Категорія','Сума (грн)','Частка (%)']],
      body: catRows.length > 0
        ? catRows.map(([cat,amt]) => [cat, `-${Math.round(amt).toLocaleString('uk-UA')} грн`,
            `${catTotal>0?Math.round(amt/catTotal*100):0}%`])
        : [['Даних за вибраний період немає','','']],
      startY: y,
      headStyles: { fillColor:[249,115,22], textColor:255, fontStyle:'bold', fontSize:10 },
      bodyStyles: { fontSize:10 },
      styles: { font:'DejaVuSans', cellPadding:4 },
      margin: { left:mg, right:mg },
    });
    y = doc.lastAutoTable.finalY + 10;



    const _accStrPreview = forecastData.accuracyPct !== null
      ? `Точність прогнозу: ${forecastData.accuracy} (${forecastData.accuracyPct.toFixed(1)}%, модель — Random Forest)`
      : `Точність прогнозу: ${forecastData.accuracy} (модель — Random Forest)`;
    const _accLines  = doc.splitTextToSize(_accStrPreview, pageW-mg*2-14);
    const _accH      = _accLines.length * 5 + 2;
    const _noteLines = doc.splitTextToSize(forecastData.accuracyNote||'', pageW-mg*2-14);
    const _noteH     = _noteLines.length * 5;
    const _devH      = forecastData.rmse ? 7 : 0;

    const _boxH       = 10 + 3 + 14 + 4 + _accH + _noteH + _devH + 10;
    const _safeBoxH   = Math.max(_boxH, 52);

    y = checkY(y, _safeBoxH + 16);
    y = sectionTitle(y, 4, 'Прогноз витрат на наступний місяць');
    doc.setFillColor(238,242,255);
    doc.roundedRect(mg, y, pageW-mg*2, _safeBoxH, 4, 4, 'F');

    let _fy = y + 10;
    doc.setFontSize(10); doc.setFont('DejaVuSans','bold'); doc.setTextColor(67,56,202);
    doc.text('Очікувані витрати:', mg+6, _fy);  _fy += 14;

    doc.setFontSize(22); doc.setFont('DejaVuSans','bold'); doc.setTextColor(15,23,42);
    doc.text(`~${forecastData.forecast.toLocaleString('uk-UA')} грн`, mg+6, _fy);  _fy += 9;

    doc.setFontSize(9); doc.setFont('DejaVuSans','normal'); doc.setTextColor(100,116,139);
    doc.text(_accLines, mg+6, _fy);  _fy += _accH;
    doc.text(_noteLines, mg+6, _fy);  _fy += _noteH;
    if (forecastData.rmse) {
      doc.text(`Можливий відхил: ±${forecastData.rmse.toLocaleString('uk-UA')} грн`, mg+6, _fy);
    }
    y += _safeBoxH + 8;


    y = checkY(y, 40);
    y = sectionTitle(y, 5, 'Рекомендації оптимізатора');
    doc.setFillColor(255,247,237);
    const recBox = Math.max(24, doc.splitTextToSize(mlRec, pageW-mg*2-10).length * 6 + 10);
    doc.roundedRect(mg, y, pageW-mg*2, recBox, 4,4,'F');
    doc.setFontSize(10); doc.setFont('DejaVuSans','normal'); doc.setTextColor(124,45,18);
    const recLines = doc.splitTextToSize(mlRec, pageW-mg*2-10);
    doc.text(recLines, mg+5, y+8);
    y += recBox + 5;

    if (catRows.length > 0) {
      y = checkY(y, 20);
      doc.setFontSize(9); doc.setFont('DejaVuSans','bold'); doc.setTextColor(15,23,42);
      doc.text('Рекомендовані скорочення (топ-5 категорій, −30%):', mg, y); y += 5;
      autoTable(doc, {
        head: [['Категорія','Поточні витрати','Рекоменд. скорочення','Економія/міс']],
        body: catRows.slice(0,5).map(([cat,amt]) => [
          cat, `${Math.round(amt).toLocaleString('uk-UA')} грн`,
          '-30%', `${Math.round(amt*0.3).toLocaleString('uk-UA')} грн`,
        ]),
        startY: y,
        headStyles: { fillColor:[239,68,68], textColor:255, fontSize:8 },
        bodyStyles: { fontSize:8 },
        styles: { font:'DejaVuSans', cellPadding:2.5 },
        margin: { left:mg, right:mg },
      });
      y = doc.lastAutoTable.finalY + 10;
    }


    y = checkY(y, 30);
    y = sectionTitle(y, 6, 'Останні операції');
    const txExport = txPool.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30);
    autoTable(doc, {
      head: [['Дата','Учасник','Категорія','Рахунок','Сума']],
      body: txExport.map(t => [
        new Date(t.date).toLocaleDateString('uk-UA'),
        t.userName||'Система',
        t.category||'Інше',
        t.account||'Готівка',
        `${t.type==='Витрата'?'-':'+'}${Math.round(t.amount).toLocaleString('uk-UA')} грн`,
      ]),
      startY: y,
      headStyles: { fillColor:[15,23,42], textColor:255, fontStyle:'bold', fontSize:8 },
      bodyStyles: { fontSize:8 },
      columnStyles: { 4:{ halign:'right' } },
      styles: { font:'DejaVuSans', cellPadding:2.5 },
      margin: { left:mg, right:mg },
      didParseCell: (data) => {
        if (data.section==='body' && data.column.index===4) {
          const v = String(data.cell.raw||'');
          data.cell.styles.textColor = v.startsWith('-') ? [239,68,68] : [16,185,129];
        }
      },
    });


    const tot = doc.internal.getNumberOfPages();
    for (let p=1;p<=tot;p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setFont('DejaVuSans','normal'); doc.setTextColor(148,163,184);
      doc.text(`FinMonitor © ${new Date().getFullYear()}  —  Сторінка ${p} із ${tot}`, pageW/2, pageH-7, {align:'center'});
    }

    doc.save(`FinMonitor_${tr(tName)}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) return (
    <div className="ml-64 p-10 flex items-center justify-center h-screen bg-gray-50">
      <Loader className="animate-spin text-orange-500" size={40}/>
    </div>
  );

  const periodLabel = period === 'current'
    ? `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`
    : formatPeriodLabel(period);

  return (
    <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
      <div className="max-w-6xl mx-auto">

        {}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tighter italic">
              <Scale className="text-orange-500" size={32}/> Аналітика балансу
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              Період: {periodLabel}
            </p>
          </div>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl text-gray-400 hover:text-orange-500 font-black shadow-sm border border-gray-100 uppercase text-[10px] tracking-widest transition-all active:scale-95">
            <ArrowLeft size={16}/> На головну
          </button>
        </div>

        {}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-7 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
            <Calendar size={16} className="text-indigo-500"/>
            <p className="text-[10px] font-black uppercase tracking-widest">Оберіть період:</p>
          </div>

          {}
          <div className="flex flex-wrap gap-2 flex-1">
            {[
              { key:'current', label:'Цей місяць' },
              { key:'all',     label:'Весь час'   },
            ].map(opt => (
              <button key={opt.key} onClick={() => setPeriod(opt.key)}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${period===opt.key ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {opt.label}
              </button>
            ))}

            {}
            {availableMonths.length > 0 && (
              <div className="relative">
                <select
                  value={availableMonths.includes(period) ? period : ''}
                  onChange={e => e.target.value && setPeriod(e.target.value)}
                  className={`appearance-none pl-4 pr-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider cursor-pointer outline-none border-none transition-all ${
                    availableMonths.includes(period) ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  <option value="">Обрати місяць ▾</option>
                  {availableMonths.map(m => {
                    const [yr, mo] = m.split('-').map(Number);
                    return <option key={m} value={m}>{MONTH_NAMES[mo-1]} {yr}</option>;
                  })}
                </select>
                <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${availableMonths.includes(period)?'text-white':'text-gray-400'}`}/>
              </div>
            )}
          </div>
        </div>


        {rawData.accounts.filter(a=>!a.isPension&&a.name).length > 0 && (
          <AccountBalanceWidget accounts={rawData.accounts}/>
        )}


        {catBarData.length > 0 && (
          <div className="bg-white rounded-[45px] shadow-sm border border-gray-100 p-8 mb-7">
            <h3 className="font-black text-gray-900 text-xl tracking-tighter mb-1">
              Витрати за категоріями
            </h3>
            <p className="text-xs text-gray-400 font-medium mb-5">{periodLabel}</p>
            <div style={{height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catBarData} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{fontSize:11,fontWeight:700,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#cbd5e1'}} axisLine={false} tickLine={false}
                    tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <Tooltip formatter={v=>[`₴${Number(v).toLocaleString('uk-UA')}`,'Витрати']}
                    contentStyle={{borderRadius:14,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,.1)'}}/>
                  <Bar dataKey="value" radius={[10,10,0,0]}>
                    {catBarData.map((_,i)=>(
                      <Cell key={i} fill={['#f97316','#6366f1','#10b981','#ec4899','#0ea5e9','#f59e0b','#8b5cf6','#14b8a6'][i%8]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {}
        {processedUsers.length === 0 ? (
          <div className="bg-white p-16 rounded-[50px] text-center border-4 border-dashed border-gray-100 mb-8">
            <p className="text-gray-300 font-black uppercase italic tracking-widest">Додайте учасників та транзакції</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-8">
            {processedUsers.map((user, idx) => (
              <div key={idx} className="bg-white p-9 rounded-[50px] shadow-sm border border-gray-100 fi-card">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-black text-2xl text-gray-900">{user.name}</h3>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">{periodLabel}</p>
                  </div>
                  <div className={`p-4 rounded-2xl text-white shadow-lg ${idx===0?'bg-orange-500':'bg-indigo-600'}`}>
                    <CreditCard size={22}/>
                  </div>
                </div>

                <div className="h-48 relative mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={user.chartData} innerRadius={55} outerRadius={75} paddingAngle={10} dataKey="value">
                        {user.chartData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n)=>[`₴${Number(v).toLocaleString('uk-UA')}`,n]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Баланс</p>
                    <p className={`text-lg font-black ${(user.income-user.expense)>=0?'text-emerald-500':'text-red-500'}`}>
                      ₴{(user.income-user.expense).toLocaleString('uk-UA')}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"/>
                    <span className="text-xs font-black text-gray-500">₴{user.income.toLocaleString('uk-UA')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500"/>
                    <span className="text-xs font-black text-gray-500">₴{user.expense.toLocaleString('uk-UA')}</span>
                  </div>
                </div>

                {Object.keys(user.catMap).length > 0 && (
                  <div className="border-t border-gray-50 pt-4 space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Топ витрат</p>
                    {Object.entries(user.catMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat,amt])=>(
                      <div key={cat} className="flex justify-between text-xs font-bold">
                        <span className="text-gray-500">{cat}</span>
                        <span className="text-red-500">−₴{Math.round(amt).toLocaleString('uk-UA')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {}
        <div className="bg-white p-9 rounded-[50px] shadow-sm border border-gray-100 mb-7 grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <TrendingUp className="text-orange-500" size={20}/> Прогноз на місяць
            </h3>
            <div className="p-6 bg-orange-50 rounded-[26px] border border-orange-100">

              <h4 className="text-4xl font-black text-orange-600 tracking-tighter mb-3">
                ₴{forecastData.forecast.toLocaleString('uk-UA')}
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-500">Точність прогнозу:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    forecastData.accuracy==='Висока' ? 'bg-emerald-100 text-emerald-700' :
                    forecastData.accuracy==='Хороша' ? 'bg-blue-100 text-blue-700' :
                    forecastData.accuracy==='Середня' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{forecastData.accuracy}{forecastData.accuracyPct !== null ? ` · ${forecastData.accuracyPct.toFixed(1)}%` : ''}</span>
                </div>
                {forecastData.accuracyNote && (
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">{forecastData.accuracyNote}</p>
                )}
                {forecastData.rmse && (
                  <p className="text-xs text-gray-400 font-medium">
                    Можливий відхил: <span className="font-black text-gray-600">±₴{forecastData.rmse.toLocaleString('uk-UA')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <Lightbulb className="text-yellow-500" size={20}/> Рекомендація
            </h3>
            <div className="p-6 bg-gray-50 rounded-[26px] border border-gray-100 h-[calc(100%-52px)] flex items-center">
              <p className="text-gray-600 font-medium leading-relaxed text-sm italic">"{mlRec}"</p>
            </div>
          </div>
        </div>

        {}
        <div className="bg-black p-11 rounded-[55px] shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-7">
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Центр звітності</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Повний PDF-звіт з усіма розділами</p>
            </div>
            <div className="relative">
              <select value={reportTarget} onChange={e=>setReportTarget(e.target.value)}
                className="appearance-none bg-gray-800 border-none px-7 py-4 pr-11 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white focus:ring-2 ring-orange-500 outline-none cursor-pointer">
                <option value="all">Усі дані</option>
                {rawData.users.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500" size={16}/>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-7">
            {['Статистика учасників','Баланси по рахунках','Витрати за категоріями',
              'Прогноз на наступний місяць','Точність прогнозу','Рекомендації оптимізатора'].map(item=>(
              <div key={item} className="flex items-center gap-2 bg-gray-900 rounded-2xl px-4 py-3">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="#f97316" strokeWidth="1.4"/>
                  <path d="M3.5 6.5l2 2 4-4" stroke="#f97316" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-gray-300 text-[9px] font-bold uppercase tracking-wider">{item}</span>
              </div>
            ))}
          </div>

          <button onClick={generatePDF}
            className="w-full flex items-center justify-center gap-4 bg-orange-500 text-white p-7 rounded-[28px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white hover:text-orange-500 transition-all shadow-xl active:scale-95">
            <FileText size={20}/> Сформувати офіційний звіт (PDF)
          </button>
        </div>

      </div>
    </div>
  );
};

export default Compare;