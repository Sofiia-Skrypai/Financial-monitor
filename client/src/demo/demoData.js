// Генератор демонстраційних даних: 8 місяців історії сімейних фінансів.
// Використовується кнопкою «Демо-режим» на екрані входу, щоб рекрутер/рев'юер
// міг одразу побачити аналітику та ML-прогноз без ручного введення даних.

export const DEMO_EMAIL = 'demo@finmonitor.app';

// Детермінований генератор псевдовипадкових чисел (mulberry32) — однакові дані при кожному запуску
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const EXPENSES = [
  // категорія,              опис,                    середня сума, разів на місяць
  ['Оренда житла',        'Оренда квартири',         14000, 1],
  ['Продукти',           'Сільпо',                    950, 8],
  ['Продукти',           'АТБ',                       520, 6],
  ['Транспорт',          'Метро / таксі',             180, 10],
  ['Кафе',               'Кава та обіди',             260, 7],
  ['Розваги',            'Кіно / підписки',           420, 2],
  ['Комунальні послуги', 'Комуналка',                3400, 1],
  ['Медицина',           'Аптека',                    480, 1],
  ['Одяг',               'Одяг та взуття',           1900, 0.5],
  ['Інше',               'Дрібні покупки',            300, 3],
];

export function buildDemoData(now = new Date()) {
  const rand = rng(2026);
  const adminId = 'demo_admin';
  const memberId = 'demo_member';
  const members = [
    { id: adminId,  name: 'Олександр', role: 'Адмін' },
    { id: memberId, name: 'Марія',     role: 'Учасник', grantedPaths: ['/compare', '/pension'] },
  ];
  const accounts = [
    { id: 'demo_acc_1', name: 'Основна картка', balance: 12000, owner: 'all',       color: '#6366f1', currency: 'UAH' },
    { id: 'demo_acc_2', name: 'Картка Марії',   balance: 4500,  owner: 'Марія',     color: '#f97316', currency: 'UAH' },
    { id: 'demo_acc_3', name: 'Готівка',        balance: 2000,  owner: 'Олександр', color: '#10b981', currency: 'UAH' },
  ];

  const history = [];
  let n = 0;
  const push = (date, type, category, description, amount, account, userName) => {
    history.push({
      id: `demo_${++n}`, date: date.toISOString(), type, category, description,
      amount: Math.round(amount), account, userName,
    });
  };

  for (let m = 7; m >= 0; m--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const daysInMonth = m === 0
      ? now.getDate()
      : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const trend = 1 + (7 - m) * 0.025;                                     // поступове зростання витрат
    const season = 1 + 0.08 * Math.sin((monthStart.getMonth() / 12) * 2 * Math.PI);
    const day = (d) => new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(d, daysInMonth), 10 + Math.floor(rand() * 10));

    if (m > 0 || daysInMonth >= 5) {
      push(day(5), 'Дохід', 'Зарплата', 'Заробітна плата', 32000, 'Основна картка', 'Олександр');
      push(day(6), 'Дохід', 'Зарплата', 'Заробітна плата', 21000, 'Картка Марії', 'Марія');
      push(day(7), 'Дохід', 'Інше', 'Зняття готівки', 3000, 'Готівка', 'Олександр');
    }

    EXPENSES.forEach(([category, description, avg, perMonth]) => {
      const times = perMonth >= 1 ? perMonth : (rand() < perMonth ? 1 : 0);
      for (let i = 0; i < times; i++) {
        const d = Math.max(1, Math.round(((i + rand()) / Math.max(times, 1)) * daysInMonth));
        if (d > daysInMonth) continue;
        const who = category === 'Оренда житла' ? 'Олександр' : (rand() < 0.45 ? 'Олександр' : 'Марія');
        const account = who === 'Марія' ? 'Картка Марії'
          : (category === 'Оренда житла' || rand() < 0.75 ? 'Основна картка' : 'Готівка');
        push(day(d), 'Витрата', category, description, avg * trend * season * (0.7 + rand() * 0.6), account, who);
      }
    });
  }

  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  accounts.forEach(acc => {
    const delta = history.filter(t => t.account === acc.name)
      .reduce((s, t) => s + (t.type === 'Дохід' ? t.amount : -t.amount), 0);
    acc.currentBalance = acc.balance + delta;
  });

  const authAccount = {
    id: adminId, name: 'Олександр', email: DEMO_EMAIL, password: 'Demo12345',
    role: 'Адмін', secretCode: 'DEMO2026', createdAt: now.toISOString(),
  };

  return { members, accounts, history, authAccount };
}

/** Записує демо-дані в localStorage і повертає сесію адміністратора. */
export function loadDemo() {
  const { members, accounts, history, authAccount } = buildDemoData();
  const auth = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]')
    .filter(a => a.email !== DEMO_EMAIL);
  localStorage.setItem('fin_accounts_auth', JSON.stringify([...auth, authAccount]));
  localStorage.setItem('fin_users_local', JSON.stringify(members));
  localStorage.setItem('fin_accounts_local', JSON.stringify(accounts));
  localStorage.setItem('fin_history_local', JSON.stringify(history));
  const session = {
    id: authAccount.id, name: authAccount.name, email: authAccount.email, role: authAccount.role,
    activeMemberId: null, activeMemberName: null,
  };
  localStorage.setItem('user_session', JSON.stringify(session));
  return session;
}

/** Чи є в браузері власні (не демо) дані користувача, які буде перезаписано. */
export function hasOwnData() {
  const auth = JSON.parse(localStorage.getItem('fin_accounts_auth') || '[]');
  return auth.some(a => a.email !== DEMO_EMAIL);
}
