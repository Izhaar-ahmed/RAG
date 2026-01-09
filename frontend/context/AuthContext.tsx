"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    email: string;
    role: string;
    full_name?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchUser = async (accessToken: string) => {
        try {
            const res = await fetch('http://127.0.0.1:8000/users/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                logout();
            }
        } catch (e) {
            console.error("Failed to fetch user", e);
            logout();
        }
    };

    useEffect(() => {
        // Hydrate from localStorage
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
            setToken(storedToken);
            fetchUser(storedToken).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = (newToken: string) => {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        fetchUser(newToken).then(() => {
            router.push('/');
        });
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
