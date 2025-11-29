import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, authApi } from '../../services';
import { useAuthStore } from '../../store';
import { getBackendUrl, setBackendUrl, resetBackendUrl } from '../../services/api';
import axios from 'axios';
import {
  KeyIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ServerIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  // Backend URL state
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: async () => {
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: settingsApi.updateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setApiKey('');
      setSaveStatus('API key saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: settingsApi.deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveStatus('API key deleted');
      setTimeout(() => setSaveStatus(null), 3000);
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: settingsApi.exportData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-history-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveStatus('Data exported successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({ username, full_name: fullName });
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      updateApiKeyMutation.mutate(apiKey.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account and API configuration
        </p>
      </div>

      {/* Status Message */}
      {saveStatus && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{saveStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-6 h-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input w-full bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="input w-full"
              />
            </div>

            <button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending}
              className="btn btn-primary"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </div>

        {/* API Key Settings */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <KeyIcon className="w-6 h-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OpenRouter API Key</h2>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              An API key is required to parse prescriptions and medical documents using AI.
              Get your API key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                OpenRouter.ai
              </a>
            </p>
          </div>

          <div className="space-y-4">
            {settings?.has_api_key ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-400">API Key configured</span>
                  </div>
                  <span className="text-sm text-gray-500 font-mono">
                    {settings.api_key_preview}
                  </span>
                </div>
                <button
                  onClick={() => deleteApiKeyMutation.mutate()}
                  disabled={deleteApiKeyMutation.isPending}
                  className="btn btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove API Key
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim() || updateApiKeyMutation.isPending}
                  className="btn btn-primary"
                >
                  {updateApiKeyMutation.isPending ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Export */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <ArrowDownTrayIcon className="w-6 h-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h2>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            Download all your patients, documents, and prescriptions as a JSON file for backup or migration.
          </p>

          <button
            onClick={() => exportDataMutation.mutate()}
            disabled={exportDataMutation.isPending}
            className="btn btn-secondary"
          >
            {exportDataMutation.isPending ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>

        {/* Backend Server Settings */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <ServerIcon className="w-6 h-6 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backend Server</h2>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            Configure the backend API server URL. Useful for self-hosted deployments.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => {
                  setBackendUrlState(e.target.value);
                  setConnectionStatus('idle');
                }}
                placeholder="http://localhost:8000/api/v1"
                className="input w-full pr-24"
              />
              {connectionStatus === 'success' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
                  ✓ Connected
                </span>
              )}
              {connectionStatus === 'error' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-sm">
                  ✗ Failed
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  setIsTestingConnection(true);
                  setConnectionStatus('idle');
                  try {
                    const cleanUrl = backendUrl.replace(/\/+$/, '');
                    // Try the URL as-is first (for URLs with /api/v1)
                    let response;
                    try {
                      response = await axios.get(`${cleanUrl}/health`, { timeout: 5000 });
                    } catch {
                      // Fallback to base URL without /api/v1
                      const baseUrl = cleanUrl.replace(/\/api\/v1\/?$/, '');
                      response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
                    }
                    if (response.status === 200) {
                      setConnectionStatus('success');
                      setBackendUrl(cleanUrl);
                      setSaveStatus('Backend URL updated successfully!');
                      setTimeout(() => setSaveStatus(null), 3000);
                    } else {
                      setConnectionStatus('error');
                    }
                  } catch {
                    setConnectionStatus('error');
                  }
                  setIsTestingConnection(false);
                }}
                disabled={isTestingConnection}
                className="btn btn-primary"
              >
                {isTestingConnection ? 'Testing...' : 'Test & Save'}
              </button>
              
              <button
                onClick={() => {
                  resetBackendUrl();
                  const defaultUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                  setBackendUrlState(defaultUrl);
                  setConnectionStatus('idle');
                  setSaveStatus('Backend URL reset to default');
                  setTimeout(() => setSaveStatus(null), 3000);
                }}
                className="btn btn-secondary"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 space-y-6 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={logout}
              className="btn btn-secondary"
            >
              Log Out
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn bg-red-500 text-white hover:bg-red-600"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Account
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                This will permanently delete your account and all associated data including patients, documents, and prescriptions.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder="Your password"
                  className="input w-full"
                  autoComplete="current-password"
                />
                {deleteError && (
                  <p className="mt-1 text-sm text-red-600">{deleteError}</p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deletePassword) {
                      setDeleteError('Please enter your password');
                      return;
                    }
                    
                    setIsDeleting(true);
                    setDeleteError('');
                    
                    try {
                      // Delete account (password verification happens on backend)
                      await settingsApi.deleteAccount(deletePassword);
                      
                      // Logout and redirect
                      logout();
                    } catch (error: unknown) {
                      const err = error as { response?: { data?: { detail?: string } } };
                      setDeleteError(err.response?.data?.detail || 'Invalid password or deletion failed');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="btn bg-red-500 text-white hover:bg-red-600 flex-1"
                  disabled={isDeleting || !deletePassword}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
