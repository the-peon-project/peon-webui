import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, HardDrive, Clock, Users } from 'lucide-react';
import { api } from '../../utils/api';
import { SkeletonStats } from '../common/Loading';

/**
 * Server Health/Usage Stats Component
 */
export const ServerHealthStats = ({ server, orchId, showLabel = true }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const serverUid = `${server.game_uid}.${server.servername}`;
      const response = await api.get(`/proxy/${orchId}/server/stats/${serverUid}`);
      setStats(response.data);
    } catch (err) {
      // Stats not available, that's okay
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [server.game_uid, server.servername, orchId]);

  useEffect(() => {
    if (server.container_state === 'running') {
      loadStats();
      const interval = setInterval(loadStats, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [server.container_state, loadStats]);

  if (server.container_state !== 'running') return null;
  
  if (loading) {
    return <SkeletonStats />;
  }
  
  if (!stats) return null;

  const getColorClass = (value, thresholds = { warning: 50, danger: 80 }) => {
    if (value >= thresholds.danger) return 'text-red-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {stats.cpu_percent !== undefined && (
        <div className="stat-card animate-fade-in">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Cpu className="w-3 h-3 text-gray-500" />
            {showLabel && <span className="text-xs text-gray-500">CPU</span>}
          </div>
          <div className={`stat-value text-lg ${getColorClass(stats.cpu_percent)}`}>
            {stats.cpu_percent?.toFixed(1)}%
          </div>
        </div>
      )}
      
      {stats.memory_percent !== undefined && (
        <div className="stat-card animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <HardDrive className="w-3 h-3 text-gray-500" />
            {showLabel && <span className="text-xs text-gray-500">MEM</span>}
          </div>
          <div className={`stat-value text-lg ${getColorClass(stats.memory_percent)}`}>
            {stats.memory_percent?.toFixed(1)}%
          </div>
        </div>
      )}
      
      {stats.uptime && (
        <div className="stat-card animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-gray-500" />
            {showLabel && <span className="text-xs text-gray-500">UP</span>}
          </div>
          <div className="stat-value text-lg text-blue-400">
            {stats.uptime}
          </div>
        </div>
      )}
      
      {stats.players !== undefined && (
        <div className="stat-card col-span-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-gray-500" />
            {showLabel && <span className="text-xs text-gray-500">PLAYERS</span>}
          </div>
          <div className="stat-value text-lg text-purple-400">
            {stats.players}{stats.max_players ? `/${stats.max_players}` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerHealthStats;
