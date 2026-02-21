'use client';

import React, { useState } from 'react';
import { Society } from '@/types';
import { Edit, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import EditSocietyModal from './EditSocietyModal';
import LoginModal from './LoginModal';

interface SocietyCardProps {
    society: Society;
    onUpdate: (updatedSociety: Society) => void;
}

export default function SocietyCard({ society, onUpdate }: SocietyCardProps) {
    const { user, isChairOf } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const isChair = isChairOf(society.slug);

    const handleEditClick = () => {
        if (!user) {
            setIsLoginModalOpen(true);
        } else {
            setIsEditModalOpen(true);
        }
    };

    return (
        <>
            <div className="group relative bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all duration-300">
                {/* Banner */}
                <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                    {society.banner_url ? (
                        <img 
                            src={society.banner_url} 
                            alt={society.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/30 to-purple-900/30" />
                    )}
                    
                    {/* Edit Button (Only visible to society chair) */}
                    {isChair && (
                        <button
                            onClick={handleEditClick}
                            className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-semibold shadow-lg"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-shrink-0 w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center">
                            <img 
                                src={society.logo_url} 
                                alt={society.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        
                        {/* Name */}
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-xl mb-1">
                                {society.name}
                            </h3>
                        </div>
                    </div>

                    {/* Bio */}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {society.bio || 'No description available.'}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Link 
                            href={`/events?society=${society.$id}`}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors text-center flex items-center justify-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            View Events
                        </Link>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <EditSocietyModal 
                society={society}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={onUpdate}
            />

            {/* Login Modal */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                message="Sign in to edit your society's details"
            />
        </>
    );
}
