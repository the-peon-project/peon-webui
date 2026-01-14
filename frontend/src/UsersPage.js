import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Shield, UserCog, Key, 
  Link, Unlink, Server, MessageSquare, Ban, Loader2, X,
  Check, AlertCircle
} from 'lucide-react';
import { api } from './utils/api';
import { LoadingSpinner } from './components/common/Loading';

// User Card Component
const UserCard = ({ user, orchestrators, onEdit, onDelete, onResetPassword, onLink, onUnlink, onBan, onUnban }) => {
  const [showLinks, setShowLinks] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-900/50 text-red-400 border-red-500';
      case 'moderator':
        return 'bg-blue-900/50 text-blue-400 border-blue-500';
      default:
        return 'bg-gray-900/50 text-gray-400 border-gray-500';
    }
  };

  return (
    <div className="stone-texture p-4 rounded-lg animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center text-xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold">{user.username}</h4>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${getRoleBadge(user.role)}`}>
          {user.role}
        </span>
      </div>

      {/* Chat Ban Status */}
      {user.is_chat_banned && (
        <div className="bg-red-900/30 border border-red-500 p-2 rounded mb-3 flex items-center gap-2 text-sm">
          <Ban className="w-4 h-4 text-red-400" />
          <span className="text-red-300">Banned from chat</span>
        </div>
      )}

      {/* Orchestrator Links */}
      <div className="mb-3">
        <button
          onClick={() => setShowLinks(!showLinks)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          <Link className="w-3 h-3" />
          {user.orchestrators?.length || 0} orchestrator(s) linked
        </button>
        
        {showLinks && user.orchestrators && user.orchestrators.length > 0 && (
          <div className="mt-2 space-y-1">
            {user.orchestrators.map((orch) => (
              <div 
                key={orch.id}
                className="flex items-center justify-between text-sm bg-black/20 p-2 rounded"
              >
                <span>{orch.name}</span>
                <button
                  onClick={() => onUnlink(user.id, orch.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Unlink"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(user)}
          className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
        >
          <Edit className="w-3 h-3" /> Edit
        </button>
        
        <button
          onClick={() => onResetPassword(user)}
          className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
        >
          <Key className="w-3 h-3" /> Reset Password
        </button>
        
        <button
          onClick={() => onLink(user)}
          className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1"
        >
          <Link className="w-3 h-3" /> Link
        </button>
        
        {user.is_chat_banned ? (
          <button
            onClick={() => onUnban(user.id)}
            className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1 text-green-400"
          >
            <Check className="w-3 h-3" /> Unban
          </button>
        ) : (
          <button
            onClick={() => onBan(user.id)}
            className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1 text-yellow-400"
          >
            <Ban className="w-3 h-3" /> Ban Chat
          </button>
        )}
        
        {user.role !== 'admin' && (
          <button
            onClick={() => onDelete(user.id)}
            className="gray-button px-3 py-1.5 rounded text-sm flex items-center gap-1 text-red-400"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>
    </div>
  );
};

// Create/Edit User Modal
const UserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, user?.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-md w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl">
            {user ? 'Edit User' : 'Create User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full"
              disabled={!!user}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full"
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!user}
                minLength={8}
                className="w-full"
                placeholder="Minimum 8 characters"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full"
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="gold-button flex-1 py-2 rounded">
              {loading ? 'Saving...' : user ? 'Update' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reset Password Modal
const ResetPasswordModal = ({ user, onClose, onSave }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await onSave(user.id, newPassword);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-md w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Reset password for <strong className="text-white">{user.username}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 p-3 rounded flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="gold-button flex-1 py-2 rounded">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Link User to Orchestrator/Server Modal
const LinkUserModal = ({ user, orchestrators, onClose, onLinkOrch, onLinkServer }) => {
  const [linkType, setLinkType] = useState('orchestrator');
  const [selectedOrch, setSelectedOrch] = useState('');
  const [serverUid, setServerUid] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    try {
      if (linkType === 'orchestrator') {
        await onLinkOrch(user.id, selectedOrch);
      } else {
        await onLinkServer(user.id, selectedOrch, serverUid);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="medieval-border rounded-lg p-6 max-w-md w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="warcraft-subtitle text-2xl">Link User Access</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Grant access to <strong className="text-white">{user.username}</strong>
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setLinkType('orchestrator')}
              className={`flex-1 py-2 rounded text-sm ${
                linkType === 'orchestrator' ? 'gold-button' : 'gray-button'
              }`}
            >
              Orchestrator
            </button>
            <button
              onClick={() => setLinkType('server')}
              className={`flex-1 py-2 rounded text-sm ${
                linkType === 'server' ? 'gold-button' : 'gray-button'
              }`}
            >
              Specific Server
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Orchestrator</label>
            <select
              value={selectedOrch}
              onChange={(e) => setSelectedOrch(e.target.value)}
              className="w-full"
            >
              <option value="">-- Select Orchestrator --</option>
              {orchestrators.map((orch) => (
                <option key={orch.id} value={orch.id}>{orch.name}</option>
              ))}
            </select>
          </div>

          {linkType === 'server' && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Server UID</label>
              <input
                type="text"
                value={serverUid}
                onChange={(e) => setServerUid(e.target.value)}
                placeholder="game_uid.servername"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Format: game_uid.servername (e.g., valheim.myserver)</p>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700/50 p-3 rounded text-sm text-blue-300">
            <strong>Note:</strong> {linkType === 'orchestrator' 
              ? 'User will have access to all servers in this orchestrator.'
              : 'User will only have access to this specific server.'}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="gray-button flex-1 py-2 rounded">
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={loading || !selectedOrch || (linkType === 'server' && !serverUid)}
              className="gold-button flex-1 py-2 rounded flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Users Page
export const UsersPage = ({ orchestrators }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [linkingUser, setLinkingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (formData, userId) => {
    if (userId) {
      await api.put(`/admin/users/${userId}`, formData);
    } else {
      await api.post('/admin/users', formData);
    }
    loadUsers();
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    await api.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
    loadUsers();
  };

  const handleLinkOrch = async (userId, orchId) => {
    await api.post('/admin/link-user-orchestrator', { user_id: userId, orchestrator_id: orchId });
    loadUsers();
  };

  const handleUnlinkOrch = async (userId, orchId) => {
    await api.delete('/admin/link-user-orchestrator', { data: { user_id: userId, orchestrator_id: orchId } });
    loadUsers();
  };

  const handleLinkServer = async (userId, orchId, serverUid) => {
    await api.post('/admin/link-user-server', { user_id: userId, orchestrator_id: orchId, server_uid: serverUid });
    loadUsers();
  };

  const handleBanChat = async (userId) => {
    if (!window.confirm('Ban this user from chat?')) return;
    try {
      await api.post(`/admin/users/${userId}/ban-chat`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to ban user');
    }
  };

  const handleUnbanChat = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unban-chat`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to unban user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="warcraft-subtitle text-2xl flex items-center gap-2">
          <Users className="w-6 h-6" /> User Management
        </h2>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 rounded bg-black/30 border border-gray-700 text-sm w-48"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="gold-button px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-value text-purple-400">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-red-400">{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-blue-400">{users.filter(u => u.role === 'moderator').length}</div>
          <div className="stat-label">Moderators</div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 stone-texture rounded-lg">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="warcraft-subtitle text-xl mb-2">No Users Found</h3>
          <p className="text-gray-400">Create a user to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              orchestrators={orchestrators}
              onEdit={setEditingUser}
              onDelete={handleDeleteUser}
              onResetPassword={setResetPasswordUser}
              onLink={setLinkingUser}
              onUnlink={handleUnlinkOrch}
              onBan={handleBanChat}
              onUnban={handleUnbanChat}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreateModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowCreateModal(false); setEditingUser(null); }}
          onSave={handleSaveUser}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSave={handleResetPassword}
        />
      )}

      {linkingUser && (
        <LinkUserModal
          user={linkingUser}
          orchestrators={orchestrators}
          onClose={() => setLinkingUser(null)}
          onLinkOrch={handleLinkOrch}
          onLinkServer={handleLinkServer}
        />
      )}
    </div>
  );
};

export default UsersPage;
