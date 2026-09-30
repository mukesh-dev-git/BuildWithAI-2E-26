import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import NeuralCopilot from './components/NeuralCopilot';
import PolicymakerStudio from './pages/PolicymakerStudio';
import MultichannelIngestion from './pages/MultichannelIngestion';
import LandingPage from './pages/LandingPage';
import './App.css';

// The original India-only prototype, served under /legacy
export default function LegacyApp() {
  const { theme } = useTheme();
  return (
    <div className="app" data-theme={theme}>
      <Header />
      <main className="main-content">
        <Routes>
          <Route index element={<PolicymakerStudio />} />
          <Route path="ingestion" element={<MultichannelIngestion />} />
          <Route path="analytics" element={<PolicymakerStudio initialTab="ml_analytics" />} />
          <Route path="executive" element={<LandingPage />} />
        </Routes>
      </main>
      <Footer />
      <NeuralCopilot />
    </div>
  );
}
