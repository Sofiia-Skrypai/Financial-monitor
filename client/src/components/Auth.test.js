import { render, screen } from '@testing-library/react';
import Auth from './Auth';

beforeEach(() => localStorage.clear());

test('екран автентифікації рендериться з полями email і пароля', () => {
  render(<Auth onLogin={() => {}} />);
  expect(screen.getAllByPlaceholderText(/пароль/i).length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText(/email/i).length).toBeGreaterThan(0);
});

test('кнопка демо-режиму завантажує тестові дані та виконує вхід', () => {
  const onLogin = jest.fn();
  render(<Auth onLogin={onLogin} />);
  screen.getByTestId('demo-login').click();
  expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: 'Адмін' }));
  const history = JSON.parse(localStorage.getItem('fin_history_local'));
  expect(history.length).toBeGreaterThan(100);
});
