import { useState, useEffect, useCallback } from 'react';
import { 
  Play, Square, RefreshCw, ArrowUpCircle, Info, Settings, Search,
  Grid, List, ChevronDown, ChevronRight, Plus, Trash2, Edit,
  Loader2, Server, AlertCircle, X, Lock, Terminal
} from 'lucide-react';
import { api } from './utils/api';
import { ServerInfoModal, ServerUpdateModal, ServerHealthStats, ServerConsoleModal } from './components/server';
import { LoadingSpinner, SkeletonCard } from './components/common/Loading';
import { handleLogoError } from './utils/logos';

// Server Card Component (Grid View) - Logo on Right
const ServerCard = ({ server, orchId, loading, onAction, onInfo, onUpdate, onConsole, canManageServers }) => {
  const serverUid = `${server.game_uid}.${server.servername}`;
  const isRunning = server.container_state === 'running';
  const isStopped = ['exited', 'created'].includes(server.container_state);

  return (
    <div className="stone-texture p-4 rounded card-hover animate-fade-in" data-testid="server-card">
      {/* Header with Logo on Right */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="warcraft-subtitle text-lg truncate">{server.servername}</h4>
          <p className="text-xs text-gray-400 mb-2">{server.game_uid}</p>
          <span
            className={`text-xs font-bold px-2 py-1 rounded inline-block ${
              isRunning 
                ? 'bg-green-900/50 status-online' 
                : isStopped 
                  ? 'bg-red-900/50 status-offline' 
                  : 'bg-yellow-900/50 status-pending'
            }`}
          >
            {server.container_state?.toUpperCase()}
          </span>
        </div>
        <img 
          src={`/game-logos/${server.game_uid}.png`}
          alt={server.game_uid}
          className="game-logo-right"
          onError={handleLogoError}
        />
      </div>

      {/* Server Health Stats */}
      <ServerHealthStats server={server} orchId={orchId} />

      {/* Description */}
      <p className="text-sm text-gray-300 mb-3 line-clamp-2 min-h-[2.5rem] mt-2">
        {server.description || 'No description'}
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {canManageServers ? (
          <>
            <button
              onClick={() => onAction(orchId, isRunning ? 'stop' : 'start', serverUid)}
              disabled={loading[`${orchId}_${serverUid}_${isRunning ? 'stop' : 'start'}`]}
              className={`${isRunning ? 'red-button' : 'gold-button'} py-2 rounded text-sm flex items-center justify-center gap-1`}
            >
              {loading[`${orchId}_${serverUid}_${isRunning ? 'stop' : 'start'}`] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRunning ? (
                <>
                  <Square className="w-3 h-3" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Start
                </>
              )}
            </button>

            <button
              onClick={() => onAction(orchId, 'restart', serverUid)}
              disabled={!isRunning || loading[`${orchId}_${serverUid}_restart`]}
              className="gray-button py-2 rounded text-sm flex items-center justify-center gap-1"
            >
              {loading[`${orchId}_${serverUid}_restart`] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" /> Restart
                </>
              )}
            </button>

            <button
              onClick={() => onUpdate?.(server)}
              disabled={loading[`${orchId}_${serverUid}_update`]}
              className="blue-button py-2 rounded text-sm flex items-center justify-center gap-1"
            >
              {loading[`${orchId}_${serverUid}_update`] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowUpCircle className="w-3 h-3" /> Update
                </>
              )}
            </button>
          </>
        ) : (
          <div className="col-span-2 text-center py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" /> View Only
          </div>
        )}

        <button
          onClick={() => onInfo(server)}
          className={`gray-button py-2 rounded text-sm flex items-center justify-center gap-1 ${
            !canManageServers ? 'col-span-2' : ''
          }`}
        >
          <Info className="w-3 h-3" /> Info
        </button>
        
        {isRunning && (
          <button
            onClick={() => onConsole?.(server)}
            className="gray-button py-2 rounded text-sm flex items-center justify-center gap-1 col-span-2"
          >
            <Terminal className="w-3 h-3" /> Console
          </button>
        )}
      </div>
    </div>
  );
};

