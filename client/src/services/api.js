import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; 
const IS_OFFLINE_MODE = true;
export const apiService = {
  
  getHistory: async () => {
    if (IS_OFFLINE_MODE) {
      return JSON.parse(localStorage.getItem('fin_history_local') || '[]');
    } else {
      try {
        const response = await axios.get(`${API_URL}/transactions`);
        return response.data.map(item => ({
          ...item,
          id: item._id 
        }));
      } catch (error) {
        console.error("API Error (getHistory):", error);
        return [];
      }
    }
  },

  saveTransaction: async (newTransaction) => {
    if (IS_OFFLINE_MODE) {
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
            if (t.type === 'Дохід') return sum + Math.abs(amt);
            if (t.type === 'Витрата') return sum - Math.abs(amt);
            return sum;
          }, 0);

          return {
            ...acc,
            currentBalance: (parseFloat(acc.balance) || 0) + delta,
          };
        });
        localStorage.setItem('fin_accounts_local', JSON.stringify(updatedAccounts));
      }

      return updatedHistory;
    } else {
      try {
        const response = await axios.post(`${API_URL}/transactions`, newTransaction);
        return response.data;
      } catch (error) {
        console.error("API Error (saveTransaction):", error);
        throw error;
      }
    }
  },

  getAccounts: async () => {
    if (IS_OFFLINE_MODE) {
      return JSON.parse(localStorage.getItem('fin_accounts_local') || '[]');
    } else {
      try {
        const response = await axios.get(`${API_URL}/accounts`);
        return response.data.map(acc => ({
          ...acc,
          id: acc._id
        }));
      } catch (error) {
        console.error("API Error (getAccounts):", error);
        return [];
      }
    }
  },

  getUsers: async () => {
    if (IS_OFFLINE_MODE) {
      return JSON.parse(localStorage.getItem('fin_users_local') || '[]');
    } else {
      try {

        return JSON.parse(localStorage.getItem('fin_users_local') || '[]');
      } catch (error) {
        return JSON.parse(localStorage.getItem('fin_users_local') || '[]');
      }
    }
  },

  importFullBackup: async (jsonData) => {
    try {
      localStorage.setItem('fin_history_local', JSON.stringify(jsonData.history || []));
      localStorage.setItem('fin_accounts_local', JSON.stringify(jsonData.accounts || []));
      localStorage.setItem('fin_users_local', JSON.stringify(jsonData.users || []));
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
};