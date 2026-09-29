import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import LandingPage from './pages/LandingPage'
import CitizenPortal from './pages/CitizenPortal'
import PolicymakerStudio from './pages/PolicymakerStudio'
import './App.css'

function App() {
  const location = useLocation();
  const isPolicymaker = location.pathname.startsWith('/policymaker');

  return (
    <div className="app" data-theme={isPolicymaker ? 'dark' : 'light'}>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen" element={<CitizenPortal />} />
          <Route path="/policymaker" element={<PolicymakerStudio />} />
        </Routes>
      </main>
    </div>
  );
}

export default App
