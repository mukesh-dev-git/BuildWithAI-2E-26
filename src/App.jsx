import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardProvider } from './dashboard/DashboardContext';
import DashboardLayout from './dashboard/DashboardLayout';
import ExecutiveOverview from './dashboard/pages/ExecutiveOverview';
import Cooperation from './dashboard/pages/Cooperation';
import DemandIntelligenceMap from './dashboard/pages/DemandIntelligenceMap';
import RegionNeedMap from './dashboard/pages/RegionNeedMap';
import RecommendationsHub from './dashboard/pages/RecommendationsHub';
import RegionalPriorities from './dashboard/pages/RegionalPriorities';
import Explorer from './dashboard/pages/Explorer';
import CountryCompare from './dashboard/pages/CountryCompare';
import Investment from './dashboard/pages/Investment';
import Intake from './dashboard/pages/Intake';
import Sources from './dashboard/pages/Sources';
import GoalTracker from './dashboard/pages/GoalTracker';
import CountryGoal from './dashboard/pages/CountryGoal';

// Original India-only prototype, kept under /legacy and loaded only when visited
const LegacyApp = lazy(() => import('./LegacyApp'));

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<DashboardProvider><DashboardLayout /></DashboardProvider>}>
          <Route index element={<ExecutiveOverview />} />
          <Route path="map" element={<DemandIntelligenceMap />} />
          <Route path="map/:iso3/:theme" element={<RegionNeedMap />} />
          <Route path="recommendations" element={<RecommendationsHub />} />
          <Route path="recommendations/regional" element={<RegionalPriorities />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="countries" element={<CountryCompare />} />
          <Route path="cooperation" element={<Cooperation />} />
          <Route path="investment" element={<Investment />} />
          <Route path="intake" element={<Intake />} />
          <Route path="sources" element={<Sources />} />
          <Route path="goals" element={<GoalTracker />} />
          <Route path="goals/:iso3/:goal" element={<CountryGoal />} />
        </Route>
        <Route path="legacy/*" element={<Suspense fallback={null}><LegacyApp /></Suspense>} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
