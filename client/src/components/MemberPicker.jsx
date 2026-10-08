import React, { useState } from 'react';
import { User, KeyRound, X, Check, ArrowLeft } from 'lucide-react';

const SecretGate = ({ adminName, onConfirm, onBack }) => {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
    const account  = accounts.find(a => a.name === adminName);
    if (!account) { setError('Обліковий запис не знайдено.'); return; }
    if (account.secretCode !== code.trim().toUpperCase()) {
      setError('Невірний код. Спробуйте ще раз.');
      return;
    }
    onConfirm();
  };

  return (
    <div style={{ textAlign: 'left' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: 'inherit' }}>
        <ArrowLeft size={14} /> Назад
      </button>

      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4338ca,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <KeyRound size={22} color="white" />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
        Підтвердження адміністратора
      </h3>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22, fontWeight: 500, lineHeight: 1.6 }}>
        Введіть секретний код, щоб увійти як <strong>{adminName}</strong>.
      </p>

      <input
        type="text"
        placeholder="XXXXXXXX"
        value={code}
        onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
        maxLength={8}
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '14px 18px',
          background: '#f8fafc',
          border: `1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: 14, fontSize: 20, fontWeight: 900, color: '#0f172a',
          outline: 'none', textAlign: 'center', letterSpacing: '0.25em',
          fontFamily: 'inherit', marginBottom: error ? 8 : 18,
          transition: 'border 0.2s',
        }}
        onFocus={e => !error && (e.target.style.borderColor = '#f97316')}
        onBlur={e  => !error && (e.target.style.borderColor = '#e2e8f0')}
        onKeyDown={e => e.key === 'Enter' && verify()}
      />
      {error && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 14 }}>{error}</p>}

      <button
        onClick={verify}
        style={{
          width: '100%', padding: 13,
          background: 'linear-gradient(135deg,#4338ca,#f97316)',
          border: 'none', borderRadius: 12, color: 'white',
          fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Підтвердити
      </button>
    </div>
  );
};

const MemberPicker = ({ accountUser, onPick }) => {
  const [showGate, setShowGate] = useState(false);
  const members = JSON.parse(localStorage.getItem('fin_users_local') || '[]');
  const others  = members.filter(m => m.id !== accountUser.id);

  const pickAdmin = () => setShowGate(true);

  const confirmAdmin = () => {
    const session = { ...accountUser, activeMemberId: null, activeMemberName: null };
    localStorage.setItem('user_session', JSON.stringify(session));
    onPick(session);
  };

  const pickMember = (member) => {
    const session = { ...accountUser, activeMemberId: member.id, activeMemberName: member.name };
    localStorage.setItem('user_session', JSON.stringify(session));
    onPick(session);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: "'Figtree','Nunito',system-ui,sans-serif",
    }}>
      <div style={{
        background: 'white', borderRadius: 32,
        padding: '44px 40px', width: '100%', maxWidth: 460,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        minHeight: 320,
      }}>

        {showGate ? (
          <SecretGate
            adminName={accountUser.name}
            onConfirm={confirmAdmin}
            onBack={() => setShowGate(false)}
          />
        ) : (
          <>
            {}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#4338ca,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <User size={26} color="white" />
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
                Хто зараз користується?
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, margin: 0 }}>
                Оберіть свій профіль для цього сеансу
              </p>
            </div>

            {}
            <button
              onClick={pickAdmin}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px',
                background: 'linear-gradient(135deg,rgba(67,56,202,0.07),rgba(249,115,22,0.07))',
                border: '1.5px solid #e0e7ff',
                borderRadius: 16, cursor: 'pointer', marginBottom: 10,
                textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#a5b4fc'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e7ff'}
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#4338ca,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 17, flexShrink: 0 }}>
                {accountUser.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>{accountUser.name}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Адмін <KeyRound size={9} />
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                Потрібен код
              </span>
            </button>

            {}
            {others.map(member => (
              <button
                key={member.id}
                onClick={() => pickMember(member)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 16, cursor: 'pointer', marginBottom: 10,
                  textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 900, fontSize: 17, flexShrink: 0 }}>
                  {member.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>{member.name}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {member.role || 'Учасник'}
                  </p>
                </div>
              </button>
            ))}

            {others.length === 0 && (
              <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 13, fontWeight: 600, padding: '8px 0' }}>
                Інших учасників ще немає
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MemberPicker;
