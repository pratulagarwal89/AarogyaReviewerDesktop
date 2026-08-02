import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerificationDashboardScreen from '../app/screens/VerificationDashboardScreen';
import VerificationCaseScreen from '../app/screens/VerificationCaseScreen';

/** Render the verification routes inside a MemoryRouter so navigation between the
 * dashboard and a case works exactly as in the app. */
export function renderVerificationApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/verification" element={<VerificationDashboardScreen />} />
        <Route path="/admin/verification/:caseId" element={<VerificationCaseScreen />} />
        <Route path="/admin/reports/:documentId" element={<div>Document review stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Render an arbitrary element inside a MemoryRouter (for standalone components). */
export function renderWithRouter(ui: ReactElement, initialEntry = '/') {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>);
}
