import { useState } from 'react';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import useSessionStore from './store/session';
import './App.css';

/**
 * Main Application Component
 * Handles routing between Login and MainLayout
 */
function App() {
  const { isAuthenticated } = useSessionStore();
  const [showDashboard, setShowDashboard] = useState(false);

  const handleLoginSuccess = () => {
    setShowDashboard(true);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated || !showDashboard) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main application layout
  return <MainLayout />;
}

export default App;
