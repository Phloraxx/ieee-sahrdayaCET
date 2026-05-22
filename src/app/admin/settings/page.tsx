'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin';
import { 
    Settings, 
    Bell, 
    Shield, 
    Palette, 
    Save, 
    Loader2,
    Mail,
    Clock,
    MessageSquare,
    Send,
    Key,
    Lock,
    Smartphone,
    Monitor,
    Sun,
    Moon,
    SunMoon,
    Calendar,
    Eye,
    Users,
    Timer,
    FileText,
    Upload,
    Image as ImageIcon,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { account } from '@/lib/appwrite';

// ============================================================================
// Types & Schemas
// ============================================================================

const notificationsSchema = z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    newRegistration: z.boolean(),
    eventUpdates: z.boolean(),
    paymentAlerts: z.boolean(),
});

const appearanceSchema = z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    sidebarCollapsed: z.boolean(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    timeFormat: z.enum(['12h', '24h']),
});

const generalSchema = z.object({
    defaultEventVisibility: z.enum(['public', 'private']),
    defaultCapacity: z.number().min(1).max(10000),
    slotReservationTimeout: z.number().min(5).max(60),
    emailSignature: z.string().max(500).optional(),
    organizationLogo: z.string().optional(),
});

type NotificationsFormData = z.infer<typeof notificationsSchema>;
type AppearanceFormData = z.infer<typeof appearanceSchema>;
type GeneralFormData = z.infer<typeof generalSchema>;

interface AdminSettings {
    notifications: NotificationsFormData;
    appearance: AppearanceFormData;
    general: GeneralFormData;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultSettings: AdminSettings = {
    notifications: {
        emailNotifications: true,
        smsNotifications: false,
        newRegistration: true,
        eventUpdates: true,
        paymentAlerts: true,
    },
    appearance: {
        theme: 'light',
        sidebarCollapsed: false,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
    },
    general: {
        defaultEventVisibility: 'public',
        defaultCapacity: 100,
        slotReservationTimeout: 15,
        emailSignature: '',
        organizationLogo: '',
    },
};

// ============================================================================
// Main Component
// ============================================================================

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'notifications' | 'security' | 'appearance' | 'general'>('notifications');
    const [isSaving, setIsSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Load saved settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('admin_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                notificationsForm.reset(parsed.notifications || defaultSettings.notifications);
                appearanceForm.reset(parsed.appearance || defaultSettings.appearance);
                generalForm.reset(parsed.general || defaultSettings.general);
                
                // Apply theme
                applyTheme(parsed.appearance?.theme || 'light');
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }, []);

    // Load active sessions
    useEffect(() => {
        loadActiveSessions();
    }, []);

