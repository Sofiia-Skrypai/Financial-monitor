import { render, screen, fireEvent } from '@testing-library/react';
import MemberPicker from './MemberPicker';
import { loadDemo } from '../demo/demoData';

beforeEach(() => localStorage.clear());

test('для демо-акаунта показує підказку з кодом адміністратора і дозволяє увійти', () => {
  const session = loadDemo();
  const onPick = jest.fn();
  render(<MemberPicker accountUser={session} onPick={onPick} />);
  fireEvent.click(screen.getAllByText('Олександр')[0]);
  expect(screen.getByTestId('demo-code-hint')).toHaveTextContent('DEMO2026');
  fireEvent.click(screen.getByText('вставити'));
  fireEvent.click(screen.getByText('Підтвердити'));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ activeMemberId: null }));
});
