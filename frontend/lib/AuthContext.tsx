"use client"

import { createContext, useEffect, useState, useContext } from "react"
import axios from 'axios';

interface AuthContextType {
    user: any;
    login: (email: string, password: string) => Promise<any>;
    logout: () => void;
    loading: boolean;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const api = axios.create({
    baseURL: "http://localhost:3001",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
})

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't retry if it's already a retry, or if it's the refresh endpoint itself
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/refresh-token')) {
            originalRequest._retry = true;

            try {
                await api.post("/api/auth/refresh-token");
                return api(originalRequest);
            } catch (refreshError) {
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);




    useEffect(() => {
        // Check if token cookie exists before calling /me
        const hasToken = document.cookie.includes('token=');

        if (!hasToken) {
            setLoading(false);
            return;
        }

        api.get('/api/auth/me').then(res => setUser(res.data.user)).catch((err) => {
            console.error("Error fetching user data:", err);
            setLoading(false);
        }).finally(() => setLoading(false));
    }, [])

    const login = async (email: string, password: string) => {
        const { data } = await api.post("/api/auth/login", { email, password });
        if (data.user) setUser(data.user);
        return data;
    };

    const logout = async () => {
        await api.post("/api/auth/logout");
        setUser(null);
    };



    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )


}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;

}

export { api };