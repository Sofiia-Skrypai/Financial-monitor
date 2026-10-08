import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, TrendingUp, BarChart2, Wallet, Copy, Check, Brain, ScanLine } from 'lucide-react';
import MemberPicker from './MemberPicker';

const getPasswordStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  if (pwd.length >= 12)          score++;
  if (score <= 1) return { label: 'Дуже слабкий', color: '#ef4444', width: '20%' };
  if (score === 2) return { label: 'Слабкий',      color: '#f97316', width: '40%' };
  if (score === 3) return { label: 'Середній',     color: '#eab308', width: '60%' };
  if (score === 4) return { label: 'Надійний',     color: '#22c55e', width: '80%' };
  return                         { label: 'Відмінний',  color: '#10b981', width: '100%' };
};

const generateSecretCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const ORBS = [
  { size: 340, x0: 15,  y0: 10,  dx: 18, dy: 14, dur: 18, delay: 0,    opacity: 0.18, blur: 0,  color: 'rgba(99,102,241,0.55)'  },
  { size: 220, x0: 65,  y0: 60,  dx: 20, dy: 18, dur: 22, delay: -5,   opacity: 0.22, blur: 0,  color: 'rgba(249,115,22,0.60)'  },
  { size: 160, x0: 10,  y0: 70,  dx: 14, dy: 22, dur: 15, delay: -9,   opacity: 0.16, blur: 0,  color: 'rgba(139,92,246,0.50)'  },
  { size: 110, x0: 80,  y0: 15,  dx: 10, dy: 12, dur: 12, delay: -3,   opacity: 0.28, blur: 0,  color: 'rgba(251,146,60,0.55)'  },
  { size: 260, x0: 50,  y0: 80,  dx: 16, dy: 10, dur: 25, delay: -12,  opacity: 0.12, blur: 0,  color: 'rgba(67,56,202,0.45)'   },
  { size: 80,  x0: 88,  y0: 50,  dx: 8,  dy: 16, dur: 10, delay: -6,   opacity: 0.35, blur: 0,  color: 'rgba(249,115,22,0.70)'  },
];

const AnimatedOrbs = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <style>{`
      @keyframes orb0 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(${ORBS[0].dx}%,${ORBS[0].dy}%) scale(1.08)} 66%{transform:translate(-${ORBS[0].dx/2}%,${ORBS[0].dy/2}%) scale(0.95)} }
      @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-${ORBS[1].dx}%,${ORBS[1].dy}%) scale(1.12)} 70%{transform:translate(${ORBS[1].dx/2}%,-${ORBS[1].dy/2}%) scale(0.92)} }
      @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(${ORBS[2].dx}%,-${ORBS[2].dy}%) scale(1.1)} }
      @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-${ORBS[3].dx}%,${ORBS[3].dy}%) scale(1.15)} 75%{transform:translate(${ORBS[3].dx}%,-${ORBS[3].dy}%) scale(0.88)} }
      @keyframes orb4 { 0%,100%{transform:translate(0,0) scale(1)} 45%{transform:translate(${ORBS[4].dx}%,${ORBS[4].dy}%) scale(1.06)} 80%{transform:translate(-${ORBS[4].dx/2}%,-${ORBS[4].dy}%) scale(1.02)} }
      @keyframes orb5 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-${ORBS[5].dx}%,-${ORBS[5].dy}%) scale(1.2)} 65%{transform:translate(${ORBS[5].dx}%,${ORBS[5].dy/2}%) scale(0.85)} }
      @keyframes gradShift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .auth-gradient-bg {
        background: linear-gradient(-45deg, #1e1b4b, #3730a3, #1e3a8a, #7c3aed, #c2410c, #ea580c);
        background-size: 400% 400%;
        animation: gradShift 12s ease infinite;
      }
      @keyframes fadeSlideUp {
        from { opacity:0; transform:translateY(24px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .auth-fade-up { animation: fadeSlideUp 0.55s cubic-bezier(.22,.68,0,1.2) both; }
      .auth-fade-up-1 { animation: fadeSlideUp 0.55s 0.08s cubic-bezier(.22,.68,0,1.2) both; }
      .auth-fade-up-2 { animation: fadeSlideUp 0.55s 0.16s cubic-bezier(.22,.68,0,1.2) both; }
      .auth-fade-up-3 { animation: fadeSlideUp 0.55s 0.24s cubic-bezier(.22,.68,0,1.2) both; }
      .auth-fade-up-4 { animation: fadeSlideUp 0.55s 0.32s cubic-bezier(.22,.68,0,1.2) both; }

      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      .auth-btn:hover::after {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
        background-size: 200% 100%;
        animation: shimmer 0.7s ease;
        border-radius: inherit;
        pointer-events: none;
      }
      .auth-btn { position: relative; overflow: hidden; }
    `}</style>

    {ORBS.map((o, i) => (
      <div key={i} style={{
        position:     'absolute',
        width:        o.size,
        height:       o.size,
        left:         `${o.x0}%`,
        top:          `${o.y0}%`,
        transform:    'translate(-50%,-50%)',
        borderRadius: '50%',
        background:   o.color,
        opacity:      o.opacity,
        filter:       `blur(${40 + i * 8}px)`,
        animation:    `orb${i} ${o.dur}s ${o.delay}s ease-in-out infinite`,
        mixBlendMode: 'screen',
      }}/>
    ))}

    {}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}/>
  </div>
);

