import React, { useState, useEffect } from 'react';
import { X, Camera, Edit3, Save, CheckCircle2, User } from 'lucide-react';
import ReceiptScanner from './ReceiptScanner';

const AddTransactionModal = ({ isOpen, onClose, onSave, user }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [participants, setParticipants] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Продукти',
    type: 'Витрата',
    account: 'Готівка',
    userName: ''
  });

  const [categories, setCategories] = useState([]);


  useEffect(() => {
    if (isOpen) {
      const savedUsers = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
      const savedAccs  = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');


      const savedCats = JSON.parse(localStorage.getItem('fin_categories_local') || '[]');
      const catNames  = savedCats.length > 0
        ? savedCats.map(c => c.name)
        : ["Продукти", "Транспорт", "Зарплата", "Кафе", "Здоров'я", "Розваги"];

      setParticipants(savedUsers);
      setAccounts(savedAccs);
      setCategories(catNames);


      setFormData(prev => ({
        ...prev,
        account:  savedAccs[0]?.name || 'Готівка',
        category: catNames[0] || 'Продукти',
        userName: savedUsers[0]?.name || user?.name || user?.email || ''
      }));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount) return alert("Введіть суму!");
    if (!formData.userName) return alert("Оберіть учасника, який виконав операцію!");

    onSave({
      ...formData,
      amount: parseFloat(formData.amount),

      userName: formData.userName
    });


    setFormData({
        amount: '',
        description: '',
        category: 'Продукти',
        type: 'Витрата',
        account: accounts[0]?.name || 'Готівка',
        userName: participants[0]?.name || ''
    });
  };


  const handleScanData = (scannedData) => {
    setFormData(prev => ({
      ...prev,
      amount: scannedData.amount,
      description: scannedData.description,
      type: 'Витрата'
    }));
    setActiveTab('manual');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-10 overflow-y-auto bg-gray-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[50px] shadow-2xl overflow-hidden border border-gray-100 my-auto">

        {}
        <div className="p-8 flex justify-between items-center border-b border-gray-50 bg-gray-50/50">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Новий запис</h2>
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">Розподіл бюджету учасників</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white text-gray-400 rounded-2xl shadow-sm hover:text-red-500 transition-all">
            <X size={24} />
          </button>
        </div>

        {}
        <div className="flex p-2 bg-gray-100 mx-8 mt-6 rounded-[25px]">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
              activeTab === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
            }`}
          >
            <Edit3 size={16} /> Вручну
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
              activeTab === 'scan' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
            }`}
          >
            <Camera size={16} /> Сканувати чек
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">

              {}
              <div className="space-y-1">
                <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                  <User size={12} className="text-orange-500" /> Хто виконав операцію?
                </label>
                <select
                  value={formData.userName}
                  onChange={(e) => setFormData({...formData, userName: e.target.value})}
                  className="w-full p-4 bg-orange-50/50 rounded-3xl border-2 border-orange-100 outline-none font-black text-gray-800 appearance-none focus:bg-white transition-all"
                >
                  {participants.length > 0 ? (
                    participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                  ) : (
                    <option value={user?.name || user?.email}>{user?.name || user?.email} (Ви)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Сума (₴)</label>
                  <input
                    type="number" step="0.01" required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-5 bg-gray-50 rounded-3xl border-none outline-none font-black text-2xl text-orange-600 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Тип</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-3xl border-none outline-none font-bold text-gray-700"
                  >
                    <option value="Витрата">Витрата</option>
                    <option value="Дохід">Дохід</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Категорія</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-3xl border-none outline-none font-bold text-gray-700"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Рахунок</label>
                  <select
                    value={formData.account}
                    onChange={(e) => setFormData({...formData, account: e.target.value})}
                    className="w-full p-5 bg-gray-50 rounded-3xl border-none outline-none font-bold text-gray-700"
                  >
                    {accounts.length > 0 ? (
                      accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)
                    ) : (
                      <option>Готівка</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Опис / Магазин</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="___"
                  className="w-full p-5 bg-gray-50 rounded-3xl border-none outline-none font-bold text-gray-700"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white p-6 rounded-[30px] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl active:scale-95 mt-4"
              >
                <Save size={18} /> Підтвердити та зберегти
              </button>
            </form>
          ) : (

            <div className="animate-in fade-in zoom-in duration-500">
              <div className="rounded-[40px] overflow-hidden border-4 border-orange-100 shadow-inner">
                <ReceiptScanner onScanComplete={handleScanData} />
              </div>
              <div className="mt-6 flex items-start gap-3 p-4 bg-orange-50 rounded-3xl border border-orange-100">
                <CheckCircle2 className="text-orange-500 shrink-0" size={20} />
                <p className="text-[11px] text-orange-800 font-bold leading-relaxed">
                  Система розпізнає суму автоматично. Після сканування ви зможете обрати учасника та перевірити дані перед збереженням.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;