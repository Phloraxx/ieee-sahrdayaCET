'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { databases, storage, SOCIETY_IMAGES_BUCKET_ID } from '@/lib/appwrite';
import { DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/constants/collections';
import { Query, ID } from 'appwrite';
import { Society } from '@/types';
import { AdminLayout } from '@/components/admin';
import {
    Calendar,
    MapPin,
    Users,
    IndianRupee,
    Upload,
    X,
    Loader2,
    Image as ImageIcon,
    AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface EventFormData {
    title: string;
    description: string;
    date: string;
    time: string;
    venue: string;
    max_capacity: string;
    price: string;
    registration_deadline: string;
    society_id: string;
    status: 'draft' | 'published';
}

const initialFormData: EventFormData = {
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    max_capacity: '',
    price: '0',
    registration_deadline: '',
    society_id: '',
    status: 'draft',
};

export default function CreateEventPage() {
    const { userTeams } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState<EventFormData>(initialFormData);
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

    // Get user's society slugs
    const getUserSocietySlugs = useCallback(() => {
        // Check if user is in admins team (global admin)
        const isGlobalAdmin = userTeams.some(team => 
            team.$id === 'admins' || team.name?.toLowerCase() === 'admins'
        );
        
        // Global admins get access to all societies
        if (isGlobalAdmin) {
            return null; // null means "all societies"
        }
        
        // Otherwise, get chair teams
        return userTeams
            .filter(team => team.$id?.startsWith('chair_') || team.name?.toLowerCase().startsWith('chair_'))
            .map(team => {
                const id = team.$id || team.name || '';
                return id.replace('chair_', '');
            });
    }, [userTeams]);

    useEffect(() => {
        const fetchSocieties = async () => {
            try {
                const societySlugs = getUserSocietySlugs();

                const societiesRes = await databases.listDocuments(
                    DATABASE_ID,
                    SOCIETIES_COLLECTION_ID,
                    [Query.limit(100)]
                );
                const allSocieties = societiesRes.documents as unknown as Society[];
                
                // If societySlugs is null (global admin), show all societies
                // Otherwise filter societies user is chair of
                const userSocieties = societySlugs === null 
                    ? allSocieties 
                    : allSocieties.filter(s => societySlugs.includes(s.slug));
                setSocieties(userSocieties);

                // Auto-select if user is chair of only one society
                if (userSocieties.length === 1) {
                    setFormData(prev => ({ ...prev, society_id: userSocieties[0].$id }));
                }
            } catch (error) {
                console.error('Error fetching societies:', error);
                toast.error('Failed to load societies');
            } finally {
                setLoading(false);
            }
        };

        fetchSocieties();
    }, [getUserSocietySlugs]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name as keyof EventFormData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }

            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeBanner = () => {
        setBannerFile(null);
        setBannerPreview(null);
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof EventFormData, string>> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Event title is required';
        }
        if (!formData.date) {
            newErrors.date = 'Event date is required';
        }
        if (!formData.time) {
            newErrors.time = 'Event time is required';
        }
        if (!formData.society_id) {
            newErrors.society_id = 'Please select a society';
        }
        if (formData.max_capacity && parseInt(formData.max_capacity) < 1) {
            newErrors.max_capacity = 'Capacity must be at least 1';
        }
        if (formData.price && parseInt(formData.price) < 0) {
            newErrors.price = 'Price cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent, publishNow: boolean = false) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors before submitting');
            return;
        }

        try {
            setSubmitting(true);

            // Upload banner if provided
            let bannerUrl = '';
            if (bannerFile) {
                const uploadedFile = await storage.createFile(
                    SOCIETY_IMAGES_BUCKET_ID,
                    ID.unique(),
                    bannerFile
                );
                // Get file URL
                bannerUrl = storage.getFileView(SOCIETY_IMAGES_BUCKET_ID, uploadedFile.$id).toString();
            }

            // Combine date and time
            const eventDateTime = new Date(`${formData.date}T${formData.time}`);

            // Create event document
            await databases.createDocument(
                DATABASE_ID,
                EVENTS_COLLECTION_ID,
                ID.unique(),
                {
                    title: formData.title.trim(),
                    description: formData.description.trim() || null,
                    date: eventDateTime.toISOString(),
                    venue: formData.venue.trim() || null,
                    max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
                    price: parseInt(formData.price) || 0,
                    banner_url: bannerUrl || null,
                    society_id: formData.society_id,
                    status: publishNow ? 'published' : 'draft',
                }
            );

            toast.success(publishNow ? 'Event published successfully!' : 'Event saved as draft');
            router.push('/admin/events');
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error('Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-ieee-blue animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
                    <p className="text-gray-500 mt-1">
                        Fill in the details to create a new event
                    </p>
                </div>

                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
                    {/* Basic Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
                    >
                        <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>

                        {/* Society Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Society <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="society_id"
                                value={formData.society_id}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                    errors.society_id ? 'border-red-500' : 'border-gray-200'
                                }`}
                            >
                                <option value="">Select a society</option>
                                {societies.map((society) => (
                                    <option key={society.$id} value={society.$id}>
                                        {society.name}
                                    </option>
                                ))}
                            </select>
                            {errors.society_id && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.society_id}
                                </p>
                            )}
                        </div>

                        {/* Event Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Event Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Enter event title"
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                    errors.title ? 'border-red-500' : 'border-gray-200'
                                }`}
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe your event..."
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors resize-none"
                            />
                        </div>
                    </motion.div>

                    {/* Date & Venue */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
                    >
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-ieee-blue" />
                            Date & Venue
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                        errors.date ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                />
                                {errors.date && (
                                    <p className="mt-1 text-sm text-red-500">{errors.date}</p>
                                )}
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                        errors.time ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                />
                                {errors.time && (
                                    <p className="mt-1 text-sm text-red-500">{errors.time}</p>
                                )}
                            </div>
                        </div>

                        {/* Venue */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Venue
                            </label>
                            <input
                                type="text"
                                name="venue"
                                value={formData.venue}
                                onChange={handleInputChange}
                                placeholder="Enter venue address"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors"
                            />
                        </div>

                        {/* Registration Deadline */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Registration Deadline
                            </label>
                            <input
                                type="datetime-local"
                                name="registration_deadline"
                                value={formData.registration_deadline}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Leave empty to allow registration until event starts
                            </p>
                        </div>
                    </motion.div>

                    {/* Capacity & Pricing */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
                    >
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-ieee-blue" />
                            Capacity & Pricing
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Capacity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum Capacity
                                </label>
                                <input
                                    type="number"
                                    name="max_capacity"
                                    value={formData.max_capacity}
                                    onChange={handleInputChange}
                                    placeholder="Unlimited"
                                    min="1"
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                        errors.max_capacity ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                />
                                {errors.max_capacity && (
                                    <p className="mt-1 text-sm text-red-500">{errors.max_capacity}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty for unlimited capacity
                                </p>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <IndianRupee className="w-4 h-4 inline mr-1" />
                                    Price (₹)
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                    min="0"
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors ${
                                        errors.price ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                />
                                {errors.price && (
                                    <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter 0 for free events
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Banner Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
                    >
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-ieee-blue" />
                            Banner Image
                        </h2>

                        {bannerPreview ? (
                            <div className="relative">
                                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
                                    <Image
                                        src={bannerPreview}
                                        alt="Banner preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={removeBanner}
                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-ieee-blue hover:bg-ieee-blue/5 transition-colors cursor-pointer">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">
                                    Click to upload banner image
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Recommended: 1920x1080 (16:9), Max 5MB
                                </p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </motion.div>

                    {/* Submit Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-end"
                    >
                        <button
                            type="button"
                            onClick={() => router.push('/admin/events')}
                            disabled={submitting}
                            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : null}
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={submitting}
                            className="px-6 py-3 bg-ieee-blue text-white hover:bg-ieee-blue/90 font-medium rounded-xl transition-colors shadow-lg shadow-ieee-blue/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : null}
                            Publish Event
                        </button>
                    </motion.div>
                </form>
            </div>
        </AdminLayout>
    );
}
