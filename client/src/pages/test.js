import React, { useState, useEffect } from 'react';

import { apiService } from '../services/api';
import {
  Wallet, TrendingUp, TrendingDown, Calendar, Users,
  BarChart3, LineChart as LineIcon, PieChart as PieIcon,
  Filter, Zap, ChevronLeft, ChevronRight, CreditCard, X, Save, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({ balance: 0, income: 0, expense: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeChart, setActiveChart] = useState('line');

  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [mlAdvice, setMlAdvice] = useState(null);

  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const COLORS = ['#f97316', '#0ea5e9', '#6366f1', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899'];


  useEffect(() => {
    const fetchData = async () => {

      const history = await apiService.getHistory();
      const savedUsers = await apiService.getUsers();
      const savedAccs = await apiService.getAccounts();

      setUsers(savedUsers);
      setAccounts(savedAccs);

      processDashboardData(history, savedUsers, savedAccs);
    };

    fetchData();
  }, [selectedUser, selectedPeriod]);


  const processDashboardData = (history) => {
    let filtered = history.filter(t => {
      const tDate = new Date(t.date);
      const diffDays = (new Date() - tDate) / (1000 * 60 * 60 * 24);
      return (selectedUser === 'all' || t.userName === selectedUser) && diffDays <= Number(selectedPeriod);
    });

    const income = filtered.filter(t => t.type === 'Дохід').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'Витрата').reduce((sum, t) => sum + Number(t.amount), 0);
    setStats({ income, expense, balance: income - expense });

    const dailyData = {};
    filtered.forEach(t => {
      const d = new Date(t.date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
      dailyData[d] = (dailyData[d] || 0) + (t.type === 'Дохід' ? Number(t.amount) : -Number(t.amount));
    });

    let timeline = Object.keys(dailyData).map(d => ({ name: d, value: dailyData[d] }));
    if (timeline.length === 1) {
        timeline = [{ name: '', value: timeline[0].value }, ...timeline, { name: ' ', value: timeline[0].value }];
    }
    setTimelineData(timeline);

    const cats = {};
    filtered.filter(t => t.type === 'Витрата').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount);
    });
    setCategoryData(Object.keys(cats).map(name => ({ name, value: cats[name] })));
  };


  const exportBackup = async () => {
    const backupData = {
      history: await apiService.getHistory(),
      accounts: await apiService.getAccounts(),
      users: await apiService.getUsers(),
      version: "2.5",
      exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Backup_Data.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleAddAccount = async () => {
    if (!newAccName) return;

    const newAcc = {
      id: Date.now(),
      name: newAccName,
      balance: 0,
      currency: 'UAH',
      color: '#6366f1',
      owner: 'all'
    };



    const currentAccs = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    localStorage.setItem('fin_accounts_local', JSON.stringify([...currentAccs, newAcc]));

    setNewAccName('');
    setIsAccModalOpen(false);


    const updatedHistory = await apiService.getHistory();
    processDashboardData(updatedHistory);
  };

  const runMLAnalysis = () => {
    const advice = stats.balance > 0
      ? "✨ ML-Аналіз: Стан рахунків стабільний. Дані синхронізовано через API-Service."
      : "⚠️ ML-Аналіз: Увага! Витрати перевищують доходи за обраний період.";
    setMlAdvice(advice);
    setTimeout(() => setMlAdvice(null), 4000);
  };

  const Gauge = ({ value, label, color, max = 15000 }) => {
    const percent = Math.min(Math.abs(value) / max, 1) * 100;
    return (
      <div className="flex flex-col items-center">
        <div className="h-28 w-40 relative">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={[{v:100}]} dataKey="v" startAngle={180} endAngle={0} innerRadius={52} outerRadius={72} fill="#f1f5f9" stroke="none" />
              <Pie data={[{v:percent}, {v:100-percent}]} dataKey="v" startAngle={180} endAngle={0} innerRadius={52} outerRadius={72} stroke="none">
                <Cell fill={color} /><Cell fill="transparent" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-xl font-black text-gray-900">{Math.abs(value).toLocaleString()}</span>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ml-64 p-8 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Dashboard</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Connected via API Service Mode</p>
          </div>

          <button onClick={exportBackup} className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-all shadow-sm">
            <Download size={16} /> Backup JSON
          </button>
        </div>


        <div className="flex gap-6 mb-8">
           <div className="bg-[#0ea5e9] text-white p-7 rounded-[35px] flex-1 shadow-lg flex justify-between items-center">
              <div><p className="text-[10px] font-black opacity-70 uppercase tracking-widest">Готівка</p><h4 className="text-2xl font-black mt-1">0.00 ₴</h4></div>
              <Wallet size={32} className="opacity-25" />
           </div>

           <div className="bg-[#065f46] text-white p-7 rounded-[35px] flex-1 shadow-lg flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{accounts[0]?.name || 'Mono Bank'}</p>
                <h4 className="text-2xl font-black mt-1">{stats.balance.toLocaleString()} ₴</h4>
              </div>
              <CreditCard size={32} className="opacity-25" />
           </div>

           <button onClick={() => setIsAccModalOpen(true)} className="bg-white border-2 border-dashed border-gray-200 text-gray-400 p-7 rounded-[35px] flex-1 hover:border-orange-400 transition-all font-black uppercase text-[10px] tracking-widest">
              + Додати рахунок
           </button>
        </div>

        {}
        <div className="flex justify-between items-center mb-10">
           <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
              <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronLeft size={18}/></button>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="bg-transparent border-none font-black text-xs uppercase tracking-widest px-4 outline-none">
                <option value="all">Усі учасники</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronRight size={18}/></button>
           </div>
           <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
              {['7', '30', '365'].map(p => (
                <button key={p} onClick={() => setSelectedPeriod(p)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedPeriod === p ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}>
                  {p === '7' ? 'Тиждень' : p === '30' ? 'Місяць' : 'Рік'}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[45px] shadow-sm border border-gray-100 flex flex-col justify-between">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest mb-8">Монітор стану</h3>
            <div className="space-y-6 flex flex-col items-center">
              <Gauge value={stats.balance} label="Баланс" color="#f43f5e" />
              <div className="flex gap-4 w-full">
                <Gauge value={stats.income} label="Дохід" color="#fbbf24" />
                <Gauge value={stats.expense} label="Витрати" color="#10b981" />
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[45px] shadow-sm border border-gray-100 lg:col-span-2 relative">
            {mlAdvice && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl z-50 flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" fill="currentColor"/> {mlAdvice}
              </div>
            )}

            <div className="flex justify-between items-center mb-10">
              <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest">
                {activeChart === 'line' ? 'Динаміка балансу' : 'Структура витрат'}
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button onClick={() => setActiveChart('line')} className={`p-3 rounded-xl transition-all ${activeChart === 'line' ? 'bg-white text-orange-500' : 'text-gray-400'}`}><LineIcon size={20}/></button>
                <button onClick={() => setActiveChart('pie')} className={`p-3 rounded-xl transition-all ${activeChart === 'pie' ? 'bg-white text-orange-500' : 'text-gray-400'}`}><PieIcon size={20}/></button>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'line' ? (
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#cbd5e1'}} />
                    <Tooltip contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={6} dot={{r: 8, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff'}} />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie data={categoryData} innerRadius={80} outerRadius={115} paddingAngle={8} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-black text-gray-300 text-[10px] uppercase tracking-widest">Всього: {stats.expense}</text>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={runMLAnalysis} className="bg-[#1e3a8a] text-white px-10 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.25em] flex items-center gap-3 hover:bg-orange-500 shadow-xl active:scale-95 transition-all">
                <Zap size={14} fill="currentColor"/> ML-Оптимізація
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      {isAccModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-slate-800">
          <div className="bg-white rounded-[50px] p-12 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Новий рахунок</h3>
              <button onClick={() => setIsAccModalOpen(false)} className="p-2 text-gray-300 hover:text-red-500"><X size={28}/></button>
            </div>
            <input
              autoFocus type="text" value={newAccName} onChange={(e) => setNewAccName(e.target.value)}
              placeholder="Назва рахунку"
              className="w-full p-6 bg-gray-50 rounded-3xl border-none outline-none font-bold mb-8 focus:ring-4 ring-orange-500/20 text-lg"
            />
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