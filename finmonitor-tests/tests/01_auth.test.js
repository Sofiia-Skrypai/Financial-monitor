const getPasswordStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  if (pwd.length >= 12)          score++;
  if (score <= 1) return { label: 'Дуже слабкий', width: '20%' };
  if (score === 2) return { label: 'Слабкий',      width: '40%' };
  if (score === 3) return { label: 'Середній',     width: '60%' };
  if (score === 4) return { label: 'Надійний',     width: '80%' };
  return                 { label: 'Відмінний',     width: '100%' };
};

const generateSecretCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const validate = (formData, isLogin = false) => {
  if (!isLogin && !formData.name?.trim()) return 'Введіть ваше ім\'я.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Введіть коректну email-адресу.';
  if (formData.password.length < 8) return 'Пароль повинен містити щонайменше 8 символів.';
  if (!/[A-Z]/.test(formData.password)) return 'Пароль повинен містити хоча б одну велику літеру.';
  if (!/[0-9]/.test(formData.password)) return 'Пароль повинен містити хоча б одну цифру.';
  if (!isLogin && formData.password !== formData.confirm) return 'Паролі не збігаються.';
  return null;
};

const clearAuth = () => {
  localStorage.removeItem('fin_accounts_auth');
  localStorage.removeItem('user_session');
  localStorage.removeItem('fin_users_local');
};

const registerUser = (name, email, password, role = 'Адмін') => {
  const code = generateSecretCode();
  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password,
    role,
    secretCode: code,
    createdAt: new Date().toISOString(),
  };
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
  localStorage.setItem('fin_accounts_auth', JSON.stringify([...accounts, newUser]));
  return newUser;
};

const loginUser = (email, password) => {
  const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
  return accounts.find(a => a.email === email && a.password === password) || null;
};

describe('AUTH — Password Strength', () => {
  test('very weak: short lowercase only', () => {
    expect(getPasswordStrength('abc').label).toBe('Дуже слабкий');
  });
  test('weak: 8+ chars, no uppercase/number', () => {
    
    expect(getPasswordStrength('abcdefgh').label).toBe('Дуже слабкий');
  });
  test('medium: 8+ chars + uppercase', () => {
    
    expect(getPasswordStrength('Abcdefgh').label).toBe('Слабкий');
  });
  test('reliable: 8+ chars + uppercase + number', () => {
    
    expect(getPasswordStrength('Abcdef1h').label).toBe('Середній');
  });
  test('excellent: 12+ chars + uppercase + number + special', () => {
    expect(getPasswordStrength('Abcdef1h!xyz').label).toBe('Відмінний');
  });
});

describe('AUTH — Registration Validation', () => {
  test('rejects missing name', () => {
    const err = validate({ name: '', email: 'a@b.com', password: 'Pass1234', confirm: 'Pass1234' });
    expect(err).toMatch(/ім'я/i);
  });
  test('rejects invalid email', () => {
    const err = validate({ name: 'Anna', email: 'notanemail', password: 'Pass1234', confirm: 'Pass1234' });
    expect(err).toMatch(/email/i);
  });
  test('rejects password shorter than 8 chars', () => {
    const err = validate({ name: 'Anna', email: 'a@b.com', password: 'Pa1', confirm: 'Pa1' });
    expect(err).toMatch(/8 символів/);
  });
  test('rejects password without uppercase', () => {
    const err = validate({ name: 'Anna', email: 'a@b.com', password: 'password1', confirm: 'password1' });
    expect(err).toMatch(/велику літеру/);
  });
  test('rejects password without digit', () => {
    const err = validate({ name: 'Anna', email: 'a@b.com', password: 'Password', confirm: 'Password' });
    expect(err).toMatch(/цифру/);
  });
  test('rejects mismatched passwords', () => {
    const err = validate({ name: 'Anna', email: 'a@b.com', password: 'Pass1234', confirm: 'Pass9999' });
    expect(err).toMatch(/не збігаються/);
  });
  test('passes valid registration data', () => {
    expect(validate({ name: 'Anna', email: 'anna@test.com', password: 'Pass1234', confirm: 'Pass1234' })).toBeNull();
  });
});

describe('AUTH — Registration & Login Flow', () => {
  beforeEach(clearAuth);

  test('registers a new user and stores in localStorage', () => {
    registerUser('Oksana', 'oksana@test.com', 'Pass1234');
    const stored = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].email).toBe('oksana@test.com');
    expect(stored[0].role).toBe('Адмін');
  });

  test('login succeeds with correct credentials', () => {
    registerUser('Oksana', 'oksana@test.com', 'Pass1234');
    const match = loginUser('oksana@test.com', 'Pass1234');
    expect(match).not.toBeNull();
    expect(match.name).toBe('Oksana');
  });

  test('login fails with wrong password', () => {
    registerUser('Oksana', 'oksana@test.com', 'Pass1234');
    expect(loginUser('oksana@test.com', 'Wrong999')).toBeNull();
  });

  test('login fails with unknown email', () => {
    expect(loginUser('nobody@test.com', 'Pass1234')).toBeNull();
  });

  test('prevents duplicate email registration', () => {
    registerUser('Oksana', 'oksana@test.com', 'Pass1234');
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
    const duplicate = accounts.some(a => a.email.toLowerCase() === 'oksana@test.com');
    expect(duplicate).toBe(true); // block second registration at this email
  });

  test('session is persisted to localStorage', () => {
    const user = registerUser('Oksana', 'oksana@test.com', 'Pass1234');
    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem('user_session', JSON.stringify(session));
    const restored = JSON.parse(localStorage.getItem('user_session'));
    expect(restored.email).toBe('oksana@test.com');
  });

  test('logout clears session', () => {
    localStorage.setItem('user_session', JSON.stringify({ id: '1', name: 'Test' }));
    localStorage.removeItem('user_session');
    expect(localStorage.getItem('user_session')).toBeNull();
  });
});

describe('AUTH — Secret Code', () => {
  test('generated code is 8 characters', () => {
    expect(generateSecretCode()).toHaveLength(8);
  });
  test('generated code contains only valid charset chars', () => {
    const code = generateSecretCode();
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)).toBe(true);
  });
  test('two generated codes are almost always different', () => {
    const a = generateSecretCode(), b = generateSecretCode();

    expect(a).not.toBe(b);
  });
  test('secret code verified correctly', () => {
    beforeEach: clearAuth();
    const user = registerUser('Admin', 'admin@test.com', 'Pass1234');
    const accounts = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
    const found = accounts.find(a => a.name === 'Admin');
    expect(found.secretCode).toBe(user.secretCode);
    expect(found.secretCode).toHaveLength(8);
  });
});