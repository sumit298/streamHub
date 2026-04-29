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

        if (data.accessToken) {
          sessionStorage.setItem("accessToken", data.accessToken);
          console.log('[AUTH] Access token refreshed and saved');
        } else {
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

  // Proactive token refresh every 10 minutes
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
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
          console.log('[AUTH] Access token refreshed successfully');
        }
      } catch (error) {
        console.error('[AUTH] Proactive token refresh failed:', error);
        // Don't logout on proactive refresh failure - let the interceptor handle it
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    console.log('[AUTH] Login response:', {
      hasUser: !!data.user,
      hasAccessToken: !!data.accessToken,
      hasRefreshToken: !!data.refreshToken,
      accessTokenLength: data.accessToken?.length,
      refreshTokenLength: data.refreshToken?.length,
    });
    
    if (data.user) {
      setUser(data.user);
      // Backend must return accessToken and refreshToken in response body
      if (data.accessToken) {
        sessionStorage.setItem("accessToken", data.accessToken);
        console.log('[AUTH] Access token saved to sessionStorage');
      } else {
        console.error('[AUTH] No access token in login response!');
      }
      if (data.refreshToken) {
        sessionStorage.setItem("refreshToken", data.refreshToken);
        console.log('[AUTH] Refresh token saved to sessionStorage');
      } else {
        console.error('[AUTH] No refresh token in login response!');
      }
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
      setUser(data.user);
      if (data.accessToken) sessionStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) sessionStorage.setItem("refreshToken", data.refreshToken);
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
    console.log('[FRONTEND AUTH] getSocketAuth called');
    console.log('[FRONTEND AUTH] Token found:', !!token);
    console.log('[FRONTEND AUTH] Token (first 50):', token?.substring(0, 50));
    console.log('[FRONTEND AUTH] Token length:', token?.length);
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