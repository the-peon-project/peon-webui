import { useState, useEffect, useCallback } from 'react';
import '@/App.css';
import { 
  Home, Server, Users, Shield, LogOut, Sun, Moon, 
  AlertCircle, CheckCircle, XCircle, AlertTriangle, X
} from 'lucide-react';
import { api, BACKEND_URL } from './utils/api';
import { HomePage } from './HomePage';
import { ServersPage } from './ServersPage';
import { UsersPage } from './UsersPage';
import { AuditLogPanel, FeatureTogglesPanel, BackupRestorePanel, NotificationsPanel } from './components/admin';
import { LoadingSpinner } from './components/common/Loading';

// Toast/Alert Notification Component with Lucide icons
const ToastContainer = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgClass = (type) => {
    switch (type) {
      case 'error': return 'bg-red-900/90 border-red-500';
      case 'warning': return 'bg-yellow-900/90 border-yellow-500';
      case 'success': return 'bg-green-900/90 border-green-500';
      default: return 'bg-blue-900/90 border-blue-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm" data-testid="server-alerts">
      {alerts.map((alert, index) => (
        <div
          key={alert.id || index}
          className={`p-4 rounded-lg shadow-lg border animate-slide-in ${getBgClass(alert.type)}`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getIcon(alert.type)}
                <span className="font-bold text-sm">{alert.title}</span>
              </div>
              <p className="text-sm text-gray-300">{alert.message}</p>
              {alert.server && (
                <p className="text-xs text-gray-400 mt-1">{alert.server}</p>
              )}
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Admin Wizard Component
const AdminWizard = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [adminData, setAdminData] = useState({
    admin_username: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
  });
  const [orchData, setOrchData] = useState({
    orchestrator_name: '',
    orchestrator_url: '',
    orchestrator_api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (adminData.admin_password !== adminData.admin_password_confirm) {
      setError('Passwords do not match');
      return;
    }
    if (adminData.admin_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setStep(2);
  };

  const handleSkipOrchestrator = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/system/wizard', {
        admin_username: adminData.admin_username,
        admin_email: adminData.admin_email,
        admin_password: adminData.admin_password,
      });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onComplete(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initialize system');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/system/wizard', {
        admin_username: adminData.admin_username,
        admin_email: adminData.admin_email,
        admin_password: adminData.admin_password,
        orchestrator_name: orchData.orchestrator_name,
        orchestrator_url: orchData.orchestrator_url,
        orchestrator_api_key: orchData.orchestrator_api_key,
      });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onComplete(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initialize system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="medieval-border rounded-lg p-8 max-w-2xl w-full animate-fade-in">
        <div className="text-center mb-8">
          <img src="/peon-logo.png" alt="PEON" className="h-24 mx-auto mb-4" />
          <h1 className="warcraft-title text-4xl mb-2">Welcome to PEON</h1>
          <p className="warcraft-subtitle text-lg">Game Server Management</p>
          <p className="text-gray-400 mt-4">
            {step === 1 ? 'Create your admin account to begin' : 'Add your first orchestrator (optional)'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'gold-button' : 'bg-green-600 text-white'}`}>
              {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-sm">Admin Account</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-600"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'gold-button' : 'stone-texture border-2 border-gray-600'}`}>
              2
            </div>
            <span className="text-sm">Orchestrator</span>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleAdminSubmit} className="space-y-6">
            <div className="stone-texture p-6 rounded-lg">
              <h2 className="warcraft-subtitle text-2xl mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" /> System Administrator
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                This account will have full control over the system.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={adminData.admin_username}
                    onChange={(e) => setAdminData({ ...adminData, admin_username: e.target.value })}
                    required
                    className="w-full"
                    data-testid="wizard-username"
                    minLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    value={adminData.admin_email}
                    onChange={(e) => setAdminData({ ...adminData, admin_email: e.target.value })}
                    required
                    className="w-full"
                    data-testid="wizard-email"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={adminData.admin_password}
                    onChange={(e) => setAdminData({ ...adminData, admin_password: e.target.value })}
                    required
                    className="w-full"
                    data-testid="wizard-password"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={adminData.admin_password_confirm}
                    onChange={(e) => setAdminData({ ...adminData, admin_password_confirm: e.target.value })}
                    required
                    className="w-full"
                    data-testid="wizard-password-confirm"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 p-4 rounded flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="gold-button w-full py-3 rounded text-lg"
              data-testid="wizard-step1-next"
            >
              Continue to Setup
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCompleteSetup} className="space-y-6">
            <div className="stone-texture p-6 rounded-lg">
              <h2 className="warcraft-subtitle text-2xl mb-4 flex items-center gap-2">
                <Server className="w-6 h-6" /> First Orchestrator
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Connect to a PEON orchestrator to manage game servers.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Orchestrator Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Main Server"
                    value={orchData.orchestrator_name}
                    onChange={(e) => setOrchData({ ...orchData, orchestrator_name: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Base URL</label>
                  <input
                    type="url"
                    placeholder="http://server:5000"
                    value={orchData.orchestrator_url}
                    onChange={(e) => setOrchData({ ...orchData, orchestrator_url: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">API Key</label>
                  <input
                    type="text"
                    placeholder="Enter API key"
                    value={orchData.orchestrator_api_key}
                    onChange={(e) => setOrchData({ ...orchData, orchestrator_api_key: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 p-4 rounded flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipOrchestrator}
                disabled={loading}
                className="gray-button flex-1 py-3 rounded"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={loading || !orchData.orchestrator_name || !orchData.orchestrator_url || !orchData.orchestrator_api_key}
                className="gold-button flex-1 py-3 rounded"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Login Component (no default credentials)
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="medieval-border rounded-lg p-8 max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <img src="/peon-logo.png" alt="PEON" className="h-20 mx-auto mb-4" />
          <h1 className="warcraft-title text-3xl mb-2">PEON</h1>
          <p className="text-gray-400">Game Server Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full"
              data-testid="login-username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
              data-testid="login-password"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 p-3 rounded flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gold-button w-full py-3 rounded"
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [adminSubTab, setAdminSubTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(true);
  const [orchestrators, setOrchestrators] = useState([]);
  const [selectedOrch, setSelectedOrch] = useState(null);
  const [serversData, setServersData] = useState({});
  const [permissions, setPermissions] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [serverFilter, setServerFilter] = useState(null); // For filtering from home
  const [features, setFeatures] = useState({});

  const loadOrchestrators = useCallback(async () => {
    try {
      const response = await api.get('/orchestrators');
      setOrchestrators(response.data);
      if (response.data.length > 0 && !selectedOrch) {
        setSelectedOrch(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load orchestrators:', err);
    }
  }, [selectedOrch]);

  const loadPermissions = useCallback(async () => {
    try {
      const response = await api.get('/auth/permissions');
      setPermissions(response.data.permissions);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      const response = await api.get('/system/features');
      setFeatures(response.data);
    } catch (err) {
      console.error('Failed to load features:', err);
    }
  }, []);

  useEffect(() => {
    // Initial data loading
    const initializeData = async () => {
      await Promise.all([
        loadOrchestrators(),
        loadPermissions(),
        loadFeatures()
      ]);
    };
    initializeData();

    // Token refresh interval
    const refreshInterval = setInterval(async () => {
      try {
        const response = await api.post('/auth/refresh');
        localStorage.setItem('token', response.data.access_token);
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }, 20 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [loadOrchestrators, loadPermissions, loadFeatures]);

  // Load servers data
  useEffect(() => {
    if (orchestrators.length === 0) return;

    const loadServers = async () => {
      const newData = {};
      for (const orch of orchestrators) {
        try {
          const response = await api.get(`/proxy/${orch.id}/servers`);
          newData[orch.id] = { servers: response.data.servers, last_synced: response.data.last_synced };
        } catch (err) {
          newData[orch.id] = { error: err.message };
        }
      }
      setServersData(newData);
    };

    loadServers();
    const interval = setInterval(loadServers, 60000);
    return () => clearInterval(interval);
  }, [orchestrators]);

  // Theme toggle
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Handle server click from home (navigate to filtered servers)
  const handleServerClick = (serverUid, orchId) => {
    setServerFilter({ serverUid, orchId });
    setActiveTab('servers');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <ToastContainer alerts={alerts} onDismiss={dismissAlert} />

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src="/peon-logo.png" alt="PEON" className="h-12 w-auto" />
          <div>
            <h1 className="warcraft-title text-2xl md:text-3xl">PEON</h1>
            <p className="text-xs text-gray-400">Game Server Management</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="theme-switcher"
            aria-label="Toggle theme"
          >
            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.username}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>

          <button
            onClick={handleLogout}
            className="gray-button p-2 rounded"
            title="Logout"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('home'); setServerFilter(null); }}
          className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
            activeTab === 'home' ? 'gold-button' : 'gray-button'
          }`}
          data-testid="home-tab"
        >
          <Home className="w-4 h-4" /> Home
        </button>

        {permissions?.can_view_servers && (
          <button
            onClick={() => { setActiveTab('servers'); setServerFilter(null); }}
            className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
              activeTab === 'servers' ? 'gold-button' : 'gray-button'
            }`}
            data-testid="servers-tab"
          >
            <Server className="w-4 h-4" /> Servers
          </button>
        )}

        {permissions?.can_manage_users && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
              activeTab === 'users' ? 'gold-button' : 'gray-button'
            }`}
            data-testid="users-tab"
          >
            <Users className="w-4 h-4" /> Users
          </button>
        )}

        {user.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
              activeTab === 'admin' ? 'gold-button' : 'gray-button'
            }`}
            data-testid="admin-tab"
          >
            <Shield className="w-4 h-4" /> Admin
          </button>
        )}
      </nav>

      {/* Content Area */}
      <main className="medieval-border rounded-lg p-6 animate-fade-in">
        {activeTab === 'home' && (
          <HomePage
            user={user}
            orchestrators={orchestrators}
            selectedOrch={selectedOrch}
            serversData={serversData}
            permissions={permissions}
            features={features}
            onServerClick={handleServerClick}
          />
        )}

        {activeTab === 'servers' && permissions?.can_view_servers && (
          <ServersPage
            orchestrators={orchestrators}
            onOrchestratorsChange={loadOrchestrators}
            permissions={permissions}
            initialFilter={serverFilter}
          />
        )}

        {activeTab === 'users' && permissions?.can_manage_users && (
          <UsersPage orchestrators={orchestrators} />
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="space-y-6">
            <h2 className="warcraft-subtitle text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6" /> Admin Panel
            </h2>

            {/* Admin Sub-tabs */}
            <div className="flex flex-wrap gap-2 border-b border-purple-800/50 pb-4">
              {['overview', 'features', 'backup', 'notifications', 'audit'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAdminSubTab(tab)}
                  className={`px-4 py-2 rounded text-sm transition-all ${
                    adminSubTab === tab ? 'gold-button' : 'gray-button'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {adminSubTab === 'overview' && (
              <div className="space-y-4">
                <a
                  href={`${BACKEND_URL}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gold-button px-6 py-3 rounded inline-flex items-center gap-2"
                >
                  <Server className="w-5 h-5" /> API Documentation
                </a>
              </div>
            )}

            {adminSubTab === 'features' && <FeatureTogglesPanel onFeaturesChange={loadFeatures} />}
            {adminSubTab === 'backup' && <BackupRestorePanel />}
            {adminSubTab === 'notifications' && <NotificationsPanel />}
            {adminSubTab === 'audit' && <AuditLogPanel />}
          </div>
        )}
      </main>
    </div>
  );
};

// Main App
function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setLoading(false);
        return;
      }

      const response = await api.get('/system/status');
      setSystemStatus(response.data);
    } catch (err) {
      console.error('Failed to check system status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/peon-logo.png" alt="PEON" className="h-24 mx-auto mb-4 animate-pulse" />
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="warcraft-subtitle text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />;
  }

  if (systemStatus && !systemStatus.has_admin) {
    return <AdminWizard onComplete={(user) => setUser(user)} />;
  }

  return <Login onLogin={(user) => setUser(user)} />;
}

export default App;
