import React, { useState, useEffect, useCallback } from 'react';
import { 
  Archive, Download, Upload, Trash2, RefreshCw, 
  Clock, HardDrive, CheckCircle, AlertCircle, Loader2, RotateCcw
} from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../common/Loading';

/**
 * Backup & Restore Panel for Admin
 */
export const BackupRestorePanel = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(null);
  const [restoreOptions, setRestoreOptions] = useState({
    restore_users: false,
    restore_orchestrators: true,
    restore_chat: false,
    restore_sessions: false,
    restore_settings: true
  });

  const loadBackups = useCallback(async () => {
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const response = await api.post('/backup/create');
      if (response.data.success) {
        loadBackups();
        alert(`Backup created: ${response.data.filename}`);
      }
    } catch (err) {
      alert('Failed to create backup: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await api.get(`/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download backup');
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;
    
    try {
      await api.delete(`/backup/${filename}`);
      loadBackups();
    } catch (err) {
      alert('Failed to delete backup');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('Only .zip backup files are allowed');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/backup/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        loadBackups();
        alert(`Backup uploaded: ${response.data.filename}`);
      }
    } catch (err) {
      alert('Failed to upload backup: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRestore = async (filename) => {
    setRestoring(filename);
    try {
      const response = await api.post(`/backup/restore/${filename}`, restoreOptions);
      
      if (response.data.success) {
        alert(`Restored ${response.data.restored_items?.length || 0} items from backup`);
        setShowRestoreModal(null);
      }
    } catch (err) {
      alert('Restore failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="warcraft-subtitle text-xl flex items-center gap-2">
          <Archive className="w-5 h-5" /> Backup & Restore
        </h3>
        
        <div className="flex items-center gap-3">
          <label className="gray-button px-4 py-2 rounded flex items-center gap-2 cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload Backup
            <input 
              type="file" 
              accept=".zip"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="gold-button px-4 py-2 rounded flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Create Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          <strong>About Backups:</strong> Backups include user accounts (without passwords), 
          orchestrator configurations, gaming sessions, access controls, and system settings. 
          User passwords are not backed up for security reasons and will need to be reset after restore.
        </p>
      </div>

      {/* Backups List */}
      {backups.length === 0 ? (
        <div className="text-center py-12 stone-texture rounded-lg">
          <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h4 className="warcraft-subtitle text-lg mb-2">No Backups Yet</h4>
          <p className="text-gray-400 mb-4">Create your first backup to protect your configuration.</p>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="gold-button px-6 py-2 rounded"
          >
            Create First Backup
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => (
            <div 
              key={backup.filename}
              className="bg-black/20 border border-purple-800/30 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-900/30">
                  <Archive className="w-5 h-5 text-purple-400" />
                </div>
                
                <div>
                  <h4 className="font-semibold">{backup.filename}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(backup.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {backup.size_human}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRestoreModal(backup.filename)}
                  className="blue-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
                  title="Restore from this backup"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
                <button
                  onClick={() => handleDownload(backup.filename)}
                  className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
                  title="Download backup file"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                <button
                  onClick={() => handleDelete(backup.filename)}
                  className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-900/30 rounded transition-colors"
                  title="Delete backup"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="modal-backdrop flex items-center justify-center p-4" onClick={() => setShowRestoreModal(null)}>
          <div 
            className="medieval-border rounded-lg p-6 max-w-md w-full animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="warcraft-subtitle text-xl mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> Restore Options
            </h3>
            
            <p className="text-sm text-gray-400 mb-4">
              Select what to restore from <strong>{showRestoreModal}</strong>:
            </p>

            <div className="space-y-3 mb-6">
              {[
                { key: 'restore_orchestrators', label: 'Orchestrator Configurations', desc: 'Restore orchestrator settings' },
                { key: 'restore_settings', label: 'System Settings', desc: 'Feature flags and configurations' },
                { key: 'restore_sessions', label: 'Gaming Sessions', desc: 'Scheduled gaming sessions' },
                { key: 'restore_users', label: 'User Accounts', desc: 'Users (passwords will need reset)', warn: true },
                { key: 'restore_chat', label: 'Chat Messages', desc: 'Community chat history' },
              ].map((option) => (
                <label 
                  key={option.key}
                  className={`flex items-start gap-3 p-3 rounded cursor-pointer transition-colors ${
                    restoreOptions[option.key] ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-black/20 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={restoreOptions[option.key]}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      [option.key]: e.target.checked
                    }))}
                    className="mt-1"
                  />
                  <div>
                    <div className={`font-medium ${option.warn ? 'text-yellow-400' : ''}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3 mb-4">
              <p className="text-yellow-300 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Restore will add missing items. Existing data will not be overwritten.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreModal(null)}
                className="gray-button flex-1 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showRestoreModal)}
                disabled={restoring === showRestoreModal}
                className="gold-button flex-1 py-2 rounded flex items-center justify-center gap-2"
              >
                {restoring === showRestoreModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRestorePanel;
