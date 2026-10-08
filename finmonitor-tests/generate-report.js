
'use strict';
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, 'test-report.html');
const JSON_FILE   = path.join(__dirname, 'jest-results.json');

const SUITE_META = {
  '01_auth.test.js':              { id:'AUTH', label:'Автентифікація',       icon:'🔐', desc:'Реєстрація, вхід, сесії, пароль, секретний код' },
  '02_rbac.test.js':              { id:'RBAC', label:'Права доступу',        icon:'🛡',  desc:'Адмін vs учасник, grantedPaths, захист операцій' },
  '03_transactions.test.js':      { id:'TXN',  label:'Транзакції',           icon:'💳', desc:'Збереження, баланс рахунків, пенсія, редагування' },
  '04_categories_pension.test.js':{ id:'CAT',  label:'Категорії та пенсія',  icon:'📊', desc:'CRUD категорій, формула FV, інфляція, режим витрат' },
  '05_e2e_regression.test.js':    { id:'E2E',  label:'End-to-End',           icon:'🔄', desc:'Повний цикл: реєстрація → транзакція → баланс, фільтри, бекап' },
};

const TC_META = {
  "AUTH — Password Strength very weak: short lowercase only":
    { id:'TC-AUTH-01', desc:'Пароль тільки з малих літер', detail:'Лише малі літери без цифр → рівень "Дуже слабкий"' },
  "AUTH — Password Strength weak: 8+ chars, no uppercase/number":
    { id:'TC-AUTH-02', desc:'Пароль ≥8 символів без великих/цифр', detail:'score=1 (тільки length≥8) → "Дуже слабкий"' },
  "AUTH — Password Strength medium: 8+ chars + uppercase":
    { id:'TC-AUTH-03', desc:'Пароль ≥8 символів + велика літера', detail:'score=2 → "Слабкий"' },
  "AUTH — Password Strength reliable: 8+ chars + uppercase + number":
    { id:'TC-AUTH-04', desc:'Пароль ≥8 + велика + цифра', detail:'score=3 → "Середній"' },
  "AUTH — Password Strength excellent: 12+ chars + uppercase + number + special":
    { id:'TC-AUTH-05', desc:'Надійний пароль ≥12 + всі типи символів', detail:'score=5 → "Відмінний"' },
  "AUTH — Registration Validation rejects missing name":
    { id:'TC-AUTH-06', desc:'Відмова при порожньому імені', detail:"validate() повертає помилку 'Введіть ваше ім\\'я'" },
  "AUTH — Registration Validation rejects invalid email":
    { id:'TC-AUTH-07', desc:'Відмова при некоректному email', detail:"Рядок без '@' → помилка email" },
  "AUTH — Registration Validation rejects password shorter than 8 chars":
    { id:'TC-AUTH-08', desc:'Відмова при паролі < 8 символів', detail:"validate() → 'Пароль повинен містити щонайменше 8 символів'" },
  "AUTH — Registration Validation rejects password without uppercase":
    { id:'TC-AUTH-09', desc:'Відмова при відсутності великої літери', detail:"validate() → 'хоча б одну велику літеру'" },
  "AUTH — Registration Validation rejects password without digit":
    { id:'TC-AUTH-10', desc:'Відмова при відсутності цифри', detail:"validate() → 'хоча б одну цифру'" },
  "AUTH — Registration Validation rejects mismatched passwords":
    { id:'TC-AUTH-11', desc:'Відмова при незбігу паролів', detail:"password ≠ confirm → 'Паролі не збігаються'" },
  "AUTH — Registration Validation passes valid registration data":
    { id:'TC-AUTH-12', desc:'Успішна валідація коректних даних', detail:'Всі поля правильні → validate() повертає null' },
  "AUTH — Registration & Login Flow registers a new user and stores in localStorage":
    { id:'TC-AUTH-13', desc:'Реєстрація зберігає дані в localStorage', detail:'fin_accounts_auth містить нового користувача з роллю Адмін' },
  "AUTH — Registration & Login Flow login succeeds with correct credentials":
    { id:'TC-AUTH-14', desc:'Успішний вхід з правильними даними', detail:"loginUser() повертає об'єкт користувача" },
  "AUTH — Registration & Login Flow login fails with wrong password":
    { id:'TC-AUTH-15', desc:'Відмова входу при хибному паролі', detail:'loginUser() повертає null' },
  "AUTH — Registration & Login Flow login fails with unknown email":
    { id:'TC-AUTH-16', desc:'Відмова входу при невідомому email', detail:'loginUser() → null для незареєстрованого email' },
  "AUTH — Registration & Login Flow prevents duplicate email registration":
    { id:'TC-AUTH-17', desc:'Блокування дублікату email', detail:'Перевірка наявності email перед збереженням' },
  "AUTH — Registration & Login Flow session is persisted to localStorage":
    { id:'TC-AUTH-18', desc:'Сесія зберігається в localStorage', detail:'user_session містить id, name, email, role' },
  "AUTH — Registration & Login Flow logout clears session":
    { id:'TC-AUTH-19', desc:'Вихід очищує сесію', detail:'removeItem("user_session") → null' },
  "AUTH — Secret Code generated code is 8 characters":
    { id:'TC-AUTH-20', desc:'Довжина секретного коду — 8 символів', detail:'generateSecretCode().length === 8' },
  "AUTH — Secret Code generated code contains only valid charset chars":
    { id:'TC-AUTH-21', desc:'Символи коду відповідають charset', detail:'Regex /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)' },
  "AUTH — Secret Code two generated codes are almost always different":
    { id:'TC-AUTH-22', desc:'Унікальність кодів', detail:'Два послідовних коди майже завжди різні (P≈10⁻¹²)' },
  "AUTH — Secret Code secret code verified correctly":
    { id:'TC-AUTH-23', desc:'Код зберігається і збігається', detail:'stored[0].secretCode === user.secretCode; length === 8' },

  "RBAC — Admin access admin can access all protected paths":
    { id:'TC-RBAC-01', desc:'Адмін має доступ до захищених маршрутів', detail:'/users, /compare, /pension → canAccessPath() = true' },
  "RBAC — Admin access admin can access all non-protected paths":
    { id:'TC-RBAC-02', desc:'Адмін має доступ до публічних маршрутів', detail:'/, /accounts, /history → true' },
  "RBAC — Admin access isAdmin is false when activeMemberId is set (acting as member)":
    { id:'TC-RBAC-03', desc:'Адмін у режимі учасника втрачає права', detail:'activeMemberId ≠ null → isAdmin = false' },

  "RBAC — Unauthenticated / no session null user cannot access any path":
    { id:'TC-RBAC-04', desc:'Неавтентифікований → жодного доступу', detail:'canAccessPath(null, path) = false для всіх шляхів' },
  "RBAC — Unauthenticated / no session user without activeMemberId cannot access protected paths":
    { id:'TC-RBAC-05', desc:'Без activeMemberId → немає доступу', detail:'activeMemberId = null → false для /users, /compare, /pension' },

  "RBAC — Member with granted paths member with /pension grant can access /pension":
    { id:'TC-RBAC-06', desc:'Учасник з правом /pension має доступ', detail:'grantedPaths includes /pension → true' },
  "RBAC — Member with granted paths member with /history grant can access /history":
    { id:'TC-RBAC-07', desc:'Учасник з правом /history має доступ', detail:'grantedPaths includes /history → true' },
  "RBAC — Member with granted paths member without /compare grant cannot access /compare":
    { id:'TC-RBAC-08', desc:'Учасник без /compare → немає доступу', detail:'/compare не в grantedPaths → false' },
  "RBAC — Member with granted paths member without /users grant cannot access /users":
    { id:'TC-RBAC-09', desc:'Учасник без /users → немає доступу', detail:'/users не в grantedPaths → false' },
  "RBAC — Member with granted paths member with empty grantedPaths cannot access any protected path":
    { id:'TC-RBAC-10', desc:'Порожній grantedPaths → скрізь відмова', detail:'grantedPaths = [] → false для всіх захищених шляхів' },

  "RBAC — Account operations guard isAdmin true: admin with no activeMemberId can edit accounts":
    { id:'TC-RBAC-11', desc:'Адмін може редагувати рахунки', detail:'isAdmin = true → доступ до редагування' },
  "RBAC — Account operations guard isAdmin false: admin acting as member cannot edit accounts":
    { id:'TC-RBAC-12', desc:'Адмін-учасник не може редагувати рахунки', detail:'isAdmin = false → заблоковано' },
  "RBAC — Account operations guard account deletion blocked for non-admin":
    { id:'TC-RBAC-13', desc:'Видалення рахунку заблоковано', detail:'isAdmin = false → операція повертає "blocked"' },
  "RBAC — Categories admin guard showForm and edit/delete buttons only shown to admin":
    { id:'TC-RBAC-14', desc:'Форма і кнопки категорій — лише для адміна', detail:'isAdmin(admin)=true, isAdmin(member)=false' },

  "TRANSACTIONS — Persistence saveTransaction writes to fin_history_local":
    { id:'TC-TXN-01', desc:'Транзакція зберігається в localStorage', detail:'fin_history_local містить 1 запис після saveTransaction()' },
  "TRANSACTIONS — Persistence newest transaction is first in history array":
    { id:'TC-TXN-02', desc:'Новіший запис завжди перший', detail:'history[0].description = "Second" після двох збережень' },
  "TRANSACTIONS — Persistence multiple transactions accumulate correctly":
    { id:'TC-TXN-03', desc:'Кілька транзакцій накопичуються', detail:'5 викликів → history.length = 5' },

  "TRANSACTIONS — Account Balance Recalculation expense reduces account currentBalance":
    { id:'TC-TXN-04', desc:'Витрата зменшує баланс', detail:'10 000 - 1 500 = 8 500' },
  "TRANSACTIONS — Account Balance Recalculation income increases account currentBalance":
    { id:'TC-TXN-05', desc:'Дохід збільшує баланс', detail:'10 000 + 2 000 = 12 000' },
  "TRANSACTIONS — Account Balance Recalculation multiple transactions compound correctly":
    { id:'TC-TXN-06', desc:'Кілька операцій складаються коректно', detail:'5000 + 3000 - 800 - 200 = 7 000' },
  "TRANSACTIONS — Account Balance Recalculation pension transaction does not affect account balance":
    { id:'TC-TXN-07', desc:'Пенсійна операція не змінює баланс рахунку', detail:'account = Пенсійні заощадження → Mono залишається 10 000' },
  "TRANSACTIONS — Account Balance Recalculation transaction on unknown account does not crash":
    { id:'TC-TXN-08', desc:'Невідомий рахунок не кидає виняток', detail:'saveTransaction() завершується без помилок' },
  "TRANSACTIONS — Account Balance Recalculation transactions only affect their own account":
    { id:'TC-TXN-09', desc:'Транзакції ізольовані між рахунками', detail:'Витрата на Mono не змінює Cash' },

  "TRANSACTIONS — Pension Savings pension savings total increases after contribution":
    { id:'TC-TXN-10', desc:'Пенсія зростає після внеску', detail:'addPension(1000) → total = 1 000' },
  "TRANSACTIONS — Pension Savings multiple pension contributions accumulate":
    { id:'TC-TXN-11', desc:'Кілька внесків акумулюються', detail:'1000 + 500 + 2500 = 4 000' },
  "TRANSACTIONS — Pension Savings pension history records are stored newest-first":
    { id:'TC-TXN-12', desc:'Пенсійна історія — новіший перший', detail:'history[0].note = "Second"' },
  "TRANSACTIONS — Pension Savings pension contribution also debits source account":
    { id:'TC-TXN-13', desc:'Внесок списується з рахунку-джерела', detail:'Mono: 10 000 - 500 = 9 500; pension.total = 500' },

  "TRANSACTIONS — Edit & Delete editing a transaction updates its fields in localStorage":
    { id:'TC-TXN-14', desc:'Редагування оновлює поля транзакції', detail:'Після edit: amount=1500, description="Edited"' },
  "TRANSACTIONS — Edit & Delete deleting a transaction removes it from localStorage":
    { id:'TC-TXN-15', desc:'Видалення прибирає транзакцію', detail:'filter(t => t.id !== "tx_del") → запис відсутній' },

  "CATEGORIES — Storage & CRUD returns default categories when localStorage is empty":
    { id:'TC-CAT-01', desc:'Дефолтні категорії при порожньому сховищі', detail:'getCategories() contains "Продукти"' },
  "CATEGORIES — Storage & CRUD returns seeded categories from localStorage":
    { id:'TC-CAT-02', desc:'Категорії зчитуються з localStorage', detail:'Після seedCategories() → contains "Медицина"' },
  "CATEGORIES — Storage & CRUD adding a new category persists it":
    { id:'TC-CAT-03', desc:'Нова категорія зберігається', detail:'"Подорожі" → getCategories() contains "Подорожі"' },
  "CATEGORIES — Storage & CRUD deleting a category removes it from storage":
    { id:'TC-CAT-04', desc:'Видалення категорії прибирає її', detail:'filter(c => c.id !== "cat_1") → "Продукти" відсутня' },
  "CATEGORIES — Storage & CRUD editing a category name updates it in storage":
    { id:'TC-CAT-05', desc:'Редагування імені категорії', detail:'"Кафе" → "Ресторани"; "Кафе" відсутня' },
  "CATEGORIES — Storage & CRUD category limit can be set and read back":
    { id:'TC-CAT-06', desc:'Ліміт категорії зберігається', detail:'cat_1.limit = 3000 → stored.limit === 3000' },
  "CATEGORIES — Storage & CRUD QuickAddModal income type gets Кредит category first":
    { id:'TC-CAT-07', desc:'Тип "Дохід" → перша категорія "Кредит"', detail:'incomeOptions[0] === "Кредит"' },
  "PENSION — Future Value Formula zero years returns 0":
    { id:'TC-CAT-08', desc:'FV при 0 років = 0', detail:'calcFinal(1000, 0.10, 0) === 0' },
  "PENSION — Future Value Formula negative years returns 0":
    { id:'TC-CAT-09', desc:"FV при від'ємних роках = 0", detail:'calcFinal(1000, 0.10, -5) === 0' },
  "PENSION — Future Value Formula moderate strategy (10%) 20 years ₴1000/month exceeds contributions":
    { id:'TC-CAT-10', desc:'FV перевищує суму внесків за 20 років', detail:'calcFinal > 1000×12×20 = 240 000 ₴' },
  "PENSION — Future Value Formula higher rate produces larger final amount":
    { id:'TC-CAT-11', desc:'Вища ставка → більший капітал', detail:'FV(15%) > FV(5%) за 25 років' },
  "PENSION — Future Value Formula longer horizon produces larger final amount":
    { id:'TC-CAT-12', desc:'Довший горизонт → більший капітал', detail:'FV(30р) > FV(10р)' },
  "PENSION — Future Value Formula higher monthly deposit produces larger final amount":
    { id:'TC-CAT-13', desc:'Більший внесок → більший капітал', detail:'FV(2000) ≈ 4 × FV(500)' },
  "PENSION — Future Value Formula result is finite number":
    { id:'TC-CAT-14', desc:'Результат є скінченним числом', detail:'isFinite(calcFinal(1000, 0.10, 30)) === true' },
  "PENSION — Inflation Adjustment real value is less than nominal value when inflation > 0":
    { id:'TC-CAT-15', desc:'Реальна < номінальна при інфляції > 0', detail:'calcFinalReal(i=5%) < calcFinal()' },
  "PENSION — Inflation Adjustment real value equals nominal when inflation is 0":
    { id:'TC-CAT-16', desc:'При інфляції 0 реальна = номінальна', detail:'calcFinalReal(i=0) ≈ calcFinal()' },
  "PENSION — Inflation Adjustment higher inflation produces smaller real value":
    { id:'TC-CAT-17', desc:'Вища інфляція → менша реальна вартість', detail:'real(10%) < real(3%)' },
  "PENSION — Required Deposit (Spend Mode) returns positive required deposit":
    { id:'TC-CAT-18', desc:'Необхідний внесок є позитивним числом', detail:'calcRequiredDeposit(10000, 0.10, 30) > 0' },
  "PENSION — Required Deposit (Spend Mode) higher desired spend requires larger monthly deposit":
    { id:'TC-CAT-19', desc:'Вищі витрати → більший необхідний внесок', detail:'deposit(20000) > deposit(5000)' },
  "PENSION — Required Deposit (Spend Mode) more years to retirement reduces required monthly deposit":
    { id:'TC-CAT-20', desc:'Більше років → менший необхідний внесок', detail:'deposit(30р) < deposit(10р)' },
  "PENSION — Required Deposit (Spend Mode) inflation increases required deposit (inflated target spend)":
    { id:'TC-CAT-21', desc:'Інфляція збільшує необхідний внесок', detail:'deposit(i=5%) > deposit(i=0)' },
  "PENSION — Required Deposit (Spend Mode) returns 0 when yearsLeft is 0":
    { id:'TC-CAT-22', desc:'При 0 років → внесок = 0', detail:'calcRequiredDeposit(10000, 0.10, 0) === 0' },

  "E2E — Registration → Login → Session full register and session restore flow":
    { id:'TC-E2E-01', desc:'Повний цикл реєстрації та відновлення сесії', detail:'user_session.email === oksana@test.com, role === Адмін' },
  "E2E — Registration → Login → Session logout clears session but not account data":
    { id:'TC-E2E-02', desc:'Вихід очищує сесію, але не дані', detail:'user_session = null; fin_history_local залишається' },
  "E2E — Transaction Flow: Income → Balance → Expense complete income + expense cycle updates balance correctly":
    { id:'TC-E2E-03', desc:'Повний цикл дохід + витрати оновлює баланс', detail:'0 + 5000 - 1200 - 300 + 2000 = 5 500' },
  "E2E — Transaction Flow: Income → Balance → Expense history contains all transactions in reverse order":
    { id:'TC-E2E-04', desc:'Історія у зворотному порядку', detail:'history[0].id = "t2", history[1].id = "t1"' },
  "E2E — Multi-Account Isolation transactions on different accounts do not affect each other":
    { id:'TC-E2E-05', desc:'Транзакції ізольовані між рахунками', detail:'Mono: 8000, Cash: 6000 — незалежно' },
  "E2E — Multi-Account Isolation account creation adds to list without removing others":
    { id:'TC-E2E-06', desc:'Новий рахунок не видаляє існуючі', detail:'accounts.length === 2; contains Mono і Cash' },
  "E2E — Filter Logic (History Page) filter by participant returns only their transactions":
    { id:'TC-E2E-07', desc:'Фільтр за учасником', detail:'filter(Oksana) → 2 записи, всі userName === Oksana' },
  "E2E — Filter Logic (History Page) filter by type returns only matching type":
    { id:'TC-E2E-08', desc:'Фільтр за типом операції', detail:'filter(Витрата) → 2 записи' },
  "E2E — Filter Logic (History Page) filter by date range excludes older transactions":
    { id:'TC-E2E-09', desc:'Фільтр за датою виключає старі записи', detail:'30-денний фільтр: 2 записи (id=3 є 60-денним)' },
  "E2E — Filter Logic (History Page) filter by category returns correct subset":
    { id:'TC-E2E-10', desc:'Фільтр за категорією', detail:'filter(Продукти) → 1 запис, id="1"' },
  "E2E — Filter Logic (History Page) filter by account returns only that account":
    { id:'TC-E2E-11', desc:'Фільтр за рахунком', detail:'filter(Mono) → 2 записи' },
  "E2E — Filter Logic (History Page) combined filters narrow down correctly":
    { id:'TC-E2E-12', desc:'Комбіновані фільтри', detail:'Витрата + Oksana → 2 записи' },
  "E2E — Backup & Restore Integrity backup captures all three data stores":
    { id:'TC-E2E-13', desc:'Бекап охоплює всі три сховища', detail:'history, accounts, users непорожні; version = "2.5"' },
  "E2E — Backup & Restore Integrity restore from backup overwrites localStorage correctly":
    { id:'TC-E2E-14', desc:'Відновлення з бекапу перезаписує сховище', detail:'restored[0].id = "restored_1"; currentBalance = 10000' },
  "E2E — Backup & Restore Integrity backup JSON is serializable and parseable":
    { id:'TC-E2E-15', desc:'JSON бекапу серіалізується і парситься', detail:'JSON.parse(JSON.stringify(backup)) не кидає помилок' },
  "E2E — Edge Cases handles empty localStorage gracefully":
    { id:'TC-E2E-16', desc:'Порожній localStorage — без помилок', detail:'history = [], accounts = []' },
  "E2E — Edge Cases transaction with amount 0 does not corrupt balance":
    { id:'TC-E2E-17', desc:'Транзакція з сумою 0 не псує баланс', detail:'5000 + 0 = 5000' },
  "E2E — Edge Cases very large transaction amount is stored correctly":
    { id:'TC-E2E-18', desc:'Дуже велика сума зберігається коректно', detail:'amount = 999999999 → currentBalance = 999999999' },
  "E2E — Edge Cases account with negative balance is stored without error":
    { id:'TC-E2E-19', desc:'Vidyemnyi баланс зберігається без помилки', detail:'100 - 500 = -400' },
};

