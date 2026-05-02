"use client";

import { createContext, useEffect, useState, useContext } from "react";
import axios from "axios";

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  loading: boolean;
  getSocketAuth: () => { token?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// SSR guard — sessionStorage does not exist on the server
api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = sessionStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type QueueItems = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let failedQueue: QueueItems[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // Silently handle 401 on /me endpoint (user not logged in)
    if (
      error.response?.status === 401 &&
      originalRequest.url?.includes("/api/auth/me")
    ) {
      return Promise.resolve({ data: { user: null } });
    }

    // Don't try to refresh token for login/register endpoints
    if (
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register")
    ) {
      return Promise.reject(error);
    }

    // Don't retry if already retried or if this is the refresh endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/refresh-token")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // SSR guard
        if (typeof window === "undefined") throw new Error("SSR");

        const refreshToken = sessionStorage.getItem("refreshToken");
        if (!refreshToken) {
          console.error('[AUTH] No refresh token found in sessionStorage');
          throw new Error("No refresh token");
        }

        console.log('[AUTH] Attempting to refresh access token...');
        const { data } = await api.post(
          "/api/auth/refresh-token",
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          }
        );

        if(data.refreshToken){
          sessionStorage.setItem("refreshToken", data.refreshToken);
          console.log('[AUTH] Refresh token updated');
        }

        if (data.accessToken) {
          sessionStorage.setItem("accessToken", data.accessToken);
          console.log('[AUTH] Access token refreshed and saved');

        }
        else {
          console.error('[AUTH] No access token in refresh response');
          throw new Error("No access token in refresh response");
        }

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[AUTH] Token refresh failed:', refreshError);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
        processQueue(refreshError as Error);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  



  useEffect(() => {
    // useEffect only runs client-side — sessionStorage is safe here
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        console.error("Error fetching user data:", err);
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  // Proactive token refresh with activity detection
  useEffect(() => {
    if (!user) return;

    let refreshInterval: NodeJS.Timeout;
    let refreshPromise: Promise<any> | null = null;
    let lastRefreshTime = Date.now();

    const refreshAccessToken = async () => {
      // ✅ MUTEX LOCK: Prevent concurrent refreshes
      if (refreshPromise) {
        console.log('[AUTH] Refresh already in progress, waiting...');
        return refreshPromise;
      }

      refreshPromise = (async () => {
        try {
          const refreshToken = sessionStorage.getItem("refreshToken");
    
          if (!refreshToken) {
            console.log('[AUTH] No refresh token, skipping proactive refresh');
            return;
          }

          console.log('[AUTH] Proactively refreshing access token...');
          const { data } = await api.post(
            "/api/auth/refresh-token",
            {},
            {
              headers: { Authorization: `Bearer ${refreshToken}` },
            }
          );

          if (data.accessToken) {
            sessionStorage.setItem("accessToken", data.accessToken);
            lastRefreshTime = Date.now();
            console.log('[AUTH] Access token refreshed successfully');
          }

          if (data.refreshToken) {
            sessionStorage.setItem("refreshToken", data.refreshToken);
            console.log('[AUTH] Refresh token updated');
          }

          return data;
        } catch (error) {
          console.error('[AUTH] Proactive token refresh failed:', error);
          throw error;
        } finally {
          // ✅ Always clear the promise when done
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    };

    // Refresh every 10 minutes
    refreshInterval = setInterval(refreshAccessToken, 10 * 60 * 1000);

    // Refresh on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        // If more than 8 minutes since last refresh, refresh immediately
        if (timeSinceLastRefresh > 8 * 60 * 1000) {
          console.log('[AUTH] Tab became visible, refreshing token...');
          refreshAccessToken();
        }
      }
    };

    // Refresh on user activity after idle period
    const handleUserActivity = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      // If more than 8 minutes since last refresh, refresh immediately
      if (timeSinceLastRefresh > 8 * 60 * 1000) {
        console.log('[AUTH] User activity detected, refreshing token...');
        refreshAccessToken();
      }
    };

    // Throttle activity handler to avoid too many calls
    let activityTimeout: NodeJS.Timeout;
    const throttledActivityHandler = () => {
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        handleUserActivity();
        activityTimeout = null as any;
      }, 5000); // Check at most once every 5 seconds
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', throttledActivityHandler);
    window.addEventListener('keydown', throttledActivityHandler);
    window.addEventListener('click', throttledActivityHandler);
    window.addEventListener('scroll', throttledActivityHandler);

    return () => {
      clearInterval(refreshInterval);
      if (activityTimeout) clearTimeout(activityTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', throttledActivityHandler);
      window.removeEventListener('keydown', throttledActivityHandler);
      window.removeEventListener('click', throttledActivityHandler);
      window.removeEventListener('scroll', throttledActivityHandler);
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });

    if (data.user) {
      // Save tokens BEFORE setting user (to avoid race condition)
      if (data.accessToken) {
        sessionStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        sessionStorage.setItem("refreshToken", data.refreshToken);
      }
      
      // Then set user (which triggers socket connections)
      setUser(data.user);
    }
    return data;
  };

  const register = async (username: string, email: string, password: string) => {
    const { data } = await api.post("/api/auth/register", {
      username,
      email,
      password,
    });
    if (data.user) {
      // Save tokens BEFORE setting user
      if (data.accessToken) sessionStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) sessionStorage.setItem("refreshToken", data.refreshToken);
      
      // Then set user
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  };

  const getSocketAuth = () => {
    if (typeof window === "undefined") return {};
    const token = sessionStorage.getItem("accessToken");
    return token ? { token } : {};
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, loading, getSocketAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { api };