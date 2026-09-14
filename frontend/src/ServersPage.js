import { useState, useEffect, useCallback } from 'react';
import { 
  Play, Square, RefreshCw, ArrowUpCircle, Info, Settings, Search,
  Grid, List, ChevronDown, ChevronRight, Plus, Trash2, Edit,
  Loader2, Server, AlertCircle, X, Lock, Terminal, UserPlus
} from 'lucide-react';
import { api } from './utils/api';
import { ServerInfoModal, ServerUpdateModal, ServerConsoleModal } from './components/server';
import { LoadingSpinner, SkeletonCard } from './components/common/Loading';
import { getGameLogoUrl, handleLogoError } from './utils/logos';

const normalizeAnchorPart = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getServerUid = (server) => `${server.game_uid}.${server.servername}`;

const getServerAnchorId = (orchId, server) =>
  `server-${normalizeAnchorPart(orchId)}-${normalizeAnchorPart(getServerUid(server))}`;

const humanizeGameUid = (value) => {
  const normalized = String(value || '').trim().replace(/[-_]+/g, ' ');
  if (!normalized) return 'Unknown Game';
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const getPlanDisplayName = (plan) =>
  String(plan?.display_name || plan?.name || '').trim() || humanizeGameUid(plan?.game_uid);

const toBooleanValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  }
  return Boolean(value);
};

const getNormalizedEnvField = (key, config) => {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const normalizedType = String(config.type || 'text').toLowerCase();
    const fieldType =
      normalizedType === 'bool' || normalizedType === 'checkbox'
        ? 'boolean'
        : normalizedType;
    const hasDefault = Object.prototype.hasOwnProperty.call(config, 'default');
    const defaultValue = hasDefault ? config.default : '';
    const options = Array.isArray(config.options)
      ? config.options
      : config.options && typeof config.options === 'object'
        ? Object.entries(config.options).map(([value, label]) => ({ value, label }))
        : [];
    return {
      key,
      label: config.label || key,
      description: config.description || '',
      placeholder: config.placeholder || (defaultValue ?? ''),
      required: Boolean(config.required),
      type: fieldType,
      defaultValue: fieldType === 'boolean' ? toBooleanValue(defaultValue) : defaultValue ?? '',
      options,
    };
  }

  return {
    key,
    label: key,
    description: '',
    placeholder: config ?? '',
    required: false,
    type: typeof config === 'boolean' ? 'boolean' : 'text',
    defaultValue: typeof config === 'boolean' ? config : config ?? '',
    options: [],
  };
};