    const loadActiveSessions = async () => {
        setLoadingSessions(true);
        try {
            const sessions = await account.listSessions();
            setActiveSessions(sessions.sessions);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    // ========================================================================
    // Forms Setup
    // ========================================================================

    const notificationsForm = useForm<NotificationsFormData>({
        resolver: zodResolver(notificationsSchema),
        defaultValues: defaultSettings.notifications,
    });

    const appearanceForm = useForm<AppearanceFormData>({
        resolver: zodResolver(appearanceSchema),
        defaultValues: defaultSettings.appearance,
    });

    const generalForm = useForm<GeneralFormData>({
        resolver: zodResolver(generalSchema),
        defaultValues: defaultSettings.general,
    });

    // ========================================================================
    // Handlers
    // ========================================================================

    const applyTheme = (theme: string) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Auto mode - use system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    const saveSettings = async (section: keyof AdminSettings, data: any) => {
        setIsSaving(true);
        try {
            // Get current settings
            const saved = localStorage.getItem('admin_settings');
            const currentSettings: AdminSettings = saved ? JSON.parse(saved) : defaultSettings;
            
            // Update section
            currentSettings[section] = data;
            
            // Save to localStorage
            localStorage.setItem('admin_settings', JSON.stringify(currentSettings));
            
            // Apply theme if appearance changed
            if (section === 'appearance') {
                applyTheme(data.theme);
            }
            
            // TODO: Also save to Appwrite user preferences
            // await account.updatePrefs(currentSettings);
            
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestNotification = async () => {
        setTestingEmail(true);
        try {
            toast.success('Notification test feature coming soon');
        } catch (error) {
            toast.error('Failed to send test notification');
        } finally {
            setTestingEmail(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            await account.deleteSession(sessionId);
            toast.success('Session terminated successfully');
            loadActiveSessions();
        } catch (error) {
            console.error('Failed to delete session:', error);
            toast.error('Failed to terminate session');
        }
    };

    // ========================================================================
    // Render Functions
    // ========================================================================

    const renderNotificationsTab = () => (
        <form onSubmit={notificationsForm.handleSubmit((data) => saveSettings('notifications', data))} className="space-y-6">
            {/* Email Notifications */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-900 block">
                                Enable Email Notifications
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Receive email updates for important events
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            {...notificationsForm.register('emailNotifications')}
                            className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-900 block">
                                New Registration Alerts
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Get notified when someone registers for your events
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            {...notificationsForm.register('newRegistration')}
                            className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-900 block">
                                Event Updates
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Notifications about event changes and updates
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            {...notificationsForm.register('eventUpdates')}
                            className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-900 block">
                                Payment Alerts
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Get notified about payment confirmations
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            {...notificationsForm.register('paymentAlerts')}
                            className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                        />
                    </div>
                </div>
            </div>

            {/* SMS Notifications (Future Feature) */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    SMS Notifications
                    <span className="text-xs font-normal text-gray-500">(Coming Soon)</span>
                </h3>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-gray-900 block">
                            Enable SMS Notifications
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                            Receive SMS alerts for urgent updates
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        {...notificationsForm.register('smsNotifications')}
                        disabled
                        className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                    />
                </div>
            </div>

            {/* Test Notification */}
            <div className="border-t pt-6">
                <button
                    type="button"
                    onClick={handleTestNotification}
                    disabled={testingEmail}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-ieee-blue border border-ieee-blue rounded-lg hover:bg-ieee-blue/5 transition-colors disabled:opacity-50"
                >
                    {testingEmail ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Send Test Notification
                        </>
                    )}
                </button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Notification Settings
                        </>
                    )}
                </button>
            </div>
        </form>
    );

    const renderSecurityTab = () => (
        <div className="space-y-6">
            {/* Password */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password & Authentication
                </h3>
                
                <div className="space-y-3">
                    <button
                        onClick={() => window.location.href = '/account/security'}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-900">Change Password</p>
                            <p className="text-xs text-gray-500 mt-1">Update your account password</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-900 block">
                                Two-Factor Authentication
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Add an extra layer of security (Coming Soon)
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            disabled
                            className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                        />
                    </div>
                </div>
            </div>

            {/* Active Sessions */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Active Sessions
                </h3>
                
                {loadingSessions ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-ieee-blue" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeSessions.map((session) => (
                            <div key={session.$id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-ieee-blue/10 rounded-lg">
                                        <Monitor className="w-4 h-4 text-ieee-blue" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {session.clientName || 'Unknown Device'}
                                            {session.current && (
                                                <span className="ml-2 text-xs text-green-600 font-semibold">
                                                    Current Session
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {session.osName} • {session.countryName || 'Unknown Location'}
                                        </p>
                                    </div>
                                </div>
                                {!session.current && (
                                    <button
                                        onClick={() => handleDeleteSession(session.$id)}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Terminate
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* API Keys (Future Feature) */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API Keys
                    <span className="text-xs font-normal text-gray-500">(Coming Soon)</span>
                </h3>
                
                <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-sm text-gray-600 text-center">
                        API key management for integrations will be available soon
                    </p>
                </div>
            </div>
        </div>
    );

    const renderAppearanceTab = () => (
        <form onSubmit={appearanceForm.handleSubmit((data) => saveSettings('appearance', data))} className="space-y-6">
            {/* Theme Selection */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Theme
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'auto', label: 'Auto', icon: SunMoon },
                    ].map((theme) => (
                        <label
                            key={theme.value}
                            className={`flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                appearanceForm.watch('theme') === theme.value
                                    ? 'border-ieee-blue bg-ieee-blue/5'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                value={theme.value}
                                {...appearanceForm.register('theme')}
                                className="sr-only"
                            />
                            <theme.icon className={`w-8 h-8 ${
                                appearanceForm.watch('theme') === theme.value
                                    ? 'text-ieee-blue'
                                    : 'text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                                appearanceForm.watch('theme') === theme.value
                                    ? 'text-ieee-blue'
                                    : 'text-gray-700'
                            }`}>
                                {theme.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Sidebar */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Layout</h3>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-gray-900 block">
                            Collapse Sidebar by Default
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                            Start with a minimized sidebar for more space
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        {...appearanceForm.register('sidebarCollapsed')}
                        className="w-5 h-5 text-ieee-blue rounded focus:ring-2 focus:ring-ieee-blue"
                    />
                </div>
            </div>

            {/* Date Format */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date & Time Format
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2">
                            Date Format
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'DD/MM/YYYY', example: '31/12/2024' },
                                { value: 'MM/DD/YYYY', example: '12/31/2024' },
                                { value: 'YYYY-MM-DD', example: '2024-12-31' },
                            ].map((format) => (
                                <label
                                    key={format.value}
                                    className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                        appearanceForm.watch('dateFormat') === format.value
                                            ? 'border-ieee-blue bg-ieee-blue/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        value={format.value}
                                        {...appearanceForm.register('dateFormat')}
                                        className="sr-only"
                                    />
                                    <span className={`text-sm font-medium ${
                                        appearanceForm.watch('dateFormat') === format.value
                                            ? 'text-ieee-blue'
                                            : 'text-gray-700'
                                    }`}>
                                        {format.value}
                                    </span>
                                    <span className="text-xs text-gray-500">{format.example}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2">
                            Time Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: '12h', example: '2:30 PM' },
                                { value: '24h', example: '14:30' },
                            ].map((format) => (
                                <label
                                    key={format.value}
                                    className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                        appearanceForm.watch('timeFormat') === format.value
                                            ? 'border-ieee-blue bg-ieee-blue/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        value={format.value}
                                        {...appearanceForm.register('timeFormat')}
                                        className="sr-only"
                                    />
                                    <span className={`text-sm font-medium ${
                                        appearanceForm.watch('timeFormat') === format.value
                                            ? 'text-ieee-blue'
                                            : 'text-gray-700'
                                    }`}>
                                        {format.value.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">{format.example}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Appearance Settings
                        </>
                    )}
                </button>
            </div>
        </form>
    );

    const renderGeneralTab = () => (
        <form onSubmit={generalForm.handleSubmit((data) => saveSettings('general', data))} className="space-y-6">
            {/* Event Defaults */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Event Defaults
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2 flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5" />
                            Default Event Visibility
                        </label>
                        <select
                            {...generalForm.register('defaultEventVisibility')}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ieee-blue focus:border-transparent"
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Set the default visibility for new events
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Default Registration Capacity
                        </label>
                        <input
                            type="number"
                            {...generalForm.register('defaultCapacity', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ieee-blue focus:border-transparent"
                            min="1"
                            max="10000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Default capacity for new events (1-10000)
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2 flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5" />
                            Slot Reservation Timeout (minutes)
                        </label>
                        <input
                            type="number"
                            {...generalForm.register('slotReservationTimeout', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ieee-blue focus:border-transparent"
                            min="5"
                            max="60"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How long to hold a registration slot before expiring (5-60 minutes)
                        </p>
                    </div>
                </div>
            </div>

            {/* Email Signature */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Email Customization
                </h3>
                
                <div>
                    <label className="text-xs font-medium text-gray-700 block mb-2">
                        Email Signature
                    </label>
                    <textarea
                        {...generalForm.register('emailSignature')}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ieee-blue focus:border-transparent resize-none"
                        placeholder="Best regards,&#10;IEEE SCET Team"
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        This signature will be added to all automated emails (max 500 characters)
                    </p>
                </div>
            </div>

            {/* Organization Logo */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Organization Branding
                </h3>
                
                <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                        Upload Organization Logo
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        PNG or JPG (max 2MB). Will be used in emails and certificates.
                    </p>
                    <button
                        type="button"
                        disabled
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg opacity-50 cursor-not-allowed"
                    >
                        Coming Soon
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save General Settings
                        </>
                    )}
                </button>
            </div>
        </form>
    );

    // ========================================================================
    // Main Render
    // ========================================================================

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your admin preferences and configurations
                    </p>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                            { id: 'security', label: 'Security', icon: Shield },
                            { id: 'appearance', label: 'Appearance', icon: Palette },
                            { id: 'general', label: 'General', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-ieee-blue text-ieee-blue'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {activeTab === 'notifications' && renderNotificationsTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'appearance' && renderAppearanceTab()}
                    {activeTab === 'general' && renderGeneralTab()}
                </div>

                {/* Info Footer */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">
                            Settings are saved locally
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            Your preferences are stored in your browser. Some features will sync to your account in future updates.
                        </p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
