import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import NeuralCopilot from './components/NeuralCopilot';
import PolicymakerStudio from './pages/PolicymakerStudio';
import MultichannelIngestion from './pages/MultichannelIngestion';
import LandingPage from './pages/LandingPage';
import './App.css';

function AppContent() {
  const { theme } = useTheme();

  return (
    <div className="app" data-theme={theme}>
      <Header />
      <main className="main-content">
        <Routes>
          {/* Default Flagship Route: Policymaker Decision Studio */}
          <Route path="/" element={<PolicymakerStudio />} />
          <Route path="/policymaker" element={<PolicymakerStudio />} />
          
          {/* Multichannel Ingestion Feed */}
          <Route path="/ingestion" element={<MultichannelIngestion />} />
          <Route path="/citizen" element={<MultichannelIngestion />} />
          
          {/* AI/ML Multi-Dataset Analytics Lab */}
          <Route path="/analytics" element={<PolicymakerStudio initialTab="ml_analytics" />} />
          
          {/* Executive Overview */}
          <Route path="/executive" element={<LandingPage />} />
        </Routes>
      </main>
      <Footer />
      <NeuralCopilot />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
