import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Calendar, Activity, Save, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../common/Loading';

const FEATURES = [
  {
    id: 'online_users',
    name: 'Online Users',
    description: 'Show a card on the homepage with currently logged-in users',
    icon: Users,
  },
  {
    id: 'chat',
    name: 'Community Chat',
    description: 'Enable the real-time community chat feature',
    icon: MessageSquare,
  },
  {
    id: 'gaming_sessions',
    name: 'Gaming Sessions',
    description: 'Allow users to create and join scheduled gaming sessions',
    icon: Calendar,
  },
  {
    id: 'server_stats',
    name: 'Server Stats',
    description: 'Display CPU, memory, and uptime stats for running servers',
    icon: Activity,
  },
];

/**
 * Feature Toggles Panel for Admin
 * @param {Object} props
 * @param {Function} props.onFeaturesChange - Callback when features are saved
 */
export const FeatureTogglesPanel = ({ onFeaturesChange }) => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const response = await api.get('/admin/features');
      setFeatures(response.data);
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (featureId) => {
    setFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/features', features);
      setHasChanges(false);
      // Notify parent to refresh features across the app
      if (onFeaturesChange) {
        onFeaturesChange();
      }
    } catch (err) {
      console.error('Failed to save features:', err);
      alert('Failed to save feature settings');
    } finally {
      setSaving(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="warcraft-subtitle text-xl">Feature Toggles</h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="gold-button px-4 py-2 rounded flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isEnabled = features[feature.id] ?? true;
          
          return (
            <div 
              key={feature.id}
              className={`p-4 rounded-lg transition-all ${
                isEnabled 
                  ? 'bg-purple-900/30 border border-purple-700/50' 
                  : 'bg-black/20 border border-gray-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isEnabled ? 'bg-purple-800/50' : 'bg-gray-800/50'}`}>
                  <Icon className={`w-5 h-5 ${isEnabled ? 'text-purple-400' : 'text-gray-500'}`} />
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-semibold ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
                    {feature.name}
                  </h4>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
                
                <button
                  onClick={() => handleToggle(feature.id)}
                  className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                  aria-label={`Toggle ${feature.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mt-4">
        <p className="text-yellow-300 text-sm">
          <strong>Note:</strong> Disabling features will hide them from all users immediately. 
          Data is preserved and will be available when the feature is re-enabled.
        </p>
      </div>
    </div>
  );
};

export default FeatureTogglesPanel;
