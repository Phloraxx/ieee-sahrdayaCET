'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { account, teams } from '@/lib/appwrite';
import { User, TeamMembership, AuthContextType } from '@/types';
import { OAuthProvider } from 'appwrite';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userTeams, setUserTeams] = useState<TeamMembership[]>([]);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser as unknown as User);

            // Fetch user's team memberships
            const teamsList = await teams.list();
            setUserTeams(teamsList.teams as unknown as TeamMembership[]);
        } catch {
            // Session cookie present but invalid/expired — clear it gracefully
            setUser(null);
            setUserTeams([]);
        } finally {
            setLoading(false);
        }
    };

    const login = async () => {
        try {
            // Trigger Google OAuth
            // Redirect to current page after login
            const redirectUrl = `${window.location.origin}/auth/callback`;
            await account.createOAuth2Session(
                OAuthProvider.Google,
                redirectUrl,
                redirectUrl
            );
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setUserTeams([]);
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    };

    const isChairOf = (societySlug: string): boolean => {
        if (!user || !userTeams.length) return false;

        // Check if user is member of chair_{societySlug} team
        const chairTeamName = `chair_${societySlug}`;
        return userTeams.some(
            (team) => team.teamId === chairTeamName || team.teamName?.toLowerCase().includes(chairTeamName)
        );
    };

    const contextValue = useMemo(
        () => ({ user, loading, login, logout, isChairOf, userTeams }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, loading, userTeams]
    );

    return (
        <AuthContext.Provider value={contextValue}>
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
