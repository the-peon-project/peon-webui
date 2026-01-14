import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, Calendar, MessageSquare, Users, Server, 
  Trash2, Plus, Clock, Wifi, WifiOff, RefreshCw, Send
} from 'lucide-react';
import { api, BACKEND_URL } from './utils/api';
import { ChatMessage, ChatInput } from './components/chat';
import { LoadingSpinner, Skeleton } from './components/common/Loading';

// Server Dashboard Overview Component
const DashboardOverview = ({ serversData, orchestrators }) => {
  let totalServers = 0;
  let runningServers = 0;
  let stoppedServers = 0;
  let errorCount = 0;

  // Only count data for orchestrators that currently exist
  if (serversData && orchestrators.length > 0) {
    orchestrators.forEach((orch) => {
      const orchData = serversData[orch.id];
      if (orchData?.error) errorCount++;
      if (orchData?.servers) {
        totalServers += orchData.servers.length;
        orchData.servers.forEach(server => {
          if (server.container_state === 'running') runningServers++;
          else stoppedServers++;
        });
      }
    });
  }

  const usagePercent = totalServers > 0 ? Math.round((runningServers / totalServers) * 100) : 0;

  return (
    <div className="medieval-border rounded-lg p-6 mb-6 animate-fade-in">
      <h2 className="warcraft-subtitle text-2xl mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" /> Server Dashboard
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value text-purple-400">{totalServers}</div>
          <div className="stat-label">Total Servers</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value text-green-400">{runningServers}</div>
          <div className="stat-label">Running</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value text-red-400">{stoppedServers}</div>
          <div className="stat-label">Stopped</div>
        </div>
        
        <div className="stat-card">
          <div className={`stat-value ${usagePercent >= 70 ? 'text-green-400' : usagePercent >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {usagePercent}%
          </div>
          <div className="stat-label">Usage</div>
        </div>
      </div>

      {/* Orchestrator Status - Only show if there are orchestrators */}
      {orchestrators.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Orchestrators Status</div>
          <div className="flex flex-wrap gap-2">
            {orchestrators.map(orch => {
              const orchData = serversData?.[orch.id];
              const hasError = orchData?.error;
              const serverCount = orchData?.servers?.length || 0;
              const runningCount = orchData?.servers?.filter(s => s.container_state === 'running').length || 0;
              
              return (
                <div 
                  key={orch.id} 
                  className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                    hasError ? 'bg-red-900/50 border border-red-500' : 'bg-black/30'
                  }`}
                >
                  {hasError ? (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  ) : runningCount > 0 ? (
                    <Wifi className="w-3 h-3 text-green-400" />
                  ) : (
                    <Wifi className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="font-medium">{orch.name}</span>
                  {!hasError && (
                    <span className="text-gray-500">{runningCount}/{serverCount}</span>
                  )}
                  {hasError && (
                    <span className="text-red-400">Error</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Only show error count if there are orchestrators with errors */}
      {errorCount > 0 && orchestrators.length > 0 && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-sm text-red-300 flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          {errorCount} orchestrator(s) experiencing connection issues
        </div>
      )}
    </div>
  );
};

// Online Users Card
const OnlineUsersCard = ({ enabled }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    
    const loadOnlineUsers = async () => {
      try {
        const response = await api.get('/chat/online');
        setOnlineUsers(response.data);
      } catch (err) {
        console.error('Failed to load online users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="medieval-border rounded-lg p-4 animate-fade-in">
      <h3 className="warcraft-subtitle text-lg mb-3 flex items-center gap-2">
        <Users className="w-5 h-5" /> Online Users
      </h3>
      
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      ) : onlineUsers.length === 0 ? (
        <p className="text-gray-500 text-sm">No users online</p>
      ) : (
        <div className="space-y-2">
          {onlineUsers.map(user => (
            <div 
              key={user.id}
              className="flex items-center gap-2 p-2 rounded bg-black/20"
            >
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm">{user.username}</span>
              <span className="text-xs text-gray-500 capitalize">{user.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Active Servers List (clickable)
const ActiveServersList = ({ serversData, onServerClick }) => {
  const activeServers = [];
  
  Object.entries(serversData || {}).forEach(([orchId, orchData]) => {
    if (orchData.servers) {
      orchData.servers.forEach(server => {
        if (server.container_state === 'running') {
          activeServers.push({ ...server, orchestrator_id: orchId });
        }
      });
    }
  });

  if (activeServers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No active servers</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeServers.map((server, idx) => (
        <button
          key={`${server.game_uid}.${server.servername}`}
          onClick={() => onServerClick?.(`${server.game_uid}.${server.servername}`, server.orchestrator_id)}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-all text-left animate-fade-in"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <img 
            src={`/game-logos/${server.game_uid}.png`}
            alt={server.game_uid}
            className="w-10 h-10 object-contain rounded"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{server.servername}</h4>
            <p className="text-xs text-gray-400">{server.game_uid}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-green-400">Online</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// Community Chat Component
const CommunityChat = ({ user, enabled, canModerate }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // WebSocket connection
    const wsUrl = BACKEND_URL.replace('http', 'ws') + '/api/ws/chat';
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${wsUrl}?token=${token}`);
        
        ws.onopen = () => {
          setWsConnected(true);
          setLoading(false);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'chat_history') {
              setMessages(data.messages);
              setTimeout(scrollToBottom, 100);
            } else if (data.type === 'chat_message') {
              setMessages(prev => [...prev, data.message]);
              setTimeout(scrollToBottom, 100);
            } else if (data.type === 'message_deleted') {
              setMessages(prev => prev.filter(m => m.id !== data.message_id));
            } else if (data.type === 'chat_cleared') {
              setMessages([]);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
        
        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = () => {
          setWsConnected(false);
        };
        
        wsRef.current = ws;
      } catch (e) {
        console.error('WebSocket connection failed:', e);
        setWsConnected(false);
        setLoading(false);
        // Fallback to HTTP
        loadMessagesHttp();
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, scrollToBottom]);

  const loadMessagesHttp = async () => {
    try {
      const response = await api.get('/chat/messages?limit=50');
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', message }));
    } else {
      // HTTP fallback
      try {
        await api.post(`/chat/messages?message=${encodeURIComponent(message)}`);
        loadMessagesHttp();
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleDeleteUserHistory = async (userId) => {
    if (!window.confirm('Delete all messages from this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}/chat-history`);
      loadMessagesHttp();
    } catch (err) {
      console.error('Failed to delete user history:', err);
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Ban this user from chat?')) return;
    try {
      await api.post(`/admin/users/${userId}/ban-chat`);
    } catch (err) {
      console.error('Failed to ban user:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all chat messages? This cannot be undone.')) return;
    try {
      await api.delete('/chat/clear');
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  if (!enabled) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Chat is disabled</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="warcraft-subtitle text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Community Chat
          </h3>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
        </div>
        {canModerate && (
          <button
            onClick={handleClearAll}
            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30 transition-colors"
            title="Clear all chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-area bg-black/20 rounded-lg p-2 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwn={msg.user_id === user.id}
              canModerate={canModerate}
              onDelete={handleDeleteMessage}
              onDeleteHistory={handleDeleteUserHistory}
              onBanUser={handleBanUser}
            />
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="mt-3">
        <ChatInput
          onSend={sendMessage}
          disabled={user.is_chat_banned}
          placeholder={user.is_chat_banned ? "You are banned from chat" : "Type a message... (supports **markdown**)"}
        />
      </div>
    </div>
  );
};

// Gaming Sessions Component
const GamingSessions = ({ orchestrators, allServers, enabled, user }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    loadSessions();
  }, [enabled]);

  const loadSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (sessionId, status) => {
    try {
      await api.post(`/sessions/${sessionId}/rsvp?status=${status}`);
      loadSessions();
    } catch (err) {
      console.error('Failed to RSVP:', err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  if (!enabled) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Gaming sessions are disabled</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="warcraft-subtitle text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Gaming Sessions
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="gold-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No upcoming sessions. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => {
            const isCreator = session.created_by === user.id;
            const myRsvp = session.rsvps?.find(r => r.user_id === user.id);
            
            return (
              <div 
                key={session.id}
                className="bg-black/20 rounded-lg p-4 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{session.title}</h4>
                    <p className="text-sm text-gray-400">{session.description}</p>
                  </div>
                  {(isCreator || user.role === 'admin' || user.role === 'moderator') && (
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(session.scheduled_time).toLocaleString()}
                  </span>
                  <span>{session.duration_minutes} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {session.rsvps?.filter(r => r.status === 'attending').length || 0} attending
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRsvp(session.id, 'attending')}
                      className={`px-3 py-1 rounded text-sm ${
                        myRsvp?.status === 'attending' ? 'gold-button' : 'gray-button'
                      }`}
                    >
                      Join
                    </button>
                    <button
                      onClick={() => handleRsvp(session.id, 'maybe')}
                      className={`px-3 py-1 rounded text-sm ${
                        myRsvp?.status === 'maybe' ? 'gold-button' : 'gray-button'
                      }`}
                    >
                      Maybe
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateSessionModal
          orchestrators={orchestrators}
          allServers={allServers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSessions();
          }}
        />
      )}
    </div>
  );
};

// Create Session Modal
const CreateSessionModal = ({ orchestrators, allServers, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    orchestrator_id: orchestrators[0]?.id || '',
    server_uid: '',
    scheduled_time: '',
    duration_minutes: 120,
  });
  const [loading, setLoading] = useState(false);

  const availableServers = allServers.filter(s => s.orchestrator_id === formData.orchestrator_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/sessions', formData);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-2xl w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl">Create Gaming Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Session Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Friday Night Raid"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Let's conquer the dungeon together!"
              className="w-full"
              rows="2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Orchestrator</label>
              <select
                value={formData.orchestrator_id}
                onChange={(e) => setFormData({ ...formData, orchestrator_id: e.target.value, server_uid: '' })}
                required
                className="w-full"
              >
                {orchestrators.map((orch) => (
                  <option key={orch.id} value={orch.id}>{orch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Server (Optional)</label>
              <select
                value={formData.server_uid}
                onChange={(e) => setFormData({ ...formData, server_uid: e.target.value })}
                className="w-full"
              >
                <option value="">-- Any Server --</option>
                {availableServers.map((server) => (
                  <option key={`${server.game_uid}.${server.servername}`} value={`${server.game_uid}.${server.servername}`}>
                    {server.servername} ({server.game_uid})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Scheduled Time</label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                required
                min="30"
                max="480"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="gold-button flex-1 py-2 rounded">
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main HomePage Component
export const HomePage = ({ user, orchestrators, selectedOrch, serversData, permissions, features, onServerClick }) => {
  // Collect all servers for session creation
  const allServers = [];
  Object.entries(serversData || {}).forEach(([orchId, orchData]) => {
    if (orchData.servers) {
      orchData.servers.forEach(server => {
        allServers.push({ ...server, orchestrator_id: orchId });
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Overview */}
      <DashboardOverview serversData={serversData} orchestrators={orchestrators} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active Servers & Online Users */}
        <div className="space-y-6">
          {/* Online Users */}
          {features?.online_users && (
            <OnlineUsersCard enabled={features?.online_users} />
          )}

          {/* Active Servers */}
          <div className="medieval-border rounded-lg p-4 animate-fade-in">
            <h3 className="warcraft-subtitle text-lg mb-3 flex items-center gap-2">
              <Server className="w-5 h-5" /> Active Servers
            </h3>
            <ActiveServersList serversData={serversData} onServerClick={onServerClick} />
          </div>
        </div>

        {/* Middle Column - Chat (only render if chat feature is enabled) */}
        {features?.chat !== false && (
          <div className="medieval-border rounded-lg p-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CommunityChat 
              user={user} 
              enabled={true}
              canModerate={permissions?.can_moderate_chat}
            />
          </div>
        )}

        {/* Right Column - Gaming Sessions */}
        <div className="medieval-border rounded-lg p-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <GamingSessions 
            orchestrators={orchestrators}
            allServers={allServers}
            enabled={features?.gaming_sessions !== false}
            user={user}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