const Logo = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <rect width="52" height="52" rx="14" fill="white" fillOpacity="0.15"/>
    <path d="M12 36 L12 22 L20 16 L28 20 L36 12 L40 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="40" cy="16" r="3.5" fill="#f97316"/>
    <path d="M12 40 L40 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    <rect x="14" y="30" width="5" height="10" rx="2" fill="white" fillOpacity="0.5"/>
    <rect x="23" y="25" width="5" height="15" rx="2" fill="white" fillOpacity="0.7"/>
    <rect x="32" y="20" width="5" height="20" rx="2" fill="white"/>
  </svg>
);

const Feature = ({ icon: Icon, text, delay = 0 }) => (
  <div className={`auth-fade-up-${delay}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'rgba(255,255,255,0.08)', borderRadius:14, border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', transition:'background 0.2s' }}>
    <div style={{ width:32, height:32, background:'rgba(255,255,255,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon size={16} color="white"/>
    </div>
    <span style={{ color:'rgba(255,255,255,0.88)', fontSize:13, fontWeight:600 }}>{text}</span>
  </div>
);

const EyeBtn = ({ show, toggle }) => (
  <button type="button" onClick={toggle} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:2 }}>
    {show ? <EyeOff size={17}/> : <Eye size={17}/>}
  </button>
);

const inputBase = (borderColor = '#e2e8f0') => ({
  width:'100%', boxSizing:'border-box', padding:'14px 46px',
  background:'#f8fafc', border:`1.5px solid ${borderColor}`,
  borderRadius:14, fontSize:14, fontWeight:600, color:'#1e293b',
  outline:'none', transition:'border 0.2s, box-shadow 0.2s', fontFamily:'inherit',
});

const SecretCodeScreen = ({ code, name, onContinue }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.7)', backdropFilter:'blur(10px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'white', borderRadius:32, padding:'44px 40px', width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', fontFamily:"'Figtree','Nunito',system-ui,sans-serif", textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#4338ca,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Lock size={30} color="white"/>
        </div>
        <h2 style={{ fontSize:22, fontWeight:900, color:'#0f172a', margin:'0 0 8px', letterSpacing:'-0.03em' }}>Ваш секретний код</h2>
        <p style={{ fontSize:13, color:'#64748b', marginBottom:28, fontWeight:500, lineHeight:1.6 }}>
          Збережіть цей код — він знадобиться щоразу для підтвердження доступу адміністратора <strong>{name}</strong>.
        </p>
        <div style={{ background:'linear-gradient(135deg,rgba(67,56,202,0.06),rgba(249,115,22,0.06))', border:'2px dashed #c7d2fe', borderRadius:18, padding:'20px 24px', marginBottom:20 }}>
          <p style={{ fontSize:30, fontWeight:900, letterSpacing:'0.25em', color:'#4338ca', margin:0 }}>{code}</p>
        </div>
        <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:8, margin:'0 auto 24px', padding:'10px 20px', background: copied ? '#f0fdf4' : '#f8fafc', border:`1.5px solid ${copied ? '#86efac' : '#e2e8f0'}`, borderRadius:12, cursor:'pointer', fontSize:12, fontWeight:700, color: copied ? '#16a34a' : '#64748b', fontFamily:'inherit', transition:'all 0.2s' }}>
          {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Скопійовано!' : 'Скопіювати код'}
        </button>
        <p style={{ fontSize:11, color:'#f97316', fontWeight:700, background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'10px 14px', marginBottom:24 }}>
          ⚠ Цей код більше не буде показано. Зберігайте його в надійному місці.
        </p>
        <button onClick={onContinue} style={{ width:'100%', padding:15, background:'linear-gradient(135deg,#4338ca,#f97316)', border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit' }}>
          Зрозуміло, продовжити
        </button>
      </div>
    </div>
  );
};

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin]   = useState(true);
  const [formData, setFormData] = useState({ name:'', email:'', password:'', confirm:'' });
  const [showPwd, setShowPwd]   = useState(false);
  const [showCfm, setShowCfm]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [pendingUser, setPendingUser]     = useState(null);
  const [secretCode, setSecretCode]       = useState(null);
  const [secretForUser, setSecretForUser] = useState(null);
  const [formKey, setFormKey]   = useState(0);

  const strength = getPasswordStrength(formData.password);

  const validate = () => {
    if (isLogin) {
      if (!formData.email || !formData.password) return 'Заповніть усі поля.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Введіть коректну email-адресу.';
      if (formData.password.length < 6) return 'Пароль повинен містити щонайменше 6 символів.';
      return null;
    }
    if (!formData.name.trim() || formData.name.trim().length < 2) return "Ім'я повинно містити щонайменше 2 символи.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Введіть коректну email-адресу.';
    if (formData.password.length < 8) return 'Пароль повинен містити щонайменше 8 символів.';
    if (!/[A-Z]/.test(formData.password)) return 'Пароль повинен містити хоча б одну велику літеру.';
    if (!/[0-9]/.test(formData.password)) return 'Пароль повинен містити хоча б одну цифру.';
    if (formData.password !== formData.confirm) return 'Паролі не збігаються.';
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    const err = validate();
    if (err) { setError(err); return; }

    if (isLogin) {
      const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
      const match = accounts.find(a => a.email === formData.email && a.password === formData.password);
      if (!match) { setError('Невірна email-адреса або пароль.'); return; }
      setPendingUser({ id: match.id, name: match.name, email: match.email, role: match.role });
    } else {
      const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
      if (accounts.some(a => a.email.toLowerCase() === formData.email.toLowerCase())) {
        setError('Користувач з такою email-адресою вже зареєстрований.'); return;
      }
      const code = generateSecretCode();
      const newUser = { id: Date.now().toString(), name: formData.name.trim(), email: formData.email.toLowerCase(), password: formData.password, role: 'Адмін', secretCode: code, createdAt: new Date().toISOString() };
      const usersLocal = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
      localStorage.setItem('fin_users_local', JSON.stringify([...usersLocal.filter(u => !(u.name === 'Катерина' && u.id === '1')), { id: newUser.id, name: newUser.name, role: newUser.role }]));
      localStorage.setItem('fin_accounts_auth', JSON.stringify([...accounts, newUser]));
      const userData = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
      localStorage.setItem('user_session', JSON.stringify(userData));
      setSecretCode(code); setSecretForUser(userData);
    }
  };

  const handleCodeContinue = () => { setSecretCode(null); setPendingUser(secretForUser); setSecretForUser(null); };

  const toggleMode = () => {
    setIsLogin(!isLogin); setError(''); setSuccess('');
    setFormData({ name:'', email:'', password:'', confirm:'' });
    setFormKey(k => k + 1);
  };

  if (secretCode && secretForUser) return <SecretCodeScreen code={secretCode} name={secretForUser.name} onContinue={handleCodeContinue}/>;
  if (pendingUser) return <MemberPicker accountUser={pendingUser} onPick={onLogin}/>;

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Figtree','Nunito',system-ui,sans-serif" }}>

      {}
      <div className="auth-gradient-bg" style={{ flex:'0 0 45%', minHeight:'100vh', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'60px 48px' }}>
        <AnimatedOrbs/>

        {}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:380, width:'100%' }}>

          {}
          <div className="auth-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:44 }}>
            <Logo/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:28, fontWeight:900, color:'white', letterSpacing:'-0.03em', lineHeight:1 }}>FinMonitor</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginTop:3 }}>Smart Finance</div>
            </div>
          </div>

          <h1 className="auth-fade-up-1" style={{ fontSize:34, fontWeight:900, color:'white', lineHeight:1.18, marginBottom:14, letterSpacing:'-0.03em' }}>
            Контролюйте свої<br/><span style={{ color:'#fb923c' }}>домашні фінанси</span>
          </h1>
          <p className="auth-fade-up-2" style={{ fontSize:14, color:'rgba(255,255,255,0.62)', lineHeight:1.75, marginBottom:44 }}>
            Відстежуйте витрати, плануйте сімейний бюджет та будуйте фінансову стабільність для всієї родини.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Feature icon={BarChart2}  text="Аналітика витрат у реальному часі"   delay={2}/>
            <Feature icon={TrendingUp} text="Планування пенсійних накопичень"      delay={3}/>
            <Feature icon={Brain}      text="ML-рекомендації для бюджету"          delay={4}/>
            <Feature icon={ScanLine}   text="Швидке сканування чеків"              delay={4}/>
            <Feature icon={Wallet}     text="Сімейний бюджет та спільні рахунки"   delay={4}/>
          </div>
        </div>
      </div>

      {}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:'48px 32px', position:'relative', overflow:'hidden' }}>

        {}
              <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }} key={formKey}>
          <div style={{ background:'white', borderRadius:28, boxShadow:'0 8px 48px rgba(67,56,202,0.10), 0 2px 8px rgba(0,0,0,0.04)', padding:'44px 40px', border:'1px solid rgba(99,102,241,0.08)' }}>

            <div className="auth-fade-up" style={{ marginBottom:32 }}>
              <h2 style={{ fontSize:26, fontWeight:900, color:'#0f172a', margin:0, letterSpacing:'-0.03em' }}>
                {isLogin ? 'З поверненням!' : 'Створити акаунт'}
              </h2>
              <p style={{ fontSize:13, color:'#94a3b8', marginTop:6, fontWeight:500 }}>
                {isLogin ? 'Введіть свої дані для входу в систему' : 'Заповніть форму для реєстрації'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {!isLogin && (
                <div className="auth-fade-up-1" style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none' }}><User size={17}/></div>
                  <input type="text" placeholder="Ваше ім'я" value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} required style={{ ...inputBase(), paddingLeft:46, paddingRight:16 }} onFocus={e => { e.target.style.borderColor='#f97316'; e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,0.12)'; }} onBlur={e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; }}/>
                </div>
              )}

              <div className={isLogin ? 'auth-fade-up-1' : 'auth-fade-up-2'} style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none' }}><Mail size={17}/></div>
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} required style={{ ...inputBase(), paddingLeft:46, paddingRight:16 }} onFocus={e => { e.target.style.borderColor='#f97316'; e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,0.12)'; }} onBlur={e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; }}/>
              </div>

              <div className={isLogin ? 'auth-fade-up-2' : 'auth-fade-up-3'} style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none', zIndex:1 }}><Lock size={17}/></div>
                <input type={showPwd ? 'text' : 'password'} placeholder="Пароль" value={formData.password} onChange={e => setFormData({...formData, password:e.target.value})} required style={inputBase()} onFocus={e => { e.target.style.borderColor='#f97316'; e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,0.12)'; }} onBlur={e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; }}/>
                <EyeBtn show={showPwd} toggle={() => setShowPwd(!showPwd)}/>
              </div>

              {!isLogin && formData.password && (
                <div style={{ marginTop:-6 }}>
                  <div style={{ height:4, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:strength.width, background:strength.color, borderRadius:99, transition:'width 0.4s cubic-bezier(.4,0,.2,1), background 0.3s' }}/>
                  </div>
                  <p style={{ fontSize:11, fontWeight:700, color:strength.color, marginTop:4 }}>{strength.label}</p>
                </div>
              )}

              {!isLogin && (
                <div className="auth-fade-up-4" style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none', zIndex:1 }}><Lock size={17}/></div>
                  <input type={showCfm ? 'text' : 'password'} placeholder="Підтвердіть пароль" value={formData.confirm} onChange={e => setFormData({...formData, confirm:e.target.value})} required style={inputBase(formData.confirm && formData.confirm !== formData.password ? '#ef4444' : '#e2e8f0')} onFocus={e => { e.target.style.borderColor='#f97316'; e.target.style.boxShadow='0 0 0 3px rgba(249,115,22,0.12)'; }} onBlur={e => { e.target.style.borderColor=(formData.confirm && formData.confirm !== formData.password) ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow='none'; }}/>
                  <EyeBtn show={showCfm} toggle={() => setShowCfm(!showCfm)}/>
                </div>
              )}

              {error   && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠ {error}</div>}
              {success && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#16a34a', fontWeight:600 }}>✓ {success}</div>}

              <button type="submit" className="auth-btn" style={{ width:'100%', padding:15, background:'linear-gradient(135deg,#4338ca 0%,#7c3aed 50%,#f97316 100%)', backgroundSize:'200% 100%', border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:900, cursor:'pointer', letterSpacing:'0.02em', marginTop:4, fontFamily:'inherit', transition:'transform 0.15s, box-shadow 0.15s', boxShadow:'0 4px 20px rgba(99,102,241,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(99,102,241,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.35)'; }}>
                {isLogin ? 'Увійти' : 'Зареєструватися'}
              </button>
            </form>

            <div style={{ textAlign:'center', marginTop:24 }}>
              <button onClick={toggleMode} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#6366f1', fontWeight:700, fontFamily:'inherit', transition:'color 0.2s' }}
                onMouseEnter={e => e.target.style.color='#f97316'}
                onMouseLeave={e => e.target.style.color='#6366f1'}>
                {isLogin ? 'Ще немає акаунта? Зареєструватися' : 'Вже маєте акаунт? Увійти'}
              </button>
            </div>
          </div>

          <p style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#cbd5e1', fontWeight:600, letterSpacing:'0.04em' }}>
            FinMonitor © {new Date().getFullYear()} — Сімейні фінанси під контролем
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;