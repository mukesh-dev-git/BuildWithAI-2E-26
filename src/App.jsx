import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardProvider } from './dashboard/DashboardContext';
import DashboardLayout from './dashboard/DashboardLayout';
import Overview from './dashboard/pages/Overview';
import DemandMap from './dashboard/pages/DemandMap';
import Recommendations from './dashboard/pages/Recommendations';
import Explorer from './dashboard/pages/Explorer';
import CountryCompare from './dashboard/pages/CountryCompare';
import Investment from './dashboard/pages/Investment';
import Intake from './dashboard/pages/Intake';
import Sources from './dashboard/pages/Sources';

// Original India-only prototype, kept under /legacy and loaded only when visited
const LegacyApp = lazy(() => import('./LegacyApp'));

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<DashboardProvider><DashboardLayout /></DashboardProvider>}>
          <Route index element={<Overview />} />
          <Route path="map" element={<DemandMap />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="countries" element={<CountryCompare />} />
          <Route path="investment" element={<Investment />} />
          <Route path="intake" element={<Intake />} />
          <Route path="sources" element={<Sources />} />
        </Route>
        <Route path="legacy/*" element={<Suspense fallback={null}><LegacyApp /></Suspense>} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
