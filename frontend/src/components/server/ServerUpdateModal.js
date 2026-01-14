import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Modal, ModalFooter } from '../common/Modal';
import { api } from '../../utils/api';

/**
 * Update options available from the orchestrator API
 */
const UPDATE_MODES = [
  {
    id: 'full',
    name: 'Full Update',
    description: 'Complete update including game files, configs, and mods',
    icon: '🔄',
  },
  {
    id: 'quick',
    name: 'Quick Update',
    description: 'Fast update - game files only, preserves configs',
    icon: '⚡',
  },
  {
    id: 'validate',
    name: 'Validate Files',
    description: 'Check and repair corrupted game files',
    icon: '🔍',
  },
];

/**
 * Server Update Modal with update options
 */
export const ServerUpdateModal = ({ server, orchestratorId, onClose, onSuccess }) => {
  const [selectedMode, setSelectedMode] = useState('full');
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpdate = async () => {
    setUpdating(true);
    setResult(null);

    try {
      const serverUid = `${server.game_uid}.${server.servername}`;
      const response = await api.put(
        `/proxy/${orchestratorId}/server/update/${serverUid}`,
        { mode: selectedMode }
      );
      
      setResult({
        success: true,
        message: 'Update initiated successfully',
        data: response.data,
      });
      
      // Notify parent after short delay
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.detail || 'Update failed',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Server" size="md">
      <div className="mb-4">
        <p className="text-gray-400 mb-2">
          Update <span className="text-white font-semibold">{server.servername}</span>
        </p>
        <p className="text-sm text-gray-500">
          Select an update mode below. The server may restart during the update process.
        </p>
      </div>

      {/* Update Mode Selection */}
      <div className="space-y-3 mb-6">
        {UPDATE_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            disabled={updating}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              selectedMode === mode.id
                ? 'bg-purple-900/50 border-2 border-purple-500'
                : 'bg-black/20 border-2 border-transparent hover:border-purple-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{mode.icon}</span>
              <div>
                <h4 className="font-semibold text-white">{mode.name}</h4>
                <p className="text-sm text-gray-400">{mode.description}</p>
              </div>
              {selectedMode === mode.id && (
                <div className="ml-auto text-purple-400">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`p-4 rounded-lg mb-4 ${
            result.success
              ? 'bg-green-900/30 border border-green-700'
              : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={result.success ? 'text-green-300' : 'text-red-300'}>
            {result.success ? '✓' : '✗'} {result.message}
          </p>
        </div>
      )}

      {/* Warning */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-4">
        <p className="text-yellow-300 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>
            Running servers may be temporarily stopped during the update.
            Active players will be disconnected.
          </span>
        </p>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="gray-button flex-1 py-2 rounded"
          disabled={updating}
        >
          Cancel
        </button>
        <button
          onClick={handleUpdate}
          disabled={updating || result?.success}
          className="gold-button flex-1 py-2 rounded flex items-center justify-center gap-2"
        >
          {updating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Start Update
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default ServerUpdateModal;
