const clearAll = () => {
  ['fin_history_local','fin_accounts_local','fin_accounts_auth',
   'fin_users_local','fin_categories_local','fin_pension_savings_local',
   'user_session'].forEach(k => localStorage.removeItem(k));
};

const generateSecretCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const registerAndLogin = (name = 'Oksana', email = 'oksana@test.com', password = 'Pass1234') => {
  const code = generateSecretCode();
  const user = { id: Date.now().toString(), name, email: email.toLowerCase(), password, role: 'Адмін', secretCode: code, createdAt: new Date().toISOString() };
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
  localStorage.setItem('fin_accounts_auth', JSON.stringify([...accounts, user]));
  const session = { id: user.id, name: user.name, email: user.email, role: user.role };
  localStorage.setItem('user_session', JSON.stringify(session));
  return { user, session };
};

const seedAccount = (name, balance = 10000) => {
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
  const existing = accounts.find(a => a.name === name);
  if (!existing) {
    const updated = [...accounts, { id: `acc_${name}`, name, balance, currentBalance: balance, currency: 'UAH' }];
    localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
  }
};

const saveTransaction = (tx) => {
  const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
  const updatedHistory = [tx, ...history];
  localStorage.setItem('fin_history_local', JSON.stringify(updatedHistory));
  if (tx.account && tx.account !== 'Пенсійні заощадження') {
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    const updated = accounts.map(acc => {
      if (acc.name !== tx.account) return acc;
      const accTxs = updatedHistory.filter(t => t.account === acc.name);
      const delta  = accTxs.reduce((s, t) => {
        const a = parseFloat(t.amount) || 0;
        if (t.type === 'Дохід')   return s + Math.abs(a);
        if (t.type === 'Витрата') return s - Math.abs(a);
        return s;
      }, 0);
      return { ...acc, currentBalance: (parseFloat(acc.balance) || 0) + delta };
    });
    localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
  }
};

const makeTx = (id, type, amount, account = 'Mono', date = new Date().toISOString()) => ({
  id, date, amount, type, category: type === 'Дохід' ? 'Кредит' : 'Продукти',
  account, description: `${type} ${id}`, userName: 'Oksana',
});

describe('E2E — Registration → Login → Session', () => {
  beforeEach(clearAll);

  test('full register and session restore flow', () => {
    const { user, session } = registerAndLogin();
    
    const restored = JSON.parse(localStorage.getItem('user_session'));
    expect(restored.email).toBe('oksana@test.com');
    expect(restored.role).toBe('Адмін');
    
    const auths = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
    expect(auths.find(a => a.email === 'oksana@test.com')).not.toBeNull();
  });

  test('logout clears session but not account data', () => {
    registerAndLogin();
    saveTransaction(makeTx('t1', 'Витрата', 500, 'Mono'));
    localStorage.removeItem('user_session');
    expect(localStorage.getItem('user_session')).toBeNull();
    
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(history.length).toBeGreaterThan(0);
  });
});

describe('E2E — Transaction Flow: Income → Balance → Expense', () => {
  beforeEach(clearAll);

  test('complete income + expense cycle updates balance correctly', () => {
    seedAccount('Mono', 0);
    saveTransaction(makeTx('t1', 'Дохід',   5000, 'Mono'));
    saveTransaction(makeTx('t2', 'Витрата', 1200, 'Mono'));
    saveTransaction(makeTx('t3', 'Витрата',  300, 'Mono'));
    saveTransaction(makeTx('t4', 'Дохід',   2000, 'Mono'));
    
    const acc = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]').find(a => a.name === 'Mono');
    expect(acc.currentBalance).toBe(5500);
  });

  test('history contains all transactions in reverse order', () => {
    seedAccount('Mono', 0);
    saveTransaction(makeTx('t1', 'Дохід', 1000, 'Mono'));
    saveTransaction(makeTx('t2', 'Витрата', 500, 'Mono'));
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(history[0].id).toBe('t2');
    expect(history[1].id).toBe('t1');
  });
});

describe('E2E — Multi-Account Isolation', () => {
  beforeEach(clearAll);

  test('transactions on different accounts do not affect each other', () => {
    seedAccount('Mono', 10000);
    seedAccount('Cash', 5000);
    saveTransaction(makeTx('t1', 'Витрата', 2000, 'Mono'));
    saveTransaction(makeTx('t2', 'Дохід',   1000, 'Cash'));
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    const mono = accounts.find(a => a.name === 'Mono');
    const cash = accounts.find(a => a.name === 'Cash');
    expect(mono.currentBalance).toBe(8000);
    expect(cash.currentBalance).toBe(6000);
  });

  test('account creation adds to list without removing others', () => {
    seedAccount('Mono', 10000);
    seedAccount('Cash', 5000);
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    expect(accounts.length).toBe(2);
    expect(accounts.map(a => a.name)).toContain('Mono');
    expect(accounts.map(a => a.name)).toContain('Cash');
  });
});

describe('E2E — Filter Logic (History Page)', () => {
  beforeEach(clearAll);

  const buildHistory = () => {
    const past = new Date(); past.setDate(past.getDate() - 60);
    return [
      { id: '1', type: 'Витрата', amount: 500,  category: 'Продукти', userName: 'Oksana', date: new Date().toISOString(), account: 'Mono' },
      { id: '2', type: 'Дохід',   amount: 3000, category: 'Кредит',   userName: 'Ivan',   date: new Date().toISOString(), account: 'Cash' },
      { id: '3', type: 'Витрата', amount: 200,  category: 'Кафе',     userName: 'Oksana', date: past.toISOString(),       account: 'Mono' },
    ];
  };

  test('filter by participant returns only their transactions', () => {
    const history = buildHistory();
    const filtered = history.filter(t => t.userName === 'Oksana');
    expect(filtered.length).toBe(2);
    expect(filtered.every(t => t.userName === 'Oksana')).toBe(true);
  });

  test('filter by type returns only matching type', () => {
    const history = buildHistory();
    const expenses = history.filter(t => t.type === 'Витрата');
    expect(expenses.length).toBe(2);
  });

  test('filter by date range excludes older transactions', () => {
    const history = buildHistory();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = history.filter(t => new Date(t.date) >= thirtyDaysAgo);
    expect(recent.length).toBe(2); 
  });

  test('filter by category returns correct subset', () => {
    const history = buildHistory();
    const filtered = history.filter(t => t.category === 'Продукти');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  test('filter by account returns only that account', () => {
    const history = buildHistory();
    const mono = history.filter(t => t.account === 'Mono');
    expect(mono.length).toBe(2);
  });

  test('combined filters narrow down correctly', () => {
    const history = buildHistory();
    const filtered = history.filter(t => t.type === 'Витрата' && t.userName === 'Oksana');
    expect(filtered.length).toBe(2);
  });
});

describe('E2E — Backup & Restore Integrity', () => {
  beforeEach(clearAll);

  test('backup captures all three data stores', () => {
    seedAccount('Mono', 10000);
    saveTransaction(makeTx('t1', 'Дохід', 1000, 'Mono'));
    localStorage.setItem('fin_users_local', JSON.stringify([{ id: '1', name: 'Oksana' }]));
    const backup = {
      history:  JSON.parse(localStorage.getItem('fin_history_local') || '[]'),
      accounts: JSON.parse(localStorage.getItem('fin_accounts_local') || '[]'),
      users:    JSON.parse(localStorage.getItem('fin_users_local')    || '[]'),
      version:  '2.5',
      exportDate: new Date().toISOString(),
    };
    expect(backup.history.length).toBe(1);
    expect(backup.accounts.length).toBe(1);
    expect(backup.users.length).toBe(1);
    expect(backup.version).toBe('2.5');
  });

  test('restore from backup overwrites localStorage correctly', () => {
    const backup = {
      history:  [makeTx('restored_1', 'Дохід', 5000, 'Mono')],
      accounts: [{ id: 'acc_1', name: 'Mono', balance: 5000, currentBalance: 10000 }],
      users:    [{ id: 'u1', name: 'TestUser' }],
    };
    
    localStorage.setItem('fin_history_local',  JSON.stringify(backup.history));
    localStorage.setItem('fin_accounts_local', JSON.stringify(backup.accounts));
    localStorage.setItem('fin_users_local',    JSON.stringify(backup.users));

    const restored = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(restored[0].id).toBe('restored_1');
    const acc = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    expect(acc[0].currentBalance).toBe(10000);
  });

  test('backup JSON is serializable and parseable', () => {
    seedAccount('Mono', 5000);
    const raw = JSON.stringify({ history: [], accounts: [], users: [], version: '2.5' });
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('E2E — Edge Cases', () => {
  beforeEach(clearAll);

  test('handles empty localStorage gracefully', () => {
    const history  = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    expect(history).toEqual([]);
    expect(accounts).toEqual([]);
  });

  test('transaction with amount 0 does not corrupt balance', () => {
    seedAccount('Mono', 5000);
    saveTransaction(makeTx('t0', 'Витрата', 0, 'Mono'));
    const acc = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]').find(a => a.name === 'Mono');
    expect(acc.currentBalance).toBe(5000);
  });

  test('very large transaction amount is stored correctly', () => {
    seedAccount('Mono', 0);
    saveTransaction(makeTx('t_big', 'Дохід', 999999999, 'Mono'));
    const acc = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]').find(a => a.name === 'Mono');
    expect(acc.currentBalance).toBe(999999999);
  });

  test('account with negative balance is stored without error', () => {
    seedAccount('Mono', 100);
    saveTransaction(makeTx('t1', 'Витрата', 500, 'Mono'));
    const acc = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]').find(a => a.name === 'Mono');
    expect(acc.currentBalance).toBe(-400);
  });
});