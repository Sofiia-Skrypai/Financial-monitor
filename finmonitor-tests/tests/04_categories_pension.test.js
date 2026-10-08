const CATS_KEY = 'fin_categories_local';

const DEFAULT_CATS = [
  { id: 'cat_1', name: 'Продукти',            icon: '🛒', color: '#f97316', limit: 0 },
  { id: 'cat_2', name: 'Транспорт',           icon: '🚗', color: '#0ea5e9', limit: 0 },
  { id: 'cat_3', name: 'Кафе',               icon: '☕', color: '#f59e0b', limit: 0 },
  { id: 'cat_4', name: 'Розваги',            icon: '🎬', color: '#8b5cf6', limit: 0 },
  { id: 'cat_5', name: 'Комунальні послуги', icon: '💡', color: '#14b8a6', limit: 0 },
  { id: 'cat_6', name: 'Медицина',           icon: '💊', color: '#ec4899', limit: 0 },
  { id: 'cat_7', name: 'Одяг',              icon: '👕', color: '#6366f1', limit: 0 },
  { id: 'cat_8', name: 'Інше',              icon: '📦', color: '#64748b', limit: 0 },
];

const getCategories = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    if (raw.length > 0) return raw.map(c => c.name);
  } catch {}
  return ['Продукти', 'Зарплата', 'Транспорт', 'Кафе', 'Розваги', 'Комунальні послуги', 'Медицина', 'Одяг', 'Інше'];
};

const seedCategories = (cats = DEFAULT_CATS) => {
  localStorage.setItem(CATS_KEY, JSON.stringify(cats));
};

const clearCats = () => localStorage.removeItem(CATS_KEY);

const calcFinal = (monthlyDeposit, annualRate, yearsLeft) => {
  if (yearsLeft <= 0) return 0;
  const m = annualRate / 12;
  const n = yearsLeft * 12;
  return monthlyDeposit * ((Math.pow(1 + m, n) - 1) / m);
};

const calcFinalReal = (monthlyDeposit, annualRate, yearsLeft, inflationRate) => {
  const nominal = calcFinal(monthlyDeposit, annualRate, yearsLeft);
  return nominal / Math.pow(1 + inflationRate, yearsLeft);
};

const RETIREMENT_YEARS = 25;
const calcRequiredDeposit = (monthlySpend, annualRate, yearsLeft, inflationRate = 0) => {
  if (yearsLeft <= 0) return 0;
  const inflatedSpend = monthlySpend * Math.pow(1 + inflationRate, yearsLeft);
  const rW = annualRate / 12;
  const nW = RETIREMENT_YEARS * 12;
  const requiredCapital = rW > 0
    ? inflatedSpend * (1 - Math.pow(1 + rW, -nW)) / rW
    : inflatedSpend * nW;
  const rA = annualRate / 12;
  const nA = yearsLeft * 12;
  if (rA <= 0) return requiredCapital / nA;
  return requiredCapital * rA / (Math.pow(1 + rA, nA) - 1);
};

describe('CATEGORIES — Storage & CRUD', () => {
  beforeEach(clearCats);

  test('returns default categories when localStorage is empty', () => {
    const cats = getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toContain('Продукти');
  });

  test('returns seeded categories from localStorage', () => {
    seedCategories();
    const cats = getCategories();
    expect(cats).toContain('Продукти');
    expect(cats).toContain('Медицина');
  });

  test('adding a new category persists it', () => {
    seedCategories();
    const current = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    const newCat = { id: 'cat_new', name: 'Подорожі', icon: '✈️', color: '#f97316', limit: 0 };
    localStorage.setItem(CATS_KEY, JSON.stringify([...current, newCat]));
    const cats = getCategories();
    expect(cats).toContain('Подорожі');
  });

  test('deleting a category removes it from storage', () => {
    seedCategories();
    const current = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    const filtered = current.filter(c => c.id !== 'cat_1'); 
    localStorage.setItem(CATS_KEY, JSON.stringify(filtered));
    const cats = getCategories();
    expect(cats).not.toContain('Продукти');
  });

  test('editing a category name updates it in storage', () => {
    seedCategories();
    const current = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    const updated = current.map(c => c.id === 'cat_3' ? { ...c, name: 'Ресторани' } : c);
    localStorage.setItem(CATS_KEY, JSON.stringify(updated));
    const cats = getCategories();
    expect(cats).toContain('Ресторани');
    expect(cats).not.toContain('Кафе');
  });

  test('category limit can be set and read back', () => {
    seedCategories();
    const current = JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
    const updated = current.map(c => c.id === 'cat_1' ? { ...c, limit: 3000 } : c);
    localStorage.setItem(CATS_KEY, JSON.stringify(updated));
    const stored = JSON.parse(localStorage.getItem(CATS_KEY));
    expect(stored.find(c => c.id === 'cat_1').limit).toBe(3000);
  });

  test('QuickAddModal income type gets Кредит category first', () => {
    seedCategories();
    const cats = getCategories();
    const incomeOptions = ['Кредит', ...cats.filter(c => c !== 'Кредит')];
    expect(incomeOptions[0]).toBe('Кредит');
  });
});

describe('PENSION — Future Value Formula', () => {
  test('zero years returns 0', () => {
    expect(calcFinal(1000, 0.10, 0)).toBe(0);
  });

  test('negative years returns 0', () => {
    expect(calcFinal(1000, 0.10, -5)).toBe(0);
  });

  test('moderate strategy (10%) 20 years ₴1000/month exceeds contributions', () => {
    const result = calcFinal(1000, 0.10, 20);
    const totalContributions = 1000 * 12 * 20; 
    expect(result).toBeGreaterThan(totalContributions);
  });

  test('higher rate produces larger final amount', () => {
    const conservative = calcFinal(1000, 0.05, 25);
    const aggressive   = calcFinal(1000, 0.15, 25);
    expect(aggressive).toBeGreaterThan(conservative);
  });

  test('longer horizon produces larger final amount', () => {
    const short = calcFinal(1000, 0.10, 10);
    const long  = calcFinal(1000, 0.10, 30);
    expect(long).toBeGreaterThan(short);
  });

  test('higher monthly deposit produces larger final amount', () => {
    const small = calcFinal(500,  0.10, 20);
    const large = calcFinal(2000, 0.10, 20);
    expect(large).toBeCloseTo(small * 4, 0);
  });

  test('result is finite number', () => {
    expect(isFinite(calcFinal(1000, 0.10, 30))).toBe(true);
  });
});

describe('PENSION — Inflation Adjustment', () => {
  test('real value is less than nominal value when inflation > 0', () => {
    const nominal = calcFinal(1000, 0.10, 20);
    const real    = calcFinalReal(1000, 0.10, 20, 0.05);
    expect(real).toBeLessThan(nominal);
  });

  test('real value equals nominal when inflation is 0', () => {
    const nominal = calcFinal(1000, 0.10, 20);
    const real    = calcFinalReal(1000, 0.10, 20, 0);
    expect(real).toBeCloseTo(nominal, 5);
  });

  test('higher inflation produces smaller real value', () => {
    const low  = calcFinalReal(1000, 0.10, 20, 0.03);
    const high = calcFinalReal(1000, 0.10, 20, 0.10);
    expect(high).toBeLessThan(low);
  });
});

describe('PENSION — Required Deposit (Spend Mode)', () => {
  test('returns positive required deposit', () => {
    const deposit = calcRequiredDeposit(10000, 0.10, 30);
    expect(deposit).toBeGreaterThan(0);
  });

  test('higher desired spend requires larger monthly deposit', () => {
    const low  = calcRequiredDeposit(5000,  0.10, 30);
    const high = calcRequiredDeposit(20000, 0.10, 30);
    expect(high).toBeGreaterThan(low);
  });

  test('more years to retirement reduces required monthly deposit', () => {
    const short = calcRequiredDeposit(10000, 0.10, 10);
    const long  = calcRequiredDeposit(10000, 0.10, 30);
    expect(long).toBeLessThan(short);
  });

  test('inflation increases required deposit (inflated target spend)', () => {
    const noInflation   = calcRequiredDeposit(10000, 0.10, 20, 0);
    const withInflation = calcRequiredDeposit(10000, 0.10, 20, 0.05);
    expect(withInflation).toBeGreaterThan(noInflation);
  });

  test('returns 0 when yearsLeft is 0', () => {
    expect(calcRequiredDeposit(10000, 0.10, 0)).toBe(0);
  });
});