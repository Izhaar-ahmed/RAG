"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    email: string;
    full_name: string;
    role: string;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    token: null,
    user: null,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token from local storage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        if (storedToken) {
            // Basic validation (check if expired could be added here)
            setToken(storedToken);
            // Ideally fetch user profile here
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string) => {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
