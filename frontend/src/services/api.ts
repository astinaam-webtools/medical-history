import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API URL from localStorage or fallback to env variable
const getApiUrl = (): string => {
  const storedUrl = localStorage.getItem('backend_url');
  if (storedUrl) {
    // Ensure stored URL has /api/v1 suffix
    if (!storedUrl.endsWith('/api/v1')) {
      const fixedUrl = storedUrl.replace(/\/api(\/v\d+)?$/, '').replace(/\/+$/, '') + '/api/v1';
      localStorage.setItem('backend_url', fixedUrl);
      return fixedUrl;
    }
    return storedUrl;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
};

// Export function to check if backend URL is configured
export const isBackendConfigured = (): boolean => {
  return localStorage.getItem('backend_url_configured') === 'true';
};

// Export function to set backend URL
export const setBackendUrl = (url: string): void => {
  // Ensure URL doesn't end with /
  let cleanUrl = url.replace(/\/+$/, '');
  
  // Ensure URL ends with /api/v1
  if (!cleanUrl.endsWith('/api/v1')) {
    // Remove any partial api path and add the correct one
    cleanUrl = cleanUrl.replace(/\/api(\/v\d+)?$/, '') + '/api/v1';
  }
  
  localStorage.setItem('backend_url', cleanUrl);
  localStorage.setItem('backend_url_configured', 'true');
  // Update axios base URL
  api.defaults.baseURL = cleanUrl;
};

// Export function to get current backend URL
export const getBackendUrl = (): string => {
  return getApiUrl();
};

// Export function to skip backend configuration (use default)
export const skipBackendConfig = (): void => {
  localStorage.setItem('backend_url_configured', 'true');
  // Don't set backend_url, so it will use the default from env
};

// Export function to reset backend URL
export const resetBackendUrl = (): void => {
  localStorage.removeItem('backend_url');
  localStorage.removeItem('backend_url_configured');
  api.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
};

const api: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${getApiUrl()}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
