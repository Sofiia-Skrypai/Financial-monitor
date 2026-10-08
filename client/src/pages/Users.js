import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import {
  User, UserPlus, Edit2, Trash2, Check, X, Loader,
  ShieldCheck, Lock, Unlock,
} from 'lucide-react';

const RESTRICTED_PATHS = [
  { path: '/users',   label: 'Учасники'  },
  { path: '/compare', label: 'Порівняти' },
  { path: '/pension', label: 'Пенсія'    },
];

const Users = ({ user }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isEditing, setIsEditing]       = useState(null);
  const [editData, setEditData]         = useState({ name: '', role: '' });
  const [showAddForm, setShowAddForm]   = useState(false);
  const [openPermsId, setOpenPermsId]   = useState(null);

  const isAdmin = user?.role === 'Адмін';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const savedUsers = await apiService.getUsers();
      if (savedUsers.length === 0) {

        setParticipants([]);
      } else {

        const cleaned = savedUsers.filter(u => !(u.name === 'Катерина' && u.id === '1'));
        setParticipants(cleaned);
        if (cleaned.length !== savedUsers.length) {
          localStorage.setItem('fin_users_local', JSON.stringify(cleaned));
        }
      }
    } catch (error) {
      console.error('Помилка завантаження учасників:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);


  const addUser = (e) => {
    e.preventDefault();
    const newUser = {
      id: Date.now().toString(),
      name: e.target.uname.value.trim(),
      role: e.target.role.value.trim() || 'Учасник',
      grantedPaths: [],
    };
    const updated = [...participants, newUser];
    localStorage.setItem('fin_users_local', JSON.stringify(updated));
    setParticipants(updated);
    setShowAddForm(false);
  };


  const deleteUser = (id) => {
    if (!window.confirm('Видалити учасника? Це також вплине на аналітику.')) return;
    const updated = participants.filter(p => p.id !== id);
    localStorage.setItem('fin_users_local', JSON.stringify(updated));
    setParticipants(updated);
  };


  const handleEdit  = (u) => { setIsEditing(u.id); setEditData({ name: u.name, role: u.role }); };
  const saveEdit    = (id) => {
    const updated = participants.map(p =>
      p.id === id ? { ...p, name: editData.name, role: editData.role } : p
    );
    localStorage.setItem('fin_users_local', JSON.stringify(updated));
    setParticipants(updated);
    setIsEditing(null);
  };


  const togglePath = (memberId, path) => {
    const updated = participants.map(p => {
      if (p.id !== memberId) return p;
      const current  = p.grantedPaths || [];
      const newPaths = current.includes(path)
        ? current.filter(x => x !== path)
        : [...current, path];
      return { ...p, grantedPaths: newPaths };
    });
    localStorage.setItem('fin_users_local', JSON.stringify(updated));
    setParticipants(updated);
  };

  if (loading) return (
    <div className="ml-64 p-10 font-black flex flex-col items-center justify-center h-screen bg-[#f8f9fc] text-orange-500">
      <Loader className="animate-spin mb-4" size={48} />
      <p className="uppercase tracking-[0.3em] text-[10px]">Синхронізація учасників...</p>
    </div>
  );

  return (
    <div className="ml-64 p-10 bg-[#f8f9fc] min-h-screen font-sans antialiased text-slate-900 fi-page">
      <div className="max-w-4xl mx-auto">

        {}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4 italic">
              <ShieldCheck className="text-orange-500" size={38} /> Учасники
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 ml-1">
              Керування доступом до сімейного бюджету
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-black text-white px-8 py-4 rounded-[25px] font-black flex items-center gap-3 hover:bg-orange-600 transition-all shadow-xl active:scale-95 uppercase text-[10px] tracking-widest"
            >
              <UserPlus size={20} /> {showAddForm ? 'Скасувати' : 'Додати учасника'}
            </button>
          )}
        </div>

        {}
        {isAdmin && showAddForm && (
          <form onSubmit={addUser} className="bg-white p-10 rounded-[45px] shadow-sm border border-orange-100 mb-12 flex gap-5">
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-4 mb-2 block tracking-widest">Повне ім'я</label>
              <input name="uname" placeholder="***" required
                className="w-full p-5 bg-gray-50 rounded-[20px] outline-none focus:ring-2 ring-orange-500 font-bold" />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-4 mb-2 block tracking-widest">Роль</label>
              <input name="role" placeholder="Учасник"
                className="w-full p-5 bg-gray-50 rounded-[20px] outline-none focus:ring-2 ring-orange-500 font-bold" />
            </div>
            <button type="submit"
              className="px-10 mt-6 h-[60px] bg-black text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all">
              Створити
            </button>
          </form>
        )}


        <div className="grid grid-cols-1 gap-6">
          {participants.map(member => (
            <div key={member.id} className="bg-white rounded-[40px] shadow-sm border border-transparent hover:shadow-md transition-all overflow-hidden">


              <div className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="bg-orange-500 w-16 h-16 rounded-[22px] text-white shadow-lg flex items-center justify-center">
                    <User size={32} />
                  </div>
                  {isEditing === member.id ? (
                    <div className="flex gap-4">
                      <input value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        className="p-2 border-b-4 border-orange-500 bg-orange-50/50 outline-none font-black text-2xl tracking-tight" />
                      <input value={editData.role}
                        onChange={e => setEditData({ ...editData, role: e.target.value })}
                        className="p-2 border-b-4 border-orange-500 bg-orange-50/50 outline-none font-black text-gray-400 uppercase text-[10px] tracking-widest" />
                    </div>
                  ) : (
                    <div>
                      <p className="font-black text-3xl text-gray-900 tracking-tighter">{member.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-orange-50 text-orange-500 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest">
                          {member.role || 'Учасник'}
                        </span>
                        <span className="text-gray-300 font-bold text-[9px] uppercase tracking-tighter">Активний учасник</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">

                  {isAdmin && isEditing !== member.id && (
                    <button
                      onClick={() => setOpenPermsId(openPermsId === member.id ? null : member.id)}
                      title="Керувати доступом"
                      className={`p-4 rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 ${
                        openPermsId === member.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      <Lock size={18} />
                    </button>
                  )}

                  {isEditing === member.id ? (
                    <>
                      <button onClick={() => saveEdit(member.id)}
                        className="p-5 bg-green-500 text-white rounded-2xl hover:bg-green-600 shadow-lg transition-all">
                        <Check size={24} />
                      </button>
                      <button onClick={() => setIsEditing(null)}
                        className="p-5 bg-gray-100 text-gray-400 rounded-2xl hover:bg-gray-200 transition-all">
                        <X size={24} />
                      </button>
                    </>
                  ) : isAdmin ? (
                    <>
                      <button onClick={() => handleEdit(member)}
                        className="p-5 text-gray-200 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all">
                        <Edit2 size={24} />
                      </button>
                      <button onClick={() => deleteUser(member.id)}
                        className="p-5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                        <Trash2 size={24} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>


              {isAdmin && openPermsId === member.id && (
                <div className="border-t border-gray-100 px-8 py-6 bg-gray-50/60">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <Lock size={11} /> Доступ до розділів
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {RESTRICTED_PATHS.map(({ path, label }) => {
                      const granted = (member.grantedPaths || []).includes(path);
                      return (
                        <button
                          key={path}
                          onClick={() => togglePath(member.id, path)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            granted
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white text-gray-400 border border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                          }`}
                        >
                          {granted ? <Unlock size={12} /> : <Lock size={12} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-4">
                    Активні права зберігаються і одразу набувають чинності.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {participants.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[60px] border-4 border-dashed border-gray-100 text-gray-300 font-black uppercase italic tracking-widest mt-10">
            Учасників не знайдено
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;