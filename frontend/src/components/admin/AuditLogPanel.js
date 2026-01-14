import React, { useState, useEffect } from 'react';
import { FileText, Users, Server, MessageSquare, Calendar, Shield, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../common/Loading';

const CATEGORY_ICONS = {
  user: Users,
  server: Server,
  chat: MessageSquare,
  session: Calendar,
  auth: Shield,
  system: FileText,
};

const CATEGORY_COLORS = {
  user: 'text-blue-400 bg-blue-900/30',
  server: 'text-green-400 bg-green-900/30',
  chat: 'text-purple-400 bg-purple-900/30',
  session: 'text-yellow-400 bg-yellow-900/30',
  auth: 'text-red-400 bg-red-900/30',
  system: 'text-gray-400 bg-gray-900/30',
};

const ACTION_COLORS = {
  create: 'text-green-400',
  update: 'text-blue-400',
  delete: 'text-red-400',
  login: 'text-purple-400',
  logout: 'text-gray-400',
  action: 'text-yellow-400',
  ban: 'text-red-400',
  unban: 'text-green-400',
  clear: 'text-orange-400',
};

/**
 * Audit Log Panel for Admin
 */
export const AuditLogPanel = () => {
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [limit, setLimit] = useState(50);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await api.get(`/admin/audit-log?${params}`);
      setLogs(response.data.logs);
      setCounts(response.data.counts);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, limit]);

  const categories = ['user', 'server', 'chat', 'session', 'auth', 'system'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="warcraft-subtitle text-xl">Audit Log</h3>
        <button
          onClick={loadLogs}
          className="gray-button px-3 py-1 rounded flex items-center gap-2 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            !selectedCategory ? 'gold-button' : 'gray-button'
          }`}
        >
          All ({Object.values(counts).reduce((a, b) => a + b, 0)})
        </button>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 transition-colors ${
                selectedCategory === cat ? 'gold-button' : 'gray-button'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.charAt(0).toUpperCase() + cat.slice(1)} ({counts[cat] || 0})
            </button>
          );
        })}
      </div>

      {/* Log Entries */}
      <div className="bg-black/20 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No audit logs found
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {logs.map((log, index) => {
              const Icon = CATEGORY_ICONS[log.category] || FileText;
              const categoryColor = CATEGORY_COLORS[log.category] || CATEGORY_COLORS.system;
              const actionColor = ACTION_COLORS[log.action_type] || 'text-gray-400';
              
              return (
                <div 
                  key={log.id} 
                  className="p-3 hover:bg-white/5 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${categoryColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{log.username}</span>
                        <span className={`text-sm ${actionColor}`}>
                          {log.action_type}
                        </span>
                        {log.target_type && (
                          <span className="text-sm text-gray-500">
                            {log.target_type}
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-400 mt-1">{log.details}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load More */}
      {logs.length >= limit && (
        <div className="text-center">
          <button
            onClick={() => setLimit(prev => prev + 50)}
            className="gray-button px-4 py-2 rounded text-sm"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