// Server List Item (List View)
const ServerListItem = ({ server, orchId, loading, onAction, onInfo, onUpdate, canManageServers }) => {
  const serverUid = `${server.game_uid}.${server.servername}`;
  const isRunning = server.container_state === 'running';

  return (
    <div className="stone-texture p-3 rounded flex items-center gap-3 animate-fade-in" data-testid="server-list-item">
      <img 
        src={`/game-logos/${server.game_uid}.png`}
        alt={server.game_uid}
        className="w-10 h-10 object-contain"
        onError={handleLogoError}
      />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate">{server.servername}</h4>
        <p className="text-xs text-gray-400">{server.game_uid}</p>
      </div>

      <span className={`text-xs font-bold ${isRunning ? 'status-online' : 'status-offline'}`}>
        {server.container_state?.toUpperCase()}
      </span>

      <div className="flex gap-2">
        {canManageServers && (
          <>
            <button
              onClick={() => onAction(orchId, isRunning ? 'stop' : 'start', serverUid)}
              disabled={loading[`${orchId}_${serverUid}_${isRunning ? 'stop' : 'start'}`]}
              className={`${isRunning ? 'red-button' : 'gold-button'} px-3 py-1 rounded text-sm`}
            >
              {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onUpdate?.(server)}
              className="blue-button px-3 py-1 rounded text-sm"
            >
              <ArrowUpCircle className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={() => onInfo(server)}
          className="gray-button px-3 py-1 rounded text-sm"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Orchestrator Section with collapsible servers
const OrchestratorSection = ({ 
  orchestrator, 
  servers, 
  loading, 
  actionLoading, 
  onAction, 
  onInfo, 
  onUpdate,
  onConsole,
  onEdit,
  onDelete,
  viewMode,
  searchTerm,
  canManageServers,
  canManageOrchestrators,
  initialExpanded = true
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  // Filter servers by search term
  const filteredServers = (servers || []).filter(server => 
    server.servername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.game_uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const runningCount = filteredServers.filter(s => s.container_state === 'running').length;

  return (
    <div className="mb-6 animate-fade-in">
      {/* Orchestrator Header */}
      <div 
        className="flex items-center justify-between p-4 stone-texture rounded-t-lg cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white">
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          <div>
            <h3 className="warcraft-subtitle text-xl">{orchestrator.name}</h3>
            <p className="text-xs text-gray-400">
              {runningCount}/{filteredServers.length} running • {orchestrator.base_url}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canManageOrchestrators && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(orchestrator); }}
                className="text-purple-400 hover:text-purple-300 p-2 hover:bg-purple-900/30 rounded transition-colors"
                title="Edit orchestrator settings"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(orchestrator.id); }}
                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/30 rounded transition-colors"
                title="Delete orchestrator"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Servers Content */}
      {expanded && (
        <div className="bg-black/20 rounded-b-lg p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No servers found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredServers.map((server) => (
                <ServerCard
                  key={`${orchestrator.id}_${server.game_uid}_${server.servername}`}
                  server={server}
                  orchId={orchestrator.id}
                  loading={actionLoading}
                  onAction={onAction}
                  onInfo={onInfo}
                  onUpdate={onUpdate}
                  onConsole={onConsole}
                  canManageServers={canManageServers}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServers.map((server) => (
                <ServerListItem
                  key={`${orchestrator.id}_${server.game_uid}_${server.servername}`}
                  server={server}
                  orchId={orchestrator.id}
                  loading={actionLoading}
                  onAction={onAction}
                  onInfo={onInfo}
                  onUpdate={onUpdate}
                  canManageServers={canManageServers}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Deploy Server Modal
const DeployServerModal = ({ orchestrators, plans, loadingPlans, onClose, onDeploy }) => {
  const [selectedOrch, setSelectedOrch] = useState(orchestrators[0]?.id || '');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [serverName, setServerName] = useState('');
  const [envVars, setEnvVars] = useState({});
  const [deploying, setDeploying] = useState(false);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    // Initialize environment variables from plan
    const defaultEnv = {};
    if (plan.environment) {
      Object.entries(plan.environment).forEach(([key, config]) => {
        defaultEnv[key] = config.default || '';
      });
    }
    setEnvVars(defaultEnv);
  };

  const handleDeploy = async () => {
    if (!selectedPlan || !serverName.trim()) return;
    
    setDeploying(true);
    try {
      await onDeploy({
        orchestrator_id: selectedOrch,
        game_uid: selectedPlan.game_uid,
        server_name: serverName,
        environment: envVars,
      });
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-title text-2xl flex items-center gap-2">
            <Server className="w-6 h-6" /> Deploy New Server
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Orchestrator Selection */}
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">Target Orchestrator</label>
          <select
            value={selectedOrch}
            onChange={(e) => setSelectedOrch(e.target.value)}
            className="w-full"
          >
            {orchestrators.map((orch) => (
              <option key={orch.id} value={orch.id}>{orch.name}</option>
            ))}
          </select>
        </div>

        {/* Plan Selection */}
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">Select Game Plan</label>
          
          {loadingPlans ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-400">Loading available plans...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-300">No game plans available. Add plans to the warplans directory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.game_uid}
                  onClick={() => handleSelectPlan(plan)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    selectedPlan?.game_uid === plan.game_uid
                      ? 'bg-purple-900/50 border-2 border-purple-500'
                      : 'bg-black/30 border-2 border-transparent hover:border-purple-800'
                  }`}
                >
                  <img 
                    src={`/game-logos/${plan.game_uid}.png`}
                    alt={plan.game_uid}
                    className="w-12 h-12 object-contain mx-auto mb-2"
                    onError={handleLogoError}
                  />
                  <h4 className="font-semibold text-sm text-center truncate">{plan.name || plan.game_uid}</h4>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Server Configuration */}
        {selectedPlan && (
          <div className="space-y-4 mb-6 animate-fade-in">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Server Name</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="my-game-server"
                className="w-full"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-gray-500 mt-1">Use lowercase letters, numbers, and hyphens only</p>
            </div>

            {/* Environment Variables from Plan */}
            {selectedPlan.environment && Object.keys(selectedPlan.environment).length > 0 && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Configuration</label>
                <div className="space-y-3 bg-black/20 p-4 rounded">
                  {Object.entries(selectedPlan.environment).map(([key, config]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {config.label || key}
                        {config.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={config.type === 'password' ? 'password' : 'text'}
                        value={envVars[key] || ''}
                        onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
                        placeholder={config.placeholder || config.default || ''}
                        className="w-full text-sm"
                      />
                      {config.description && (
                        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button onClick={onClose} className="gray-button flex-1 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={deploying || !selectedPlan || !serverName.trim()}
            className="gold-button flex-1 py-2 rounded flex items-center justify-center gap-2"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Deploying...
              </>
            ) : (
              <>
                <Server className="w-4 h-4" /> Deploy Server
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add/Edit Orchestrator Modal
const OrchestratorModal = ({ orchestrator, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: orchestrator?.name || '',
    base_url: orchestrator?.base_url || '',
    api_key: orchestrator?.api_key || '',
    description: orchestrator?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post(`/orchestrators/test?base_url=${encodeURIComponent(formData.base_url)}&api_key=${encodeURIComponent(formData.api_key)}`);
      setTestResult(response.data);
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.detail || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, orchestrator?.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save orchestrator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-lg w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl">
            {orchestrator ? 'Edit Orchestrator' : 'Add Orchestrator'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Production Server"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Base URL</label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              required
              placeholder="http://server:5000"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">API Key</label>
            <input
              type="text"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              required
              placeholder="Enter API key"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full"
              rows="2"
            />
          </div>

          {/* Test Connection */}
          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !formData.base_url || !formData.api_key}
              className="gray-button w-full py-2 rounded flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Test Connection
                </>
              )}
            </button>

            {testResult && (
              <div className={`mt-2 p-3 rounded text-sm ${
                testResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="gold-button flex-1 py-2 rounded">
              {loading ? 'Saving...' : orchestrator ? 'Update' : 'Add Orchestrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Servers Page
export const ServersPage = ({ orchestrators, onOrchestratorsChange, permissions, initialFilter }) => {
  const [serversData, setServersData] = useState({});
  const [loading, setLoading] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState(initialFilter?.serverUid ? initialFilter.serverUid.split('.').pop() : '');
  const [viewMode, setViewMode] = useState('grid');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showOrchModal, setShowOrchModal] = useState(false);
  const [editingOrch, setEditingOrch] = useState(null);
  const [infoServer, setInfoServer] = useState(null);
  const [updateServer, setUpdateServer] = useState(null);
  const [consoleServer, setConsoleServer] = useState(null);
  const [currentOrchId, setCurrentOrchId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const canManageServers = permissions?.can_manage_servers;
  const canManageOrchestrators = permissions?.can_manage_orchestrators;

  // Load servers for all orchestrators
  const loadServers = useCallback(async () => {
    for (const orch of orchestrators) {
      setLoading(prev => ({ ...prev, [orch.id]: true }));
      try {
        const response = await api.get(`/proxy/${orch.id}/servers`);
        setServersData(prev => ({
          ...prev,
          [orch.id]: { servers: response.data.servers, last_synced: response.data.last_synced }
        }));
      } catch (err) {
        setServersData(prev => ({ ...prev, [orch.id]: { error: err.message } }));
      } finally {
        setLoading(prev => ({ ...prev, [orch.id]: false }));
      }
    }
  }, [orchestrators]);

  useEffect(() => {
    if (orchestrators.length > 0) {
      loadServers();
    }
  }, [orchestrators, loadServers]);

  // Load plans when deploy modal opens
  const handleOpenDeployModal = async () => {
    setShowDeployModal(true);
    setLoadingPlans(true);
    try {
      const response = await api.get('/proxy/plans');
      setPlans(response.data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Server action (start/stop/restart)
  const handleServerAction = async (orchId, action, serverUid) => {
    const loadKey = `${orchId}_${serverUid}_${action}`;
    setActionLoading(prev => ({ ...prev, [loadKey]: true }));
    
    try {
      await api.put(`/proxy/${orchId}/server/${action}/${serverUid}`);
      // Refresh servers after action
      setTimeout(loadServers, 1000);
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} server`);
    } finally {
      setActionLoading(prev => ({ ...prev, [loadKey]: false }));
    }
  };

  // Handle deploy
  const handleDeploy = async (deployData) => {
    await api.post(`/proxy/${deployData.orchestrator_id}/deploy`, {
      game_uid: deployData.game_uid,
      server_name: deployData.server_name,
      environment: deployData.environment,
    });
    loadServers();
  };

  // Handle orchestrator save
  const handleSaveOrchestrator = async (formData, orchId) => {
    if (orchId) {
      await api.put(`/orchestrators/${orchId}`, formData);
    } else {
      await api.post('/orchestrators', formData);
    }
    onOrchestratorsChange();
  };

  // Handle orchestrator delete
  const handleDeleteOrchestrator = async (orchId) => {
    if (!window.confirm('Delete this orchestrator? All linked servers will be removed from the dashboard.')) return;
    try {
      await api.delete(`/orchestrators/${orchId}`);
      onOrchestratorsChange();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete orchestrator');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="warcraft-subtitle text-2xl flex items-center gap-2">
          <Server className="w-6 h-6" /> Server Management
        </h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded bg-black/30 border border-gray-700 text-sm w-48"
            />
          </div>

          {/* View Toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-purple-900/50' : 'bg-black/30'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-purple-900/50' : 'bg-black/30'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          {canManageServers && (
            <button
              onClick={handleOpenDeployModal}
              className="gold-button px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Deploy
            </button>
          )}
          
          {canManageOrchestrators && (
            <button
              onClick={() => { setEditingOrch(null); setShowOrchModal(true); }}
              className="gray-button px-4 py-2 rounded flex items-center gap-2"
            >
              <Settings className="w-4 h-4" /> Add Orchestrator
            </button>
          )}
        </div>
      </div>

      {/* Orchestrators & Servers */}
      {orchestrators.length === 0 ? (
        <div className="text-center py-12 stone-texture rounded-lg">
          <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="warcraft-subtitle text-xl mb-2">No Orchestrators Configured</h3>
          <p className="text-gray-400 mb-4">Add an orchestrator to start managing game servers.</p>
          {canManageOrchestrators && (
            <button
              onClick={() => setShowOrchModal(true)}
              className="gold-button px-6 py-2 rounded"
            >
              Add Your First Orchestrator
            </button>
          )}
        </div>
      ) : (
        orchestrators.map((orch) => (
          <OrchestratorSection
            key={orch.id}
            orchestrator={orch}
            servers={serversData[orch.id]?.servers}
            loading={loading[orch.id]}
            actionLoading={actionLoading}
            onAction={handleServerAction}
            onInfo={(server) => { setInfoServer(server); setCurrentOrchId(orch.id); }}
            onUpdate={(server) => { setUpdateServer(server); setCurrentOrchId(orch.id); }}
            onConsole={(server) => { setConsoleServer(server); setCurrentOrchId(orch.id); }}
            onEdit={(orch) => { setEditingOrch(orch); setShowOrchModal(true); }}
            onDelete={handleDeleteOrchestrator}
            viewMode={viewMode}
            searchTerm={searchTerm}
            canManageServers={canManageServers}
            canManageOrchestrators={canManageOrchestrators}
            initialExpanded={!initialFilter || initialFilter.orchId === orch.id}
          />
        ))
      )}

      {/* Modals */}
      {showDeployModal && (
        <DeployServerModal
          orchestrators={orchestrators}
          plans={plans}
          loadingPlans={loadingPlans}
          onClose={() => setShowDeployModal(false)}
          onDeploy={handleDeploy}
        />
      )}

      {showOrchModal && (
        <OrchestratorModal
          orchestrator={editingOrch}
          onClose={() => { setShowOrchModal(false); setEditingOrch(null); }}
          onSave={handleSaveOrchestrator}
        />
      )}

      {infoServer && currentOrchId && (
        <ServerInfoModal
          server={infoServer}
          orchestratorId={currentOrchId}
          onClose={() => { setInfoServer(null); setCurrentOrchId(null); }}
        />
      )}

      {updateServer && currentOrchId && (
        <ServerUpdateModal
          server={updateServer}
          orchestratorId={currentOrchId}
          onClose={() => { setUpdateServer(null); setCurrentOrchId(null); }}
          onSuccess={() => { setUpdateServer(null); setCurrentOrchId(null); loadServers(); }}
        />
      )}

      {consoleServer && currentOrchId && (
        <ServerConsoleModal
          server={consoleServer}
          orchestratorId={currentOrchId}
          onClose={() => { setConsoleServer(null); setCurrentOrchId(null); }}
        />
      )}
    </div>
  );
};

export default ServersPage;
