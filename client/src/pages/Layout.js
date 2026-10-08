import React, { useState } from 'react';

import { apiService } from '../services/api';
import QuickAddModal from './QuickAddModal';
import { PlusCircle, Activity } from 'lucide-react';

const Layout = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleQuickSave = async (newEntry) => {
    try {
      const entryWithMeta = {
        ...newEntry,
        id: Date.now().toString(),
        date: new Date().toISOString()
      };

      await apiService.saveTransaction(entryWithMeta);
      setIsModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Помилка швидкого збереження:", error);
      alert("Не вдалося зберегти запис через сервіс");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {}
      <header className="fixed top-0 left-64 right-0 bg-white/80 backdrop-blur-md z-40 p-6 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
           <div className="relative">
              <Activity size={18} className="text-green-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Система активна</p>
              <p className="text-[8px] font-bold uppercase text-gray-400 tracking-tighter">API Service Mode (Hybrid DB)</p>
           </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 hover:bg-orange-500 transition-all shadow-xl shadow-gray-200 active:scale-95"
        >
          <PlusCircle size={16} /> Новий запис
        </button>
      </header>

      {}
      <main className="pt-24 min-h-screen">
        {children}
      </main>

      {}
      <QuickAddModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleQuickSave}
      />
    </div>
  );
};

export default Layout;