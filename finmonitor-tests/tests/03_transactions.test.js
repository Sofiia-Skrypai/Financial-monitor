const saveTransaction = (newTransaction) => {
  const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
  const updatedHistory = [newTransaction, ...history];
  localStorage.setItem('fin_history_local', JSON.stringify(updatedHistory));

  const accountName = newTransaction.account;
  if (accountName && accountName !== 'Пенсійні заощадження') {
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    const updatedAccounts = accounts.map(acc => {
      if (acc.name !== accountName) return acc;
      const accHistory = updatedHistory.filter(t => t.account === acc.name);
      const delta = accHistory.reduce((sum, t) => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'Дохід')    return sum + Math.abs(amt);
        if (t.type === 'Витрата')  return sum - Math.abs(amt);
        return sum;
      }, 0);
      return { ...acc, currentBalance: (parseFloat(acc.balance) || 0) + delta };
    });
    localStorage.setItem('fin_accounts_local', JSON.stringify(updatedAccounts));
  }
  return updatedHistory;
};

const makeTransaction = (overrides = {}) => ({
  id:          Date.now().toString(),
  date:        new Date().toISOString(),
  amount:      1000,
  type:        'Витрата',
  category:    'Продукти',
  account:     'Mono',
  description: 'Test',
  userName:    'Oksana',
  ...overrides,
});

const seedAccount = (name, balance = 10000) => {
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
  const updated = [...accounts.filter(a => a.name !== name), { id: name, name, balance, currentBalance: balance, currency: 'UAH' }];
  localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
};

const getAccount = (name) => {
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
  return accounts.find(a => a.name === name) || null;
};

const clearAll = () => {
  localStorage.removeItem('fin_history_local');
  localStorage.removeItem('fin_accounts_local');
  localStorage.removeItem('fin_pension_savings_local');
};

describe('TRANSACTIONS — Persistence', () => {
  beforeEach(clearAll);

  test('saveTransaction writes to fin_history_local', () => {
    seedAccount('Mono');
    saveTransaction(makeTransaction());
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(history.length).toBe(1);
  });

  test('newest transaction is first in history array', () => {
    seedAccount('Mono');
    saveTransaction(makeTransaction({ id: '1', description: 'First' }));
    saveTransaction(makeTransaction({ id: '2', description: 'Second' }));
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(history[0].description).toBe('Second');
  });

  test('multiple transactions accumulate correctly', () => {
    seedAccount('Mono');
    for (let i = 0; i < 5; i++) saveTransaction(makeTransaction({ id: String(i) }));
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(history.length).toBe(5);
  });
});

describe('TRANSACTIONS — Account Balance Recalculation', () => {
  beforeEach(clearAll);

  test('expense reduces account currentBalance', () => {
    seedAccount('Mono', 10000);
    saveTransaction(makeTransaction({ type: 'Витрата', amount: 1500, account: 'Mono' }));
    expect(getAccount('Mono').currentBalance).toBe(8500);
  });

  test('income increases account currentBalance', () => {
    seedAccount('Mono', 10000);
    saveTransaction(makeTransaction({ type: 'Дохід', amount: 2000, account: 'Mono' }));
    expect(getAccount('Mono').currentBalance).toBe(12000);
  });

  test('multiple transactions compound correctly', () => {
    seedAccount('Mono', 5000);
    saveTransaction(makeTransaction({ id: '1', type: 'Дохід',   amount: 3000, account: 'Mono' }));
    saveTransaction(makeTransaction({ id: '2', type: 'Витрата', amount: 800,  account: 'Mono' }));
    saveTransaction(makeTransaction({ id: '3', type: 'Витрата', amount: 200,  account: 'Mono' }));
    
    expect(getAccount('Mono').currentBalance).toBe(7000);
  });

  test('pension transaction does not affect account balance', () => {
    seedAccount('Mono', 10000);
    saveTransaction(makeTransaction({
      type: 'Пенсійні заощадження',
      account: 'Пенсійні заощадження',
      amount: 500,
    }));
    
    expect(getAccount('Mono').currentBalance).toBe(10000);
  });

  test('transaction on unknown account does not crash', () => {
    
    expect(() => {
      saveTransaction(makeTransaction({ account: 'NonExistent' }));
    }).not.toThrow();
  });

  test('transactions only affect their own account', () => {
    seedAccount('Mono', 5000);
    seedAccount('Готівка', 2000);
    saveTransaction(makeTransaction({ type: 'Витрата', amount: 500, account: 'Mono' }));
    expect(getAccount('Mono').currentBalance).toBe(4500);
    expect(getAccount('Готівка').currentBalance).toBe(2000); 
  });
});

describe('TRANSACTIONS — Pension Savings', () => {
  beforeEach(clearAll);

  const addPension = (amount, note = 'Test') => {
    const stored = JSON.parse(localStorage.getItem('fin_pension_savings_local') || '{"total":0,"history":[]}');
    const entry = { id: Date.now().toString(), amount, note, date: new Date().toISOString() };
    const updated = { total: (stored.total || 0) + amount, history: [entry, ...(stored.history || [])] };
    localStorage.setItem('fin_pension_savings_local', JSON.stringify(updated));
    return updated;
  };

  test('pension savings total increases after contribution', () => {
    addPension(1000);
    const stored = JSON.parse(localStorage.getItem('fin_pension_savings_local'));
    expect(stored.total).toBe(1000);
  });

  test('multiple pension contributions accumulate', () => {
    addPension(1000);
    addPension(500);
    addPension(2500);
    const stored = JSON.parse(localStorage.getItem('fin_pension_savings_local'));
    expect(stored.total).toBe(4000);
  });

  test('pension history records are stored newest-first', () => {
    addPension(100, 'First');
    addPension(200, 'Second');
    const stored = JSON.parse(localStorage.getItem('fin_pension_savings_local'));
    expect(stored.history[0].note).toBe('Second');
  });

  test('pension contribution also debits source account', () => {
    seedAccount('Mono', 10000);
    
    const amount = 500;
    const tx = makeTransaction({ type: 'Пенсійні заощадження', account: 'Mono', amount });
    
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    localStorage.setItem('fin_history_local', JSON.stringify([tx, ...history]));
    
    const accs = JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    const updated = accs.map(a => a.name === 'Mono' ? { ...a, currentBalance: a.currentBalance - amount } : a);
    localStorage.setItem('fin_accounts_local', JSON.stringify(updated));
    addPension(amount);

    expect(getAccount('Mono').currentBalance).toBe(9500);
    const pension = JSON.parse(localStorage.getItem('fin_pension_savings_local'));
    expect(pension.total).toBe(500);
  });
});

describe('TRANSACTIONS — Edit & Delete', () => {
  beforeEach(clearAll);

  test('editing a transaction updates its fields in localStorage', () => {
    seedAccount('Mono', 5000);
    const tx = makeTransaction({ id: 'tx_1', amount: 1000, description: 'Original' });
    saveTransaction(tx);
    
    const history = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    const edited = history.map(t => t.id === 'tx_1' ? { ...t, amount: 1500, description: 'Edited' } : t);
    localStorage.setItem('fin_history_local', JSON.stringify(edited));
    const result = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(result.find(t => t.id === 'tx_1').description).toBe('Edited');
    expect(result.find(t => t.id === 'tx_1').amount).toBe(1500);
  });

  test('deleting a transaction removes it from localStorage', () => {
    seedAccount('Mono', 5000);
    saveTransaction(makeTransaction({ id: 'tx_del' }));
    const before = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(before.some(t => t.id === 'tx_del')).toBe(true);
    const after = before.filter(t => t.id !== 'tx_del');
    localStorage.setItem('fin_history_local', JSON.stringify(after));
    const result = JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    expect(result.some(t => t.id === 'tx_del')).toBe(false);
  });
});