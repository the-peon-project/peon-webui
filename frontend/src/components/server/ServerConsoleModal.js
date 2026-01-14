import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, X, Pause, Play, Download, Trash2, RefreshCw } from 'lucide-react';
import { api, BACKEND_URL } from '../../utils/api';
import { LoadingSpinner } from '../common/Loading';

/**
 * Server Console Modal - Real-time console log viewer
 */
export const ServerConsoleModal = ({ server, orchestratorId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  const serverUid = `${server.game_uid}.${server.servername}`;

  const scrollToBottom = useCallback(() => {
    if (!paused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [paused]);

  // Fetch initial logs via HTTP
  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get(`/console/${orchestratorId}/${serverUid}/logs?lines=100`);
      if (response.data.logs) {
        setLogs(response.data.logs.map((log, idx) => ({
          id: `init-${idx}`,
          data: log,
          timestamp: new Date().toISOString()
        })));
      }
      if (response.data.note) {
        setError(response.data.note);
      }
    } catch (err) {
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [orchestratorId, serverUid]);

  // Connect to WebSocket for real-time logs
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = BACKEND_URL.replace('http', 'ws') + `/api/console/ws/${orchestratorId}/${serverUid}?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            // Initial connection message
            setLogs(prev => [...prev, {
              id: `sys-${Date.now()}`,
              data: `[SYSTEM] ${data.message}`,
              timestamp: new Date().toISOString(),
              system: true
            }]);
          } else if (data.type === 'log') {
            setLogs(prev => [...prev, {
              id: `log-${Date.now()}-${Math.random()}`,
              data: data.data,
              timestamp: new Date().toISOString()
            }]);
            scrollToBottom();
          } else if (data.type === 'info') {
            setLogs(prev => [...prev, {
              id: `info-${Date.now()}`,
              data: `[INFO] ${data.message}`,
              timestamp: new Date().toISOString(),
              system: true
            }]);
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch (e) {
          // Plain text log
          setLogs(prev => [...prev, {
            id: `raw-${Date.now()}`,
            data: event.data,
            timestamp: new Date().toISOString()
          }]);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
      };
      
      ws.onerror = () => {
        setConnected(false);
        setError('WebSocket connection failed');
      };
      
      wsRef.current = ws;
    } catch (e) {
      setError('Failed to connect to console');
    }
  }, [orchestratorId, serverUid, scrollToBottom]);

  useEffect(() => {
    fetchLogs();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchLogs, connectWebSocket]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(l => l.data).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serverUid}-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setLogs([]);
    setLoading(true);
    fetchLogs();
  };

  // Color code log lines
  const getLogClass = (log) => {
    const text = log.data.toLowerCase();
    if (log.system) return 'text-blue-400';
    if (text.includes('error') || text.includes('exception') || text.includes('fail')) return 'text-red-400';
    if (text.includes('warn')) return 'text-yellow-400';
    if (text.includes('info')) return 'text-green-400';
    if (text.includes('debug')) return 'text-gray-500';
    return 'text-gray-300';
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg w-full max-w-5xl h-[80vh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-800/50">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="warcraft-subtitle text-xl">Server Console</h2>
              <p className="text-xs text-gray-400">{serverUid}</p>
            </div>
            <div className={`ml-4 px-2 py-1 rounded text-xs ${connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {connected ? '● Live' : '○ Disconnected'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused(!paused)}
              className={`p-2 rounded transition-colors ${paused ? 'bg-yellow-900/50 text-yellow-400' : 'gray-button'}`}
              title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRefresh}
              className="gray-button p-2 rounded"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadLogs}
              className="gray-button p-2 rounded"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearLogs}
              className="gray-button p-2 rounded"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Console Output */}
        <div 
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto bg-black/80 font-mono text-sm p-4"
          style={{ maxHeight: 'calc(80vh - 120px)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-400">Loading console logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs available</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className={`${getLogClass(log)} whitespace-pre-wrap break-all hover:bg-white/5 px-1 rounded`}
                >
                  {log.data}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer with error/status */}
        {error && (
          <div className="p-2 bg-yellow-900/30 border-t border-yellow-700/50 text-yellow-300 text-xs">
            {error}
          </div>
        )}

        <div className="p-2 border-t border-purple-800/50 text-xs text-gray-500 flex items-center justify-between">
          <span>{logs.length} lines</span>
          <span>{paused ? '⏸ Paused' : '▶ Auto-scrolling'}</span>
        </div>
      </div>
    </div>
  );
};

export default ServerConsoleModal;
