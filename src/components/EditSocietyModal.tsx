'use client';

import React, { useState } from 'react';
import { Society } from '@/types';
import { databases, DATABASE_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import { X, Loader2 } from 'lucide-react';

interface EditSocietyModalProps {
    society: Society;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedSociety: Society) => void;
}

export default function EditSocietyModal({ society, isOpen, onClose, onUpdate }: EditSocietyModalProps) {
    const [name, setName] = useState(society.name);
    const [bio, setBio] = useState(society.bio || '');
    const [bannerUrl, setBannerUrl] = useState(society.banner_url || '');
    const [logoUrl, setLogoUrl] = useState(society.logo_url);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const updatedDoc = await databases.updateDocument(
                DATABASE_ID,
                SOCIETIES_COLLECTION_ID,
                society.$id,
                {
                    name,
                    bio,
                    banner_url: bannerUrl,
                    logo_url: logoUrl,
                }
            );

            onUpdate(updatedDoc as unknown as Society);
            onClose();
        } catch (err: any) {
            console.error('Failed to update society:', err?.message || 'Unknown error');
            setError(err instanceof Error ? err.message : 'Failed to update society. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                    disabled={isLoading}
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Edit Society Details
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Society Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                About / Bio
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                placeholder="Tell us about your society..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {bio.length} characters
                            </p>
                        </div>

                        {/* Logo URL */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Logo URL
                            </label>
                            <input
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="/Societies/cs.png"
                                required
                            />
                            {logoUrl && (
                                <div className="mt-2 p-4 bg-gray-800 rounded-lg flex items-center justify-center">
                                    <img 
                                        src={logoUrl} 
                                        alt="Logo preview" 
                                        className="w-16 h-16 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = '/placeholder-logo.png';
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Banner URL */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Banner Image URL (optional)
                            </label>
                            <input
                                type="text"
                                value={bannerUrl}
                                onChange={(e) => setBannerUrl(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="https://example.com/banner.jpg"
                            />
                            {bannerUrl && (
                                <div className="mt-2 overflow-hidden rounded-lg">
                                    <img 
                                        src={bannerUrl} 
                                        alt="Banner preview" 
                                        className="w-full h-32 object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = '/placeholder-banner.png';
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Note about file uploads */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <p className="text-sm text-blue-400">
                                <strong>Note:</strong> For now, please use direct URLs for images. 
                                File upload functionality will be added in a future update.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
