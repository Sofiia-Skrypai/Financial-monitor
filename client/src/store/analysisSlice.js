import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchFinancialData = createAsyncThunk(
  'analysis/fetchData',
  async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance`);
    return response.data;
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState: {
    balance: 0,
    income: 0,
    expenses: 0,
    status: 'idle',
  },
  reducers: {
    updateDataAfterImport: (state, action) => {
      state.balance = action.payload.balance;
      state.income = action.payload.income;
      state.expenses = action.payload.expenses;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFinancialData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.balance = action.payload.balance;
        state.income = action.payload.income;
        state.expenses = action.payload.expenses;
      });
  },
});

export const { updateDataAfterImport } = analysisSlice.actions;
export default analysisSlice.reducer;