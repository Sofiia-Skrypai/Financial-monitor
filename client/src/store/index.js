import { configureStore } from '@reduxjs/toolkit';
import analysisReducer from './analysisSlice';

export const store = configureStore({
  reducer: {
    analysis: analysisReducer,
  },
});