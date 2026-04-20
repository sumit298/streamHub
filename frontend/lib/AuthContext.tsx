"use client";

import { createContext, useEffect, useState, useContext } from "react";
import axios from "axios";

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => void;
  logout: () => void;
  loading: boolean;
  getSocketAuth: () => { token?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", 
  },
});

type QueueItems = {
  resolve: () => void;
  reject: (error: unknown) => void;
};


let isRefreshing = false;
let failedQueue: QueueItems[] = []
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

    // Don't retry if it's already a retry, or if it's the refresh endpoint itself
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
        await api.post("/api/auth/refresh-token");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = "/login";
        processQueue(refreshError as Error);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }

    }
    return Promise.reject(error);
  },
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    
    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        console.error("Error fetching user data:", err);
        localStorage.removeItem('token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    if (data.user) {
      setUser(data.user);
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
    }
    return data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  const getSocketAuth = () => {
    return token ? { token } : {};
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getSocketAuth }}>
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