// Server Card Component (Grid View) - Logo on Right
const ServerCard = ({
  server,
  orchId,
  loading,
  onAction,
  onInfo,
  onUpdate,
  onDelete,
  onConsole,
  onManageAccess,
  canControlServer,
  canManageAccess,
  elementId,
}) => {
  const serverUid = getServerUid(server);
  const isRunning = server.container_state === 'running';
  const isStopped = ['exited', 'created'].includes(server.container_state);

  const handleCardClick = (event) => {
    if (!isRunning || !onConsole) return;
    if (event.target.closest('button')) return;
    onConsole(server);
  };

  return (
    <div
      id={elementId}
      className={`server-card-panel server-anchor-target stone-texture rounded card-hover animate-fade-in ${isRunning ? 'cursor-pointer' : ''}`}
      data-testid="server-card"
      onClick={handleCardClick}
      title={isRunning ? 'Click to open live container logs' : undefined}
    >
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
          src={getGameLogoUrl(server.game_uid)}
          alt={server.game_uid}
          className="game-logo-right"
          onError={handleLogoError}
        />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-3 line-clamp-2 min-h-[2.5rem] mt-2">
        {server.description || 'No description'}
      </p>

      {/* Action Buttons */}
      <div className="server-card-actions">
        {canControlServer ? (
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

            <button
              onClick={() => onDelete?.(orchId, serverUid)}
              disabled={loading[`${orchId}_${serverUid}_delete`]}
              className="red-button py-2 rounded text-sm flex items-center justify-center gap-1"
            >
              {loading[`${orchId}_${serverUid}_delete`] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3 h-3" /> Delete
                </>
              )}
            </button>
          </>
        ) : !canManageAccess ? (
          <div className="col-span-2 text-center py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" /> View Only
          </div>
        ) : null}

        {canManageAccess && (
          <button
            onClick={() => onManageAccess?.(orchId, server)}
            className="blue-button py-2 rounded text-sm flex items-center justify-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Access
          </button>
        )}

        <button
          onClick={() => onInfo(server)}
          className={`gray-button py-2 rounded text-sm flex items-center justify-center gap-1 ${
            !canControlServer && !canManageAccess ? 'col-span-2' : ''
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
const ServerListItem = ({
  server,
  orchId,
  loading,
  onAction,
  onInfo,
  onUpdate,
  onDelete,
  onConsole,
  onManageAccess,
  canControlServer,
  canManageAccess,
  elementId,
}) => {
  const serverUid = getServerUid(server);
  const isRunning = server.container_state === 'running';

  const handleRowClick = (event) => {
    if (!isRunning || !onConsole) return;
    if (event.target.closest('button')) return;
    onConsole(server);
  };

  return (
    <div
      id={elementId}
      className={`server-list-item-panel server-anchor-target stone-texture p-3 rounded flex items-center gap-3 animate-fade-in ${isRunning ? 'cursor-pointer' : ''}`}
      data-testid="server-list-item"
      onClick={handleRowClick}
      title={isRunning ? 'Click to open live container logs' : undefined}
    >
      <img 
        src={getGameLogoUrl(server.game_uid)}
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

      <div className="server-list-actions">
        {canControlServer && (
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
            <button
              onClick={() => onDelete?.(orchId, serverUid)}
              disabled={loading[`${orchId}_${serverUid}_delete`]}
              className="red-button px-3 py-1 rounded text-sm"
            >
              {loading[`${orchId}_${serverUid}_delete`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </>
        )}
        {canManageAccess && (
          <button
            onClick={() => onManageAccess?.(orchId, server)}
            className="blue-button px-3 py-1 rounded text-sm"
            title="Manage user access"
          >
            <UserPlus className="w-4 h-4" />
          </button>
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
  onDeleteServer,
  onConsole,
  onManageAccess,
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

  const runningServers = filteredServers.filter((server) => server.container_state === 'running');
  const runningCount = runningServers.length;

  const groupedServers = filteredServers.reduce((groups, server) => {
    const gameUid = server.game_uid || 'unknown';
    if (!groups[gameUid]) {
      groups[gameUid] = [];
    }
    groups[gameUid].push(server);
    return groups;
  }, {});

  const sortServersWithinGroup = (a, b) => {
    const aRunning = a.container_state === 'running';
    const bRunning = b.container_state === 'running';

    if (aRunning !== bRunning) {
      return aRunning ? -1 : 1;
    }

    return (a.servername || '').localeCompare(b.servername || '', undefined, { sensitivity: 'base' });
  };

  const sortedGameGroups = Object.entries(groupedServers)
    .sort(([gameA], [gameB]) => gameA.localeCompare(gameB, undefined, { sensitivity: 'base' }))
    .map(([gameUid, gameServers]) => [gameUid, [...gameServers].sort(sortServersWithinGroup)]);

  const sortedRunningServers = [...runningServers].sort((a, b) => {
    const gameOrder = (a.game_uid || '').localeCompare(b.game_uid || '', undefined, { sensitivity: 'base' });
    if (gameOrder !== 0) return gameOrder;
    return (a.servername || '').localeCompare(b.servername || '', undefined, { sensitivity: 'base' });
  });

  const handleJumpToServer = (server) => {
    const scrollToTarget = () => {
      const targetId = getServerAnchorId(orchestrator.id, server);
      const target = document.getElementById(targetId);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };

    if (!expanded) {
      setExpanded(true);
    }

    requestAnimationFrame(() => {
      if (!scrollToTarget()) {
        setTimeout(scrollToTarget, 60);
      }
    });
  };

  return (
    <div className="server-orchestrator-shell mb-6 animate-fade-in">
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
                className="text-sky-400 hover:text-sky-300 p-2 hover:bg-sky-900/30 rounded transition-colors"
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
        <div className="server-view-shell bg-black/20 rounded-b-lg p-4">
          {loading ? (
            <div className="servers-grid">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No servers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRunningServers.length > 0 && (
                <div className="server-running-quicklist rounded p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-300 mb-2">
                    Running Servers
                  </p>
                  <div className="server-running-chip-list">
                    {sortedRunningServers.map((server) => (
                      <button
                        key={`running-${orchestrator.id}-${server.game_uid}-${server.servername}`}
                        type="button"
                        onClick={() => handleJumpToServer(server)}
                        className="server-running-chip"
                        title={`Jump to ${server.servername}`}
                      >
                        <span className="status-online">●</span>
                        <span>{server.game_uid}</span>
                        <span className="text-gray-400">/</span>
                        <span>{server.servername}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sortedGameGroups.map(([gameUid, gameServers]) => (
                <div key={`${orchestrator.id}-group-${gameUid}`} className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    {gameUid}
                  </h4>
                  {viewMode === 'grid' ? (
                    <div className="servers-grid">
                      {gameServers.map((server) => (
                        <ServerCard
                          key={`${orchestrator.id}_${server.game_uid}_${server.servername}`}
                          server={server}
                          orchId={orchestrator.id}
                          loading={actionLoading}
                          onAction={onAction}
                          onInfo={onInfo}
                          onUpdate={onUpdate}
                          onDelete={onDeleteServer}
                          onConsole={onConsole}
                          onManageAccess={onManageAccess}
                          canControlServer={canManageServers || Boolean(server.webui_can_manage_access)}
                          canManageAccess={Boolean(server.webui_can_manage_access)}
                          elementId={getServerAnchorId(orchestrator.id, server)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="servers-list">
                      {gameServers.map((server) => (
                        <ServerListItem
                          key={`${orchestrator.id}_${server.game_uid}_${server.servername}`}
                          server={server}
                          orchId={orchestrator.id}
                          loading={actionLoading}
                          onAction={onAction}
                          onInfo={onInfo}
                          onUpdate={onUpdate}
                          onDelete={onDeleteServer}
                          onConsole={onConsole}
                          onManageAccess={onManageAccess}
                          canControlServer={canManageServers || Boolean(server.webui_can_manage_access)}
                          canManageAccess={Boolean(server.webui_can_manage_access)}
                          elementId={getServerAnchorId(orchestrator.id, server)}
                        />
                      ))}
                    </div>
                  )}
                </div>
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
  const [planFields, setPlanFields] = useState([]);
  const [planSearch, setPlanSearch] = useState('');
  const [showPlanList, setShowPlanList] = useState(true);
  const [serverName, setServerName] = useState('');
  const [envVars, setEnvVars] = useState({});
  const [validationError, setValidationError] = useState('');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (!selectedOrch && orchestrators.length > 0) {
      setSelectedOrch(orchestrators[0].id);
    }
  }, [orchestrators, selectedOrch]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    // Initialize environment variables from plan
    const normalizedFields = Object.entries(plan.environment || {}).map(([key, config]) =>
      getNormalizedEnvField(key, config)
    );
    const defaultEnv = {};
    normalizedFields.forEach((field) => {
      defaultEnv[field.key] = field.defaultValue;
    });
    setPlanFields(normalizedFields);
    setEnvVars(defaultEnv);
    setShowPlanList(false);
    setValidationError('');
  };

  const filteredPlans = plans.filter((plan) => {
    const query = planSearch.trim().toLowerCase();
    if (!query) return true;
    const displayName = getPlanDisplayName(plan).toLowerCase();
    return (
      displayName.includes(query) ||
      String(plan.game_uid || '').toLowerCase().includes(query)
    );
  });

  const handleDeploy = async () => {
    if (!selectedPlan || !serverName.trim()) return;
    if (!selectedOrch) {
      setValidationError('Select a target orchestrator.');
      return;
    }
    const missingRequiredField = planFields.find(
      (field) => field.required && !String(envVars[field.key] ?? '').trim()
    );
    if (missingRequiredField) {
      setValidationError(`${missingRequiredField.label} is required.`);
      return;
    }

    setDeploying(true);
    setValidationError('');
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-300">Select Game Plan</label>
            {selectedPlan && !showPlanList && (
              <button
                type="button"
                onClick={() => setShowPlanList(true)}
                className="gray-button px-3 py-1 rounded text-xs"
              >
                Change Plan
              </button>
            )}
          </div>
          
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
          ) : !showPlanList && selectedPlan ? (
            <div className="bg-black/30 border border-slate-700 rounded p-3 flex items-center gap-3">
              <img
                src={getGameLogoUrl(selectedPlan.game_uid)}
                alt={selectedPlan.game_uid}
                className="w-10 h-10 object-contain"
                onError={handleLogoError}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{getPlanDisplayName(selectedPlan)}</p>
                <p className="text-xs text-gray-400 truncate">{selectedPlan.game_uid}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  placeholder="Search plans by name or game UID..."
                  className="w-full pl-10"
                />
              </div>

              {filteredPlans.length === 0 ? (
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <p className="text-yellow-300">No plans match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredPlans.map((plan) => (
                    <button
                      type="button"
                      key={plan.game_uid}
                      onClick={() => handleSelectPlan(plan)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        selectedPlan?.game_uid === plan.game_uid
                          ? 'bg-slate-900/50 border-2 border-sky-500'
                          : 'bg-black/30 border-2 border-transparent hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={getGameLogoUrl(plan.game_uid)}
                        alt={plan.game_uid}
                        className="w-12 h-12 object-contain mx-auto mb-2"
                        onError={handleLogoError}
                      />
                      <h4 className="font-semibold text-sm text-center truncate">{getPlanDisplayName(plan)}</h4>
                      <p className="text-xs text-gray-400 text-center truncate">{plan.game_uid}</p>
                    </button>
                  ))}
                </div>
              )}
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
            {planFields.length > 0 && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Configuration</label>
                <div className="space-y-3 bg-black/20 p-4 rounded">
                  {planFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {field.type === 'boolean' ? (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(envVars[field.key])}
                            onChange={(e) => setEnvVars({ ...envVars, [field.key]: e.target.checked })}
                          />
                          Enabled
                        </label>
                      ) : field.type === 'select' && field.options.length > 0 ? (
                        <select
                          value={String(envVars[field.key] ?? '')}
                          onChange={(e) => setEnvVars({ ...envVars, [field.key]: e.target.value })}
                          className="w-full text-sm"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => {
                            const optionValue =
                              option && typeof option === 'object' && Object.prototype.hasOwnProperty.call(option, 'value')
                                ? option.value
                                : option;
                            const optionLabel =
                              option && typeof option === 'object' && Object.prototype.hasOwnProperty.call(option, 'label')
                                ? option.label
                                : optionValue;
                            return (
                              <option key={`${field.key}_${String(optionValue)}`} value={String(optionValue ?? '')}>
                                {String(optionLabel ?? optionValue ?? '')}
                              </option>
                            );
                          })}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={String(envVars[field.key] ?? '')}
                          onChange={(e) => setEnvVars({ ...envVars, [field.key]: e.target.value })}
                          placeholder={String(field.placeholder ?? '')}
                          className="w-full text-sm"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                          value={String(envVars[field.key] ?? '')}
                          onChange={(e) => setEnvVars({ ...envVars, [field.key]: e.target.value })}
                          placeholder={String(field.placeholder ?? '')}
                          className="w-full text-sm"
                        />
                      )}
                      {field.description && (
                        <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationError && (
              <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-sm text-red-300">
                {validationError}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
            Cancel
          </button>
          <button
            type="button"
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
              type="text"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              required
              placeholder="http://server:5000"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Use a full URL with protocol and port. For containerized WebUI, localhost may be rewritten automatically.</p>
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

const ServerAccessModal = ({ orchId, server, onClose, onSaved }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState('manage');

  const serverUid = getServerUid(server);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get(`/proxy/${orchId}/server/${serverUid}/access`);
        setUsers(response.data.users || []);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to load users for server access');
        onClose();
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [orchId, serverUid, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      await api.post(`/proxy/${orchId}/server/${serverUid}/access`, {
        user_id: selectedUserId,
        permissions: permission,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to grant server access');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="medieval-border rounded-lg p-6 max-w-lg w-full animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl flex items-center gap-2">
            <UserPlus className="w-6 h-6" /> Manage Server Access
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Server: <span className="text-white">{serverUid}</span>
        </p>

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">User</label>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full"
                required
              >
                <option value="">-- Select User --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Permission</label>
              <select
                value={permission}
                onChange={(event) => setPermission(event.target.value)}
                className="w-full"
              >
                <option value="read">Read (view only)</option>
                <option value="manage">Manage (start/stop/update + grant access)</option>
              </select>
            </div>

            {selectedUser?.server_permission && (
              <div className="bg-blue-900/20 border border-blue-700/50 p-3 rounded text-sm text-blue-300">
                Current server permission: <strong>{selectedUser.server_permission}</strong>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="gold-button flex-1 py-2 rounded flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Save Access
              </button>
            </div>
          </form>
        )}
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
  const [accessServer, setAccessServer] = useState(null);
  const [currentOrchId, setCurrentOrchId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planRefreshMessage, setPlanRefreshMessage] = useState('');

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

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const response = await api.get('/proxy/plans');
      setPlans(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to load plans:', err);
      alert('Failed to load game plans: ' + (err.response?.data?.detail || err.message));
      return [];
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const handleReloadPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      setPlanRefreshMessage('');
      await api.put('/proxy/plans');
      await loadPlans();
      setPlanRefreshMessage('Plans refreshed successfully.');
    } catch (err) {
      console.error('Failed to update plans:', err);
      setPlanRefreshMessage('Failed to refresh plans.');
      alert('Failed to update game plans: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingPlans(false);
    }
  }, [loadPlans]);

  // Load plans when deploy modal opens
  const handleOpenDeployModal = async () => {
    setPlans([]); // Reset plans before loading
    setShowDeployModal(true);
    await loadPlans();
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

  const handleDeleteServer = async (orchId, serverUid) => {
    if (!window.confirm(`Delete server ${serverUid}? This action cannot be undone.`)) return;
    await handleServerAction(orchId, 'delete', serverUid);
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
    <div className="servers-page space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="warcraft-subtitle text-2xl flex items-center gap-2">
          <Server className="w-6 h-6" /> Server Management
        </h2>

        <div className="servers-toolbar flex items-center gap-3 flex-wrap">
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
              className={`p-2 ${viewMode === 'grid' ? 'bg-slate-900/50' : 'bg-black/30'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-slate-900/50' : 'bg-black/30'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          {canManageServers && (
            <>
              <button
                onClick={handleReloadPlans}
                disabled={loadingPlans}
                className="gray-button px-4 py-2 rounded flex items-center gap-2"
              >
                {loadingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Update Plans
              </button>

              <button
                onClick={handleOpenDeployModal}
                className="gold-button px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Deploy
              </button>
            </>
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

      {planRefreshMessage && (
        <div className={`rounded border px-3 py-2 text-sm ${
          planRefreshMessage.startsWith('Failed')
            ? 'bg-red-900/40 border-red-500 text-red-200'
            : 'bg-green-900/40 border-green-500 text-green-200'
        }`}>
          {planRefreshMessage}
        </div>
      )}

      {/* Orchestrators & Servers */}
      {orchestrators.length === 0 ? (
        <div className="server-empty-state text-center py-12 stone-texture rounded-lg">
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
            onDeleteServer={handleDeleteServer}
            onConsole={(server) => { setConsoleServer(server); setCurrentOrchId(orch.id); }}
            onManageAccess={(orchId, server) => { setCurrentOrchId(orchId); setAccessServer(server); }}
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

      {accessServer && currentOrchId && (
        <ServerAccessModal
          orchId={currentOrchId}
          server={accessServer}
          onClose={() => { setAccessServer(null); setCurrentOrchId(null); }}
          onSaved={() => { loadServers(); }}
        />
      )}
    </div>
  );
};

export default ServersPage;
