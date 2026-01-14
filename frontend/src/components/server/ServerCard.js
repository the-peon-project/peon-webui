import React, { useState } from 'react';
import { Play, Square, RefreshCw, ArrowUpCircle, Info, Lock } from 'lucide-react';
import { ServerHealthStats } from './ServerHealthStats';
import { handleLogoError } from '../../utils/logos';

/**
 * Server Card Component (Grid View) - Logo on right
 */
export const ServerCard = ({ 
  server, 
  orchId, 
  loading, 
  onAction, 
  onInfo, 
  onUpdate,
  canManageServers = true,
  className = ''
}) => {
  const serverUid = `${server.game_uid}.${server.servername}`;
  const isRunning = server.container_state === 'running';
  const isStopped = ['exited', 'created'].includes(server.container_state);

  return (
    <div 
      className={`stone-texture p-4 rounded card-hover server-card animate-fade-in ${className}`}
      data-testid="server-card"
    >
      {/* Header with Logo on Right */}
      <div className="server-card-header mb-3">
        <div className="server-card-info">
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
        <div className="server-card-logo">
          <img 
            src={`/game-logos/${server.game_uid}.png`}
            alt={server.game_uid}
            className="game-logo-right"
            onError={handleLogoError}
          />
        </div>
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
                <div className="spinner w-4 h-4"></div>
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
                <div className="spinner w-4 h-4"></div>
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
                <div className="spinner w-4 h-4"></div>
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
          onClick={onInfo}
          className={`gray-button py-2 rounded text-sm flex items-center justify-center gap-1 ${
            !canManageServers ? 'col-span-2' : ''
          }`}
        >
          <Info className="w-3 h-3" /> Info
        </button>
      </div>
    </div>
  );
};

/**
 * Server List Item Component (List View)
 */
export const ServerListItem = ({ 
  server, 
  orchId, 
  loading, 
  onAction, 
  onInfo,
  canManageServers = true 
}) => {
  const serverUid = `${server.game_uid}.${server.servername}`;
  const isRunning = server.container_state === 'running';

  return (
    <div 
      className="stone-texture p-3 rounded flex items-center gap-3 animate-fade-in card-hover" 
      data-testid="server-list-item"
    >
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
          <button
            onClick={() => onAction(orchId, isRunning ? 'stop' : 'start', serverUid)}
            disabled={loading[`${orchId}_${serverUid}_${isRunning ? 'stop' : 'start'}`]}
            className={`${isRunning ? 'red-button' : 'gold-button'} px-3 py-1 rounded text-sm`}
          >
            {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={onInfo}
          className="gray-button px-3 py-1 rounded text-sm"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ServerCard;