console.log('\n🧪  Running FinMonitor test suite...\n');
let exitCode = 0;
try {
  execSync(`npx jest --json --outputFile=jest-results.json --no-coverage --forceExit 2>&1`,
    { encoding: 'utf-8', cwd: __dirname });
} catch (e) { exitCode = e.status || 1; }

let results;
try { results = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')); }
catch { console.error('Could not read jest-results.json'); process.exit(1); }

const totalTests = results.numTotalTests;
const passed     = results.numPassedTests;
const failed     = results.numFailedTests;
const skipped    = results.numPendingTests;
const duration   = ((results.testResults||[]).reduce((s,r)=>s+((r.endTime||0)-(r.startTime||0)),0)/1000).toFixed(2);
const passRate   = totalTests > 0 ? Math.round(passed/totalTests*100) : 0;
const runDate    = new Date().toLocaleString('uk-UA');
const overallOK  = failed === 0;

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>'); }

const allTests = [];
for (const suite of (results.testResults||[])) {
  const fname = path.basename(suite.name||suite.testFilePath||'');
  const smeta = SUITE_META[fname] || { id:'OTHER', label:fname, icon:'🧪', desc:'' };
  for (const t of (suite.assertionResults||[])) {
    const tmeta  = TC_META[t.fullName] || TC_META[t.title] || {};
    const status = t.status==='passed'?'pass': t.status==='failed'?'fail':'skip';
    allTests.push({ smeta, status, t, tmeta, fname });
  }
}

const categories = Object.values(SUITE_META);
const catStats = {};
for (const cat of categories) {
  const ts = allTests.filter(x=>x.smeta.id===cat.id);
  catStats[cat.id] = { total:ts.length, passed:ts.filter(x=>x.status==='pass').length, failed:ts.filter(x=>x.status==='fail').length };
}

function buildCards(tests) {
  let ctr = {};
  return tests.map(({ smeta, status, t, tmeta }) => {
    ctr[smeta.id] = (ctr[smeta.id]||0)+1;
    const idx    = String(ctr[smeta.id]).padStart(2,'0');
    const tcId   = tmeta.id   || `TC-${smeta.id}-${idx}`;
    const desc   = esc(tmeta.desc   || t.title || '');
    const detail = esc(tmeta.detail || '');
    const name   = esc(t.title || t.fullName || '');
    const dur    = t.duration ? `${t.duration}ms` : '—';
    const errHtml = (t.failureMessages||[]).length
      ? `<div class="tc-error">${t.failureMessages.map(m=>esc(m)).join('<br>')}</div>` : '';
    const statusLabel = status==='pass'?'✓ УСПІШНО': status==='fail'?'✗ ПРОВАЛЕНО':'○ ПРОПУЩЕНО';
    const statusFull  = status==='pass'?'✓ Тест пройдено': status==='fail'?'✗ Тест провалено':'○ Пропущено';

    return `
<div class="tc-card ${status}" data-cat="${smeta.id}" data-status="${status}">
  <div class="tc-card-header" onclick="toggleCard(this)">
    <div class="tc-left">
      <span class="tc-id">${esc(tcId)}</span>
      <div class="tc-titles">
        <div class="tc-name">${name}</div>
        <div class="tc-desc">${desc}</div>
      </div>
    </div>
    <div class="tc-right">
      <span class="tc-dur">${dur}</span>
      <span class="status-badge ${status}">${statusLabel}</span>
      <span class="tc-chevron">›</span>
    </div>
  </div>
  <div class="tc-body">
    <div class="tc-grid">
      <div class="tc-cell">
        <div class="tc-cell-label">Категорія</div>
        <div class="tc-cell-val">${esc(smeta.icon)} ${esc(smeta.label)}</div>
      </div>
      <div class="tc-cell tc-cell-wide">
        <div class="tc-cell-label">Деталі перевірки</div>
        <div class="tc-cell-val detail">${detail}</div>
      </div>
      <div class="tc-cell">
        <div class="tc-cell-label">Статус</div>
        <div class="tc-cell-val"><span class="status-badge ${status}">${statusFull}</span></div>
      </div>
      <div class="tc-cell">
        <div class="tc-cell-label">Час виконання</div>
        <div class="tc-cell-val">${dur}</div>
      </div>
    </div>
    ${errHtml}
  </div>
</div>`;
  }).join('');
}

const allCards = buildCards(allTests);

const tabBtns = [
  `<button class="tab-btn active" onclick="filterTests('ALL',this)">ВСІ <span class="tab-count">${totalTests}</span></button>`,
  `<button class="tab-btn pass-tab" onclick="filterTests('PASS',this)">✓ ПРОЙШЛИ <span class="tab-count">${passed}</span></button>`,
  `<button class="tab-btn fail-tab" onclick="filterTests('FAIL',this)">✗ ПРОВАЛИЛИСЬ <span class="tab-count">${failed}</span></button>`,
  ...categories.map(c=>`<button class="tab-btn cat-tab" onclick="filterTests('${c.id}',this)">${c.icon} ${c.label.toUpperCase()} <span class="tab-count">${catStats[c.id]?.total||0}</span></button>`)
].join('');

const catSummaries = categories.map(cat=>{
  const st  = catStats[cat.id]||{total:0,passed:0,failed:0};
  const pct = st.total>0 ? Math.round(st.passed/st.total*100) : 0;
  const bar = st.failed>0 ? '#ef4444' : '#10b981';
  return `
<div class="cat-summary" data-cat-id="${cat.id}" onclick="filterBySummary(this.dataset.catId,this)" role="button" tabindex="0">
  <div class="cat-sum-left">
    <span class="cat-icon">${cat.icon}</span>
    <div>
      <div class="cat-label">${esc(cat.label)}</div>
      <div class="cat-subdesc">${esc(cat.desc)}</div>
    </div>
  </div>
  <div class="cat-sum-right">
    <div class="cat-bar-group">
      <div class="cat-bar-wrap">
        <div class="cat-bar-fill" data-pct="${pct}" data-color="${bar}" style="width:0%;background:${bar};transition:width 0.9s ease"></div>
      </div>
      <div class="cat-bar-labels">
        <span class="cat-stat">${st.passed} пройшло</span>
        <span class="cat-fail-stat" style="display:${st.failed>0?'inline':'none'}">${st.failed} провалено</span>
        <span class="cat-pct">${pct}%</span>
      </div>
    </div>
    <span class="cat-arrow">›</span>
  </div>
</div>`;
}).join('');

const suiteMetaJS = JSON.stringify(Object.fromEntries(categories.map(c=>[c.id,c])));

const tcDataByCategory = {};
let _tcCtr = {};
for (const test of allTests) {
  const catId = test.smeta.id;
  if (!tcDataByCategory[catId]) tcDataByCategory[catId] = [];
  _tcCtr[catId] = (_tcCtr[catId] || 0) + 1;
  const idx   = String(_tcCtr[catId]).padStart(2, '0');
  const tcId  = test.tmeta.id || ('TC-' + catId + '-' + idx);
  tcDataByCategory[catId].push({
    id:     tcId,
    name:   test.t.title || '',
    desc:   test.tmeta.desc || test.t.title || '',
    status: test.status,
  });
}
const tcDataJS = JSON.stringify(tcDataByCategory);

const html = `<!DOCTYPE html>
<html lang="uk"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FinMonitor — Тест-кейси</title>
<style>
:root{
  --pass:#10b981;--pass-bg:#ecfdf5;--pass-bd:#a7f3d0;
  --fail:#ef4444;--fail-bg:#fef2f2;--fail-bd:#fecaca;
  --skip:#f59e0b;--skip-bg:#fffbeb;--skip-bd:#fde68a;
  --gray:#64748b;--light:#f1f5f9;--card:#fff;
  --r:16px;--font:'Segoe UI',system-ui,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--light);color:#0f172a}

.hdr{background:linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#f97316 100%);padding:38px 48px 34px;color:#fff}
.hdr-top{display:flex;align-items:center;gap:16px;margin-bottom:22px}
.logo{width:50px;height:50px;background:rgba(255,255,255,.15);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.hdr-title{font-size:28px;font-weight:900;letter-spacing:-.03em}
.hdr-title span{color:#fb923c}
.hdr-sub{font-size:11px;opacity:.5;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-top:4px}
.hdr-stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}
.stat-pill{background:rgba(255,255,255,.11);border:1.5px solid rgba(255,255,255,.17);border-radius:50px;padding:9px 20px;text-align:center;min-width:80px}
.stat-pill .val{font-size:24px;font-weight:900;line-height:1}
.stat-pill .lbl{font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
.stat-pill.pass .val{color:#6ee7b7}
.stat-pill.fail .val{color:#fca5a5}
.prog-lbl{display:flex;justify-content:space-between;font-size:11px;opacity:.55;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px}
.prog-track{background:rgba(255,255,255,.12);border-radius:99px;height:9px;overflow:hidden}
.prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#10b981,#6ee7b7);width:${passRate}%}

.body{max-width:1080px;margin:0 auto;padding:32px 28px 56px}

.cat-summaries{display:flex;flex-direction:column;gap:9px;margin-bottom:28px}
.cat-summary{background:var(--card);border-radius:13px;padding:13px 18px;display:flex;align-items:center;justify-content:space-between;border:1.5px solid #e2e8f0;gap:12px;cursor:pointer;transition:all .18s}
.cat-summary:hover{border-color:#94a3b8;box-shadow:0 2px 12px rgba(0,0,0,.07);transform:translateY(-1px)}
.cat-summary.active-cat{border-color:#4338ca;background:#f5f3ff}
.cat-sum-left{display:flex;align-items:center;gap:12px}
.cat-icon{font-size:20px;flex-shrink:0}
.cat-label{font-size:13px;font-weight:800}
.cat-subdesc{font-size:11px;color:var(--gray);margin-top:2px}
.cat-sum-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.cat-bar-group{display:flex;flex-direction:column;gap:4px;min-width:160px}
.cat-bar-wrap{width:100%;height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden}
.cat-bar-fill{height:100%;border-radius:99px}
.cat-bar-labels{display:flex;align-items:center;gap:8px}
.cat-stat{font-size:11px;font-weight:800;color:var(--pass)}
.cat-fail-stat{font-size:11px;font-weight:800;color:var(--fail)}
.cat-pct{font-size:11px;font-weight:900;color:var(--gray);margin-left:auto}
.cat-arrow{font-size:18px;color:#94a3b8;transition:transform .2s;line-height:1}
.cat-summary.active-cat .cat-arrow{transform:rotate(90deg);color:#4338ca}

.tabs{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:20px}
.tab-btn{padding:7px 15px;border-radius:50px;border:1.5px solid #e2e8f0;background:var(--card);font-family:var(--font);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;cursor:pointer;transition:all .15s;color:var(--gray);display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.tab-btn:hover{border-color:#94a3b8;color:#334155}
.tab-btn.active{background:#1e1b4b;border-color:#1e1b4b;color:#fff}
.tab-btn.pass-tab.active{background:var(--pass);border-color:var(--pass);color:#fff}
.tab-btn.fail-tab.active{background:var(--fail);border-color:var(--fail);color:#fff}
.tab-count{background:rgba(255,255,255,.22);border-radius:99px;padding:1px 7px;font-size:10px;font-weight:900}
.tab-btn:not(.active) .tab-count{background:#f1f5f9;color:#475569}

#active-cat-bar{display:none;margin-bottom:16px;background:var(--card);border-radius:13px;border:1.5px solid #4338ca;overflow:hidden}
.acb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;gap:12px;border-bottom:1.5px solid #e2e8f0}
.acb-left{display:flex;align-items:center;gap:12px}
.acb-icon{font-size:22px}
.acb-name{font-size:15px;font-weight:900}
.acb-sub{font-size:11px;color:var(--gray);margin-top:2px}
.acb-stats{display:flex;gap:8px;flex-shrink:0}
.acb-stat{padding:4px 12px;border-radius:50px;font-size:11px;font-weight:900}
.acb-stat.pass{background:var(--pass-bg);color:var(--pass);border:1.5px solid var(--pass-bd)}
.acb-stat.fail{background:var(--fail-bg);color:var(--fail);border:1.5px solid var(--fail-bd)}
.acb-stat.total{background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0}
.acb-tc-list{padding:12px 14px;display:flex;flex-direction:column;gap:7px;max-height:none}
.acb-tc-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background:#f8fafc;cursor:pointer;transition:background .15s;border:1.5px solid transparent}
.acb-tc-row:hover{background:#f1f5f9;border-color:#e2e8f0}
.acb-tc-row.fail{background:#fff8f8;border-color:var(--fail-bd)}
.acb-tc-row .row-id{font-size:10px;font-weight:900;color:#64748b;background:#fff;border-radius:6px;padding:2px 7px;border:1.5px solid #e2e8f0;white-space:nowrap;flex-shrink:0}
.acb-tc-row .row-name{font-size:12px;font-weight:700;color:#1e293b;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acb-tc-row .row-desc{font-size:11px;color:#64748b;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acb-tc-row .row-badge{flex-shrink:0}

.tc-cards{display:flex;flex-direction:column;gap:9px}
.tc-card{background:var(--card);border-radius:var(--r);border:1.5px solid #e2e8f0;overflow:hidden;transition:box-shadow .15s}
.tc-card:hover{box-shadow:0 3px 16px rgba(0,0,0,.07)}
.tc-card.fail{border-color:var(--fail-bd)}
.tc-card.pass{border-color:#d1fae5}
.tc-card.hidden{display:none}

.tc-card-header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;cursor:pointer;user-select:none;gap:10px}
.tc-card.fail .tc-card-header{background:#fff8f8}
.tc-card-header:hover{background:#f8fafc}

.tc-left{display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0}
.tc-id{font-size:10px;font-weight:900;color:#64748b;background:#f1f5f9;border-radius:7px;padding:2px 7px;white-space:nowrap;letter-spacing:.05em;margin-top:1px;flex-shrink:0}
.tc-titles{min-width:0}
.tc-name{font-size:13px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tc-desc{font-size:11px;color:#64748b;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.tc-right{display:flex;align-items:center;gap:9px;flex-shrink:0}
.tc-dur{font-size:11px;color:#94a3b8}
.tc-chevron{font-size:18px;color:#94a3b8;transition:transform .2s;line-height:1}
.tc-card.open .tc-chevron{transform:rotate(90deg)}

.status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 11px;border-radius:50px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}
.status-badge.pass{background:var(--pass-bg);color:var(--pass);border:1.5px solid var(--pass-bd)}
.status-badge.fail{background:var(--fail-bg);color:var(--fail);border:1.5px solid var(--fail-bd)}
.status-badge.skip{background:var(--skip-bg);color:var(--skip);border:1.5px solid var(--skip-bd)}

.tc-body{display:none;border-top:1.5px solid #f1f5f9;padding:14px 16px}
.tc-card.open .tc-body{display:block}
.tc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:10px}
.tc-cell{background:#f8fafc;border-radius:11px;padding:11px 13px}
.tc-cell-wide{grid-column:span 2}
.tc-cell-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:4px}
.tc-cell-val{font-size:12px;font-weight:700;color:#334155}
.tc-cell-val.detail{font-size:11px;font-weight:500;color:#475569;line-height:1.5}
.tc-error{background:#1e1b4b;color:#fca5a5;font-family:monospace;font-size:11px;padding:11px 15px;border-radius:11px;white-space:pre-wrap;line-height:1.55;margin-top:8px}

.footer{text-align:center;padding:28px;font-size:12px;color:#94a3b8}

@media print{
  .tc-body{display:block!important}
  .tc-card{page-break-inside:avoid}
  .tabs,.cat-summaries{display:none}
}
@media(max-width:600px){
  .hdr{padding:24px 20px 20px}
  .body{padding:20px 14px 40px}
  .tc-card-header{flex-direction:column;align-items:flex-start;gap:8px}
  .tc-right{width:100%;justify-content:space-between}
  .tc-cell-wide{grid-column:span 1}
}
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-top">
    <div class="logo">📊</div>
    <div>
      <div class="hdr-title">Тест<span>-кейси</span></div>
      <div class="hdr-sub">FinMonitor · Звіт тестування · ${new Date().getFullYear()}</div>
    </div>
  </div>
  <div class="hdr-stats">
    <div class="stat-pill"><div class="val">${totalTests}</div><div class="lbl">Всього</div></div>
    <div class="stat-pill pass"><div class="val">${passed}</div><div class="lbl">Пройшли</div></div>
    <div class="stat-pill fail"><div class="val">${failed}</div><div class="lbl">Провалились</div></div>
    <div class="stat-pill"><div class="val">${duration}s</div><div class="lbl">Час</div></div>
    <div class="stat-pill"><div class="val">${passRate}%</div><div class="lbl">Покриття</div></div>
  </div>
  <div class="prog-lbl"><span>ЗАГАЛЬНЕ ПОКРИТТЯ</span><span>${passRate}%</span></div>
  <div class="prog-track"><div class="prog-fill"></div></div>
</div>

<div class="body">
  <div class="cat-summaries">${catSummaries}</div>
  <div class="tabs">${tabBtns}</div>
  <div id="active-cat-bar">
    <div class="acb-header">
      <div class="acb-left">
        <span class="acb-icon" id="acb-icon"></span>
        <div>
          <div class="acb-name" id="acb-name"></div>
          <div class="acb-sub" id="acb-sub"></div>
        </div>
      </div>
      <div class="acb-stats" id="acb-stats"></div>
    </div>
    <div class="acb-tc-list" id="acb-tc-list"></div>
  </div>
  <div class="tc-cards" id="tc-cards">${allCards}</div>
</div>

<div class="footer">FinMonitor Test Suite · Згенеровано автоматично · ${runDate}</div>

<script>
const SMETA = ${suiteMetaJS};
const TC_DATA = ${tcDataJS};

function toggleCard(h){ h.closest('.tc-card').classList.toggle('open'); }

function applyFilter(f) {
  document.querySelectorAll('.tc-card').forEach(function(card) {
    var cat = card.dataset.cat, st = card.dataset.status;
    var show = f === 'ALL'
      || (f === 'PASS' && st === 'pass')
      || (f === 'FAIL' && st === 'fail')
      || cat === f;
    card.classList.toggle('hidden', !show);
  });
}

function showCatPanel(catId) {
  var bar = document.getElementById('active-cat-bar');
  if (!catId || !SMETA[catId]) { bar.style.display = 'none'; return; }
  var m    = SMETA[catId];
  var tcs  = TC_DATA[catId] || [];
  var nPass = tcs.filter(function(t){ return t.status === 'pass'; }).length;
  var nFail = tcs.filter(function(t){ return t.status === 'fail'; }).length;

  document.getElementById('acb-icon').textContent = m.icon;
  document.getElementById('acb-name').textContent = m.label;
  document.getElementById('acb-sub').textContent  = m.desc;
  document.getElementById('acb-stats').innerHTML  =
    '<span class="acb-stat total">' + tcs.length + ' тест-кейсів</span>' +
    '<span class="acb-stat pass">\u2713 ' + nPass + ' пройшло</span>' +
    (nFail > 0 ? '<span class="acb-stat fail">\u2717 ' + nFail + ' провалено</span>' : '');

  var html = '';
  tcs.forEach(function(t) {
    var lbl = t.status === 'pass' ? '\u2713 УСПІШНО' : '\u2717 ПРОВАЛЕНО';
    html +=
      '<div class="acb-tc-row ' + t.status + '" data-tcid="' + t.id + '">' +
        '<span class="row-id">'    + t.id   + '</span>' +
        '<span class="row-name">'  + t.name + '</span>' +
        '<span class="row-desc">'  + t.desc + '</span>' +
        '<span class="row-badge"><span class="status-badge ' + t.status + '">' + lbl + '</span></span>' +
      '</div>';
  });
  document.getElementById('acb-tc-list').innerHTML = html;

  document.querySelectorAll('.acb-tc-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var tcid = row.dataset.tcid;
      var card = null;
      document.querySelectorAll('.tc-card').forEach(function(c) {
        var el = c.querySelector('.tc-id');
        if (el && el.textContent.trim() === tcid) card = c;
      });
      if (!card) return;
      card.classList.remove('hidden');
      card.classList.add('open');
      setTimeout(function(){ card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
    });
  });

  bar.style.display = 'block';
}

function filterTests(f, btn) {
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  applyFilter(f);
  document.querySelectorAll('.cat-summary').forEach(function(s){
    s.classList.toggle('active-cat', s.dataset.catId === f);
  });
  showCatPanel(SMETA[f] ? f : null);
}

function filterBySummary(catId, summaryEl) {
  if (summaryEl.classList.contains('active-cat')) {
    filterTests('ALL', document.querySelector('.tab-btn'));
    return;
  }
  applyFilter(catId);
  document.querySelectorAll('.cat-summary').forEach(function(s){
    s.classList.toggle('active-cat', s.dataset.catId === catId);
  });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  showCatPanel(catId);
  setTimeout(function(){ document.getElementById('tc-cards').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}

window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.cat-bar-fill[data-pct]').forEach(function(bar) {
    var pct   = bar.getAttribute('data-pct');
    var color = bar.getAttribute('data-color');
    bar.style.background   = color;
    bar.style.width        = '0%';
    bar.style.transition   = 'width 0.85s ease';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ bar.style.width = pct + '%'; });
    });
  });
  document.querySelectorAll('.tc-card.fail').forEach(function(c){ c.classList.add('open'); });
});
</script>
</body></html>`;

fs.writeFileSync(REPORT_FILE, html, 'utf-8');

console.log(`\n${'─'.repeat(58)}`);
console.log(`  ${overallOK?'✅':'❌'}  ${overallOK?'PASSED':'FAILED'}  |  ${passed}/${totalTests} passed  |  ${duration}s`);
console.log(`${'─'.repeat(58)}`);
console.log(`\n📄  Report: ${REPORT_FILE}\n`);
process.exit(exitCode);