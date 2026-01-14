import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/Loading';
import { api } from '../../utils/api';
import { formatKeyName, getValueColor } from '../../utils/jsonParser';
import { handleLogoError } from '../../utils/logos';

/**
 * Recursive JSON item renderer
 */
const JsonItem = ({ itemKey, value, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const hasChildren = isObject && Object.keys(value).length > 0;
  
  const paddingLeft = depth * 16;
  
  if (!isObject) {
    return (
      <div 
        className="flex items-start gap-2 py-1 hover:bg-white/5 rounded px-2 transition-colors"
        style={{ paddingLeft }}
      >
        <span className="json-key text-sm">{formatKeyName(itemKey)}:</span>
        <span className={`text-sm ${getValueColor(value, itemKey)}`}>
          {value === null ? 'null' : value === '' ? '(empty)' : String(value)}
        </span>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 w-full text-left transition-colors"
        style={{ paddingLeft }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )
        ) : (
          <span className="w-4" />
        )}
        <span className="json-key text-sm font-medium">{formatKeyName(itemKey)}</span>
        <span className="text-xs text-gray-500">
          {isArray ? `[${value.length}]` : `{${Object.keys(value).length}}`}
        </span>
      </button>
      
      {isExpanded && hasChildren && (
        <div className="json-indent ml-2 border-l border-purple-800/30">
          {isArray ? (
            value.map((item, index) => (
              <JsonItem key={index} itemKey={`[${index}]`} value={item} depth={depth + 1} />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <JsonItem key={key} itemKey={key} value={val} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Server Info Modal with parsed JSON display
 */
export const ServerInfoModal = ({ server, orchestratorId, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('parsed'); // 'parsed' or 'raw'

  useEffect(() => {
    loadServerInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServerInfo = async () => {
    try {
      const serverUid = `${server.game_uid}.${server.servername}`;
      const response = await api.get(`/proxy/${orchestratorId}/server/info/${serverUid}`);
      setInfo(response.data);
    } catch (err) {
      console.error('Failed to load server info:', err);
      setInfo({ error: 'Failed to load server information' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="" size="lg">
      {/* Custom Header with Logo */}
      <div className="flex items-start gap-4 mb-6 -mt-2">
        <div className="flex-1">
          <h2 className="warcraft-title text-2xl mb-1">{server.servername}</h2>
          <p className="text-sm text-gray-400">{server.game_uid}</p>
          <span
            className={`text-xs font-bold px-2 py-1 rounded inline-block mt-2 ${
              server.container_state === 'running' 
                ? 'bg-green-900/50 status-online' 
                : 'bg-red-900/50 status-offline'
            }`}
          >
            {server.container_state?.toUpperCase()}
          </span>
        </div>
        <img 
          src={`/game-logos/${server.game_uid}.png`}
          alt={server.game_uid}
          className="game-logo-large"
          onError={handleLogoError}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('parsed')}
          className={`px-4 py-2 rounded text-sm transition-colors ${
            viewMode === 'parsed' ? 'gold-button' : 'gray-button'
          }`}
        >
          Formatted View
        </button>
        <button
          onClick={() => setViewMode('raw')}
          className={`px-4 py-2 rounded text-sm transition-colors ${
            viewMode === 'raw' ? 'gold-button' : 'gray-button'
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : info?.error ? (
        <div className="bg-red-900/30 border border-red-500 p-4 rounded">
          <p className="text-red-300">{info.error}</p>
        </div>
      ) : viewMode === 'parsed' ? (
        <div className="bg-black/20 rounded-lg p-4 max-h-[60vh] overflow-y-auto scroll-area">
          {Object.entries(info).map(([key, value]) => (
            <JsonItem key={key} itemKey={key} value={value} depth={0} />
          ))}
        </div>
      ) : (
        <pre className="bg-black/30 p-4 rounded overflow-auto max-h-[60vh] text-sm scroll-area">
          {JSON.stringify(info, null, 2)}
        </pre>
      )}
    </Modal>
  );
};

export default ServerInfoModal;
