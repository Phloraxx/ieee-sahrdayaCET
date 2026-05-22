import React from 'react';

export interface NavItem {
    label: string;
    href: string;
    isActive?: boolean;
}

export interface FloatingIconProps {
    icon: React.ReactNode;
    label: string;
    x: string;
    y: string;
    delay?: number;
}

// Appwrite Document Types
export interface Society {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    name: string;
    slug: string;
    bio?: string;
    logo_url: string;
    banner_url?: string;
}

export interface Event {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    title: string;
    description?: string;
    date: string;
    venue?: string;
    price: number;
    banner_url?: string;
    registration_url?: string;
    society_id: string;
    status: 'draft' | 'published' | 'archived' | 'completed';
    max_capacity?: number;
}

export interface User {
    $id: string;
    name: string;
    email: string;
    prefs?: Record<string, unknown>;
}

export interface TeamMembership {
    $id: string;
    name?: string;
    userId: string;
}

// Auth Context Types
export interface AuthContextType {
    user: User | null;
    loading: boolean;
    profileCompleted: boolean | null;
    profileLoading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    isChairOf: (societySlug: string) => boolean;
    userTeams: TeamMembership[];
    getJWT: () => Promise<string | null>;
}





