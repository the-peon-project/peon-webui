import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, Send, CheckCircle, XCircle, Loader2, 
  MessageSquare, Mail, AlertCircle, Save
} from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../common/Loading';

// Discord Icon Component (since lucide doesn't have one)
const DiscordIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

/**
 * Notifications Settings Panel for Admin
 */
export const NotificationsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [activeTab, setActiveTab] = useState('discord');
  const [status, setStatus] = useState({ discord: {}, email: {} });
  
  // Discord config
  const [discordConfig, setDiscordConfig] = useState({
    webhook_url: '',
    enabled: false,
    notify_server_start: true,
    notify_server_stop: true,
    notify_new_session: true,
    notify_user_join: false
  });
  
  // Email config
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    enabled: false,
    notify_server_start: true,
    notify_server_stop: true,
    notify_new_session: true
  });

  const loadConfigs = useCallback(async () => {
    try {
      const [statusRes, discordRes, emailRes] = await Promise.all([
        api.get('/notifications/status'),
        api.get('/notifications/discord/config'),
        api.get('/notifications/email/config')
      ]);
      
      setStatus(statusRes.data);
      if (discordRes.data) {
        setDiscordConfig(prev => ({ ...prev, ...discordRes.data }));
      }
      if (emailRes.data) {
        setEmailConfig(prev => ({ ...prev, ...emailRes.data }));
      }
    } catch (err) {
      console.error('Failed to load notification configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSaveDiscord = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/discord/config', discordConfig);
      loadConfigs();
      alert('Discord settings saved!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/email/config', emailConfig);
      loadConfigs();
      alert('Email settings saved!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel) => {
    setTesting(channel);
    try {
      const payload = { channel };
      if (channel === 'email') {
        const email = prompt('Enter email address to send test notification:');
        if (!email) {
          setTesting(null);
          return;
        }
        payload.recipient = email;
      }
      
      const response = await api.post('/notifications/test', payload);
      alert(response.data.message);
    } catch (err) {
      alert('Test failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTesting(null);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="warcraft-subtitle text-xl flex items-center gap-2">
          <Bell className="w-5 h-5" /> External Notifications
        </h3>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <DiscordIcon className="w-4 h-4 text-indigo-400" />
            <span className={status.discord?.enabled ? 'text-green-400' : 'text-gray-500'}>
              {status.discord?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className={status.email?.enabled ? 'text-green-400' : 'text-gray-500'}>
              {status.email?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-purple-800/50 pb-3">
        <button
          onClick={() => setActiveTab('discord')}
          className={`px-4 py-2 rounded-t flex items-center gap-2 transition-colors ${
            activeTab === 'discord' ? 'gold-button' : 'gray-button'
          }`}
        >
          <DiscordIcon className="w-4 h-4" /> Discord
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 rounded-t flex items-center gap-2 transition-colors ${
            activeTab === 'email' ? 'gold-button' : 'gray-button'
          }`}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
      </div>

      {/* Discord Config */}
      {activeTab === 'discord' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-300 mb-2 flex items-center gap-2">
              <DiscordIcon className="w-5 h-5" /> Discord Webhook
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              Send notifications to a Discord channel. Create a webhook in your Discord server settings.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Webhook URL</label>
                <input
                  type="text"
                  value={discordConfig.webhook_url}
                  onChange={(e) => setDiscordConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full"
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discordConfig.enabled}
                  onChange={(e) => setDiscordConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <span>Enable Discord notifications</span>
              </label>
            </div>
          </div>

          {/* Event Types */}
          <div className="stone-texture rounded-lg p-4">
            <h4 className="font-semibold mb-3">Notify On:</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'notify_server_start', label: 'Server Start', icon: CheckCircle },
                { key: 'notify_server_stop', label: 'Server Stop', icon: XCircle },
                { key: 'notify_new_session', label: 'New Gaming Session', icon: MessageSquare },
                { key: 'notify_user_join', label: 'User Join Session', icon: Bell },
              ].map(({ key, label, icon: Icon }) => (
                <label 
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                    discordConfig[key] ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={discordConfig[key]}
                    onChange={(e) => setDiscordConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleTest('discord')}
              disabled={testing === 'discord' || !discordConfig.webhook_url}
              className="gray-button px-4 py-2 rounded flex items-center gap-2"
            >
              {testing === 'discord' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test
            </button>
            <button
              onClick={handleSaveDiscord}
              disabled={saving}
              className="gold-button px-4 py-2 rounded flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Discord Settings
            </button>
          </div>
        </div>
      )}

      {/* Email Config */}
      {activeTab === 'email' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5" /> Email (SMTP)
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              Send email notifications via SMTP. Works with services like Gmail, SendGrid, Mailgun, etc.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={emailConfig.smtp_host}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={emailConfig.smtp_port}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">SMTP Username</label>
                <input
                  type="text"
                  value={emailConfig.smtp_user}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
                  placeholder="your-email@gmail.com"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">SMTP Password</label>
                <input
                  type="password"
                  value={emailConfig.smtp_password}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                  placeholder="App password or API key"
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-2">From Email</label>
                <input
                  type="email"
                  value={emailConfig.from_email}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, from_email: e.target.value }))}
                  placeholder="noreply@yourdomain.com"
                  className="w-full"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={emailConfig.enabled}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span>Enable Email notifications</span>
            </label>
          </div>

          {/* Event Types for Email */}
          <div className="stone-texture rounded-lg p-4">
            <h4 className="font-semibold mb-3">Notify On:</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'notify_server_start', label: 'Server Start' },
                { key: 'notify_server_stop', label: 'Server Stop' },
                { key: 'notify_new_session', label: 'New Session' },
              ].map(({ key, label }) => (
                <label 
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                    emailConfig[key] ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={emailConfig[key]}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
            <p className="text-yellow-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              For Gmail, use an App Password instead of your regular password. 
              Enable 2FA and create an app password in your Google Account settings.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleTest('email')}
              disabled={testing === 'email' || !emailConfig.smtp_host}
              className="gray-button px-4 py-2 rounded flex items-center gap-2"
            >
              {testing === 'email' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test Email
            </button>
            <button
              onClick={handleSaveEmail}
              disabled={saving}
              className="gold-button px-4 py-2 rounded flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Email Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
