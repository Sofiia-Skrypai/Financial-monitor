require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/finance_monitor_db";
const PORT = process.env.PORT || 5000;

const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }));

const Account = mongoose.model('Account', new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  color: { type: String, default: '#4f46e5' },
  currency: { type: String, default: 'UAH' },
  excludeFromStats: { type: Boolean, default: false }
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: String,
  amount: Number,
  category: String,
  type: { type: String, enum: ['Дохід', 'Витрата', 'income', 'expense'] },
  account: String 
}));

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`✅ MongoDB підключено: ${MONGO_URI}`);
    
    const count = await Account.countDocuments();
    if (count === 0) {
      console.log("💡 База порожня. Створюю тестовий рахунок...");
      await new Account({
        name: "Картка Приват",
        balance: 15000,
        color: "#4f46e5",
        currency: "UAH"
      }).save();
      console.log("✨ Тестовий рахунок створено успішно!");
    }
  })
  .catch(err => console.error("❌ Помилка підключення:", err.message));


app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find();
    console.log(`📡 Надіслано рахунків: ${accounts.length}`);
    res.json(accounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/accounts', async (req, res) => {
  try {
    console.log("📥 Отримано новий рахунок:", req.body);
    const newAcc = new Account(req.body);
    await newAcc.save();
    res.status(201).json(newAcc);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const updated = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: "Видалено" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const n = new Transaction(req.body);
    await n.save();
    res.status(201).json(n);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер працює на порту ${PORT}`);
  console.log(`🔗 Перевірка: http://localhost:${PORT}/api/accounts`);
});