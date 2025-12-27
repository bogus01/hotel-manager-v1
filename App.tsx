
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import Reservations from './pages/Reservations';
import Clients from './pages/Clients';
import Billing from './pages/Billing';
import DailyPlanning from './pages/DailyPlanning';
import Settings from './pages/Settings';
import SettingsHotel from './pages/SettingsHotel';
import SettingsRooms from './pages/SettingsRooms';
import SettingsServices from './pages/SettingsServices';
import SettingsUsers from './pages/SettingsUsers';
import SettingsPayments from './pages/SettingsPayments';
import SettingsTaxes from './pages/SettingsTaxes';
import SettingsPlanning from './pages/SettingsPlanning';
import SettingsModulesColors from './pages/SettingsModulesColors';
import Reports from './pages/Reports';
import ReportsDailyCash from './pages/ReportsDailyCash';
import ReportsSalesJournal from './pages/ReportsSalesJournal';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/daily-planning" element={<DailyPlanning />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/daily-cash" element={<ReportsDailyCash />} />
        <Route path="/reports/sales-journal" element={<ReportsSalesJournal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/hotel" element={<SettingsHotel />} />
        <Route path="/settings/rooms" element={<SettingsRooms />} />
        <Route path="/settings/services" element={<SettingsServices />} />
        <Route path="/settings/users" element={<SettingsUsers />} />
        <Route path="/settings/payments" element={<SettingsPayments />} />
        <Route path="/settings/taxes" element={<SettingsTaxes />} />
        <Route path="/settings/planning" element={<SettingsPlanning />} />
        <Route path="/settings/modules-colors" element={<SettingsModulesColors />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
