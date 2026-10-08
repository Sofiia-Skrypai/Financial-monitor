import React, { useState, useEffect } from 'react';

import { apiService } from '../services/api';
import ReceiptScanner from './components/ReceiptScanner';
import confetti from 'canvas-confetti';
import { Save, UserCircle, Loader2 } from 'lucide-react';

const AddExpense = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Продукти',
    userId: ''
  });


  useEffect(() => {
    const fetchUsers = async () => {
      const savedUsers = await apiService.getUsers();
      setParticipants(savedUsers);
      if (savedUsers.length > 0) {
        setFormData(prev => ({ ...prev, userId: savedUsers[0].name }));
      }
    };
    fetchUsers();
  }, []);

  const handleScanComplete = (data) => {
    setFormData(prev => ({
      ...prev,
      amount: data.amount,
      description: data.description || "Чек"
    }));

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#000000']
    });
  };

  const saveToHistory = async () => {
    if (!formData.amount || !formData.userId) return alert("Заповніть суму та оберіть учасника!");

    setLoading(true);

    const newTransaction = {
      id: Date.now().toString(),
      type: 'Витрата',
      amount: Number(formData.amount),
      description: formData.description || "Чек зі сканера",
      category: formData.category,
      userName: formData.userId,
      date: new Date().toISOString()
    };

    try {

      await apiService.saveTransaction(newTransaction);
      
      alert(`Витрату ${formData.amount} грн від імені ${formData.userId} збережено через API!`);
      setFormData({ ...formData, amount: '', description: '' });
    } catch (error) {
      alert("Помилка при збереженні через сервіс");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">AI Scanner</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Автоматичне розпізнавання чеків</p>
        </div>

        <ReceiptScanner onScanComplete={handleScanComplete} />

        <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 space-y-6 mt-10">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 ml-4 tracking-widest">Сума (₴)</label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full p-6 bg-gray-50 rounded-[25px] border-none font-black text-3xl text-orange-500 focus:ring-2 ring-orange-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 ml-4 tracking-widest">Власник чека</label>
              <select 
                value={formData.userId}
                onChange={(e) => setFormData({...formData, userId: e.target.value})}
                className="w-full p-6 bg-gray-50 rounded-[25px] border-none font-black text-xs uppercase tracking-widest text-gray-700 outline-none cursor-pointer"
              >
                {participants.map(user => (
                  <option key={user.id} value={user.name}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 ml-4 tracking-widest">Категорія</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-5 bg-gray-50 rounded-[25px] border-none font-bold text-gray-600 outline-none"
              >
                  <option value="Продукти">Продукти (магазин)</option>
                  <option value="Транспорт">Транспорт</option>
                  <option value="Розваги">Розваги</option>
                  <option value="Інше">Інше</option>
              </select>
          </div>

          <button 
            disabled={loading}
            onClick={saveToHistory}
            className="w-full bg-black text-white p-7 rounded-[35px] font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
            {loading ? 'Зберігаємо...' : 'Зафіксувати в базі'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;