import { useState } from 'react';
import { ServerIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { setBackendUrl, skipBackendConfig } from '../services/api';
import axios from 'axios';

interface BackendConfigModalProps {
  onConfigured: () => void;
}

const BackendConfigModal = ({ onConfigured }: BackendConfigModalProps) => {
  const defaultUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const [url, setUrl] = useState(defaultUrl);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const testConnection = async (testUrl: string): Promise<boolean> => {
    try {
      // Try with the URL as-is (for URLs ending with /api/v1)
      const cleanUrl = testUrl.replace(/\/+$/, '');
      const response = await axios.get(`${cleanUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      // If that fails, try the base URL (for URLs without /api/v1)
      try {
        const baseUrl = testUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
        const response = await axios.get(`${baseUrl}/health`, {
          timeout: 5000,
        });
        return response.status === 200;
      } catch {
        return false;
      }
    }
  };

  const handleConnect = async () => {
    if (!url.trim()) {
      setErrorMessage('Please enter a URL');
      setStatus('error');
      return;
    }

    setIsChecking(true);
    setStatus('idle');
    setErrorMessage('');

    const cleanUrl = url.trim().replace(/\/+$/, '');
    const isConnected = await testConnection(cleanUrl);

    if (isConnected) {
      setStatus('success');
      setBackendUrl(cleanUrl);
      setTimeout(() => {
        onConfigured();
      }, 1000);
    } else {
      setStatus('error');
      setErrorMessage('Could not connect to the server. Please check the URL and try again.');
    }

    setIsChecking(false);
  };

  const handleSkip = () => {
    skipBackendConfig();
    onConfigured();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
            <ServerIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Configure Backend Server
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            Enter the URL of your Medical History API server. This app can be self-hosted.
          </p>
        </div>

        {/* URL Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Backend API URL
          </label>
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setStatus('idle');
                setErrorMessage('');
              }}
              placeholder="http://localhost:8000/api/v1"
              className="input w-full pr-10"
              disabled={isChecking}
            />
            {status === 'success' && (
              <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {status === 'error' && (
              <XCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}

          {status === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Connected successfully! Redirecting...
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConnect}
            disabled={isChecking || !url.trim()}
            className="btn btn-primary w-full"
          >
            {isChecking ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing Connection...
              </span>
            ) : (
              'Connect'
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={isChecking}
            className="btn btn-secondary w-full"
          >
            Use Default ({defaultUrl.replace('http://', '').split('/')[0]})
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
          You can change this later in Settings. The URL will be stored locally in your browser.
        </p>
      </div>
    </div>
  );
};

export default BackendConfigModal;
