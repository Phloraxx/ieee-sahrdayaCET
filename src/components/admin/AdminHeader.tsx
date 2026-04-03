'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, LogOut, ChevronRight, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
    onMenuClick: () => void;
}

const breadcrumbMap: Record<string, string> = {
    '/admin': 'Admin',
    '/admin/dashboard': 'Dashboard',
    '/admin/events': 'Events',
    '/admin/events/create': 'Create Event',
    '/admin/checkins': 'Check-in History',
    '/admin/settings': 'Settings',
};

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    // Generate breadcrumbs from pathname
    const generateBreadcrumbs = () => {
        if (!pathname) return [];
        
        const segments = pathname.split('/').filter(Boolean);
        const breadcrumbs: { label: string; href: string }[] = [];
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const label = breadcrumbMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
            
            // Skip 'admin' as first breadcrumb since we show it in sidebar
            if (index > 0 || segment !== 'admin') {
                breadcrumbs.push({ label, href: currentPath });
            }
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 lg:px-8">
                {/* Left side - Mobile menu + Breadcrumbs */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="hidden sm:flex items-center gap-2 text-sm">
                        <Link
                            href="/admin/dashboard"
                            className="text-gray-500 hover:text-ieee-blue transition-colors"
                        >
                            Admin
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.href}>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="font-medium text-gray-900">
                                        {crumb.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={crumb.href}
                                        className="text-gray-500 hover:text-ieee-blue transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                {/* Right side - User info */}
                <div className="flex items-center gap-4">
                    {user && (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-gray-900">
                                    {user.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {user.email}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-ieee-blue/10 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-ieee-blue" />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
