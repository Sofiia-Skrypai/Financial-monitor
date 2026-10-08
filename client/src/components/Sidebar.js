import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Scale, TrendingUp, History,
  Wallet, Users, LogOut, ChevronDown, Check, Lock, KeyRound, X, Tag,
} from 'lucide-react';

const SecretCodeModal = ({ adminName, onConfirm, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');

    const account = accounts.find(a => a.name === adminName);
    if (!account) { setError('Обліковий запис не знайдено.'); return; }
    if (account.secretCode !== code.trim().toUpperCase()) {
      setError('Невірний код. Спробуйте ще раз.');
      return;
    }
    onConfirm();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Figtree','Nunito',system-ui,sans-serif" }}>
      <div style={{ background:'white', borderRadius:28, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', position:'relative' }}>
        <button onClick={onCancel} style={{ position:'absolute', top:18, right:18, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={20}/></button>

        <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#4338ca,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <KeyRound size={24} color="white"/>
        </div>
        <h3 style={{ fontSize:20, fontWeight:900, color:'#0f172a', margin:'0 0 8px', letterSpacing:'-0.03em' }}>Підтвердження адміністратора</h3>
        <p style={{ fontSize:13, color:'#64748b', marginBottom:24, fontWeight:500, lineHeight:1.6 }}>
          Щоб переключитися на обліковий запис <strong>{adminName}</strong>, введіть секретний код, який було показано під час реєстрації.
        </p>

        <input
          type="text"
          placeholder="XXXXXXXX"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          maxLength={8}
          style={{ width:'100%', boxSizing:'border-box', padding:'14px 18px', background:'#f8fafc', border:`1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`, borderRadius:14, fontSize:18, fontWeight:900, color:'#0f172a', outline:'none', textAlign:'center', letterSpacing:'0.25em', fontFamily:'inherit', marginBottom:error ? 8 : 20 }}
        />
        {error && <p style={{ fontSize:12, color:'#ef4444', fontWeight:700, marginBottom:16 }}>{error}</p>}

        <button onClick={verify} style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#4338ca,#f97316)', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit' }}>
          Підтвердити
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ onLogout, user, onSwitchUser }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const dropRef   = useRef(null);

  const [members, setMembers]               = useState([]);
  const [switcherOpen, setSwitcherOpen]     = useState(false);
  const [secretGate, setSecretGate]         = useState(false);
  const [pendingSwitch, setPendingSwitch]   = useState(null);

  const isAdmin = user?.role === 'Адмін' && !user?.activeMemberId;


  const loadMembers = () => {
    const raw = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
    setMembers(raw);
  };

  useEffect(() => {
    loadMembers();

    const interval = setInterval(loadMembers, 2000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const handle = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setSwitcherOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);


  const allItems = [
    { path: '/',         name: 'Дашборд',   icon: LayoutDashboard, restricted: false },
    { path: '/accounts', name: 'Рахунки',   icon: Wallet,          restricted: false },
    { path: '/import',   name: 'Імпорт',    icon: Upload,          restricted: false },
    { path: '/history',  name: 'Історія',   icon: History,         restricted: false },
    { path: '/categories', name: 'Категорії', icon: Tag,            restricted: false },
    { path: '/users',    name: 'Учасники',  icon: Users,           restricted: true  },
    { path: '/compare',  name: 'Порівняти', icon: Scale,           restricted: true  },
    { path: '/pension',  name: 'Пенсія',    icon: TrendingUp,      restricted: true  },
  ];

  const activeMember  = members.find(m => m.id === user?.activeMemberId);
  const grantedPaths  = activeMember?.grantedPaths || [];

  const canAccess = (item) => {
    if (!item.restricted) return true;
    if (!user?.activeMemberId) return isAdmin;
    return grantedPaths.includes(item.path);
  };


  const requestSwitch = (target) => {


    setSwitcherOpen(false);

    if (target === 'self') {

      if (user?.activeMemberId) {
        setPendingSwitch('self');
        setSecretGate(true);
      } else {

      }
    } else {

      doSwitch(target);
    }
  };

  const doSwitch = (target) => {
    let updated;
    if (target === 'self') {
      updated = { ...user, activeMemberId: null, activeMemberName: null };
    } else {
      updated = { ...user, activeMemberId: target.id, activeMemberName: target.name };
    }
    localStorage.setItem('user_session', JSON.stringify(updated));
    onSwitchUser(updated);
    navigate('/');
  };

  const handleSecretConfirmed = () => {
    setSecretGate(false);
    doSwitch(pendingSwitch);
    setPendingSwitch(null);
  };

  const handleSecretCancelled = () => {
    setSecretGate(false);
    setPendingSwitch(null);
  };

  const displayName    = user?.activeMemberName || user?.name || 'Користувач';
  const displayInitial = displayName[0]?.toUpperCase() || 'U';
  const displayRole    = user?.activeMemberId
    ? (activeMember?.role || 'Учасник')
    : (isAdmin ? 'Адмін' : 'Учасник');


  const otherMembers = members.filter(m => m.id !== user?.id);

  return (
    <>
      {secretGate && (
        <SecretCodeModal
          adminName={user?.name}
          onConfirm={handleSecretConfirmed}
          onCancel={handleSecretCancelled}
        />
      )}

      <div className="w-64 bg-white border-r border-gray-100 fixed h-full p-6 flex flex-col z-30">

        {}
        <div className="flex items-center gap-3 mb-8 px-2">
          <svg width="32" height="32" viewBox="0 0 52 52" fill="none">
            <rect width="52" height="52" rx="13" fill="url(#sGrad)"/>
            <path d="M12 36 L12 22 L20 16 L28 20 L36 12 L40 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="40" cy="16" r="3.5" fill="#fb923c"/>
            <rect x="14" y="30" width="5" height="10" rx="2" fill="white" fillOpacity="0.5"/>
            <rect x="23" y="25" width="5" height="15" rx="2" fill="white" fillOpacity="0.7"/>
            <rect x="32" y="20" width="5" height="20" rx="2" fill="white"/>
            <defs>
              <linearGradient id="sGrad" x1="0" y1="0" x2="52" y2="52">
                <stop offset="0%" stopColor="#4338ca"/><stop offset="100%" stopColor="#f97316"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">FinMonitor</h1>
        </div>

        {}
        <div className="mb-6 relative" ref={dropRef}>
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-orange-50 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-orange-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {displayInitial}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-black text-gray-800 truncate leading-tight">{displayName}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{displayRole}</p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${switcherOpen ? 'rotate-180' : ''}`}/>
          </button>

          {switcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-5 pb-2 pt-1">Переключити на</p>

              {}
              <button
                onClick={() => requestSwitch('self')}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-orange-400 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-gray-800">{user?.name}</p>
                  <p className="text-[9px] font-bold uppercase text-orange-500 tracking-wider flex items-center gap-1">
                    Адмін {user?.activeMemberId && <KeyRound size={9}/>}
                  </p>
                </div>
                {!user?.activeMemberId && <Check size={14} className="text-orange-500 flex-shrink-0"/>}
              </button>

              {}
              {otherMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => requestSwitch(member)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-black text-xs flex-shrink-0">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-gray-800">{member.name}</p>
                    <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">{member.role || 'Учасник'}</p>
                  </div>
                  {user?.activeMemberId === member.id && <Check size={14} className="text-orange-500 flex-shrink-0"/>}
                </button>
              ))}

              {otherMembers.length === 0 && (
                <p className="text-[10px] text-gray-300 font-bold px-5 py-2 italic">Немає інших учасників</p>
              )}
            </div>
          )}
        </div>

        {}
        <nav className="space-y-1 flex-1">
          {allItems.map((item) => {
            const Icon    = item.icon;
            const active  = location.pathname === item.path;
            const allowed = canAccess(item);

            if (!allowed) return (
              <div key={item.path} title="Доступ обмежений адміністратором"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 cursor-not-allowed select-none">
                <Icon size={20}/>
                <span className="font-bold text-sm flex-1">{item.name}</span>
                <Lock size={11}/>
              </div>
            );

            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all fi-sidebar-item ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 fi-nav-active' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                <Icon size={20}/>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {}
        <div className="mt-auto pt-6 border-t border-gray-50">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm">
            <LogOut size={20}/>
            Вийти з системи
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;