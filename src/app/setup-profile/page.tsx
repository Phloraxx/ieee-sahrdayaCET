'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { databases, DATABASE_ID, MEMBERS_COLLECTION_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';

const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const CLASSES = ['A', 'B', 'C', 'D'];
const COURSES = ['CS', 'BM', 'BT', 'CE', 'EEE', 'EC'];

interface FormData {
    fullName: string;
    semester: string;
    class: string;
    course: string;
    foodPreference: string;
    residence: string;
    sahrdayaEmail: string;
    personalEmail: string;
    phone: string;
}

export default function SetupProfilePage() {
    const router = useRouter();
    const { user, loading, profileCompleted, profileLoading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState<FormData>({
        fullName: '',
        semester: '',
        class: '',
        course: '',
        foodPreference: '',
        residence: '',
        sahrdayaEmail: '',
        personalEmail: '',
        phone: '',
    });

    // Redirect away if not logged in or profile already completed
    useEffect(() => {
        if (loading || profileLoading) return;
        if (!user) {
            router.replace('/');
            return;
        }
        if (profileCompleted) {
            router.replace('/');
            return;
        }
    }, [user, loading, profileCompleted, profileLoading, router]);

    // Pre-fill name and email from Google account
    useEffect(() => {
        if (user) {
            setForm((prev) => ({
                ...prev,
                fullName: prev.fullName || user.name || '',
                personalEmail: prev.personalEmail || user.email || '',
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError('');
        setSubmitting(true);

        try {
            await databases.createDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, ID.unique(), {
                userID: user.$id,
                fullName: form.fullName,
                semester: form.semester,
                class: form.class,
                course: form.course,
                foodPreference: form.foodPreference,
                residence: form.residence,
                sahrdayaEmail: form.sahrdayaEmail,
                personalEmail: form.personalEmail,
                phone: form.phone,
                profileCompleted: true,
            });

            router.replace('/');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save profile. Please try again.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-ieee-blue border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || profileCompleted) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ieee-blue/10 mb-4">
                        <svg className="w-8 h-8 text-ieee-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                    <p className="text-gray-500 mt-1 text-sm">Fill in your details to get started with IEEE Sahrdaya</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            value={form.fullName}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Semester, Class, Course row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                            <select
                                id="semester"
                                name="semester"
                                required
                                value={form.semester}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 bg-white focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            >
                                <option value="" disabled>Select</option>
                                {SEMESTERS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                            <select
                                id="class"
                                name="class"
                                required
                                value={form.class}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 bg-white focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            >
                                <option value="" disabled>Select</option>
                                {CLASSES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                            <select
                                id="course"
                                name="course"
                                required
                                value={form.course}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 bg-white focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            >
                                <option value="" disabled>Select</option>
                                {COURSES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Food Preference */}
                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-2">Food Preference</legend>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="foodPreference" value="Veg" required checked={form.foodPreference === 'Veg'} onChange={handleChange} className="w-4 h-4 text-ieee-blue focus:ring-ieee-blue" />
                                <span className="text-sm text-gray-700">Veg</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="foodPreference" value="Non Veg" checked={form.foodPreference === 'Non Veg'} onChange={handleChange} className="w-4 h-4 text-ieee-blue focus:ring-ieee-blue" />
                                <span className="text-sm text-gray-700">Non Veg</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* Residence */}
                    <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-2">Residence</legend>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="residence" value="Hostelite" required checked={form.residence === 'Hostelite'} onChange={handleChange} className="w-4 h-4 text-ieee-blue focus:ring-ieee-blue" />
                                <span className="text-sm text-gray-700">Hostelite</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="residence" value="Day Scholar" checked={form.residence === 'Day Scholar'} onChange={handleChange} className="w-4 h-4 text-ieee-blue focus:ring-ieee-blue" />
                                <span className="text-sm text-gray-700">Day Scholar</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* Sahrdaya Email */}
                    <div>
                        <label htmlFor="sahrdayaEmail" className="block text-sm font-medium text-gray-700 mb-1">Sahrdaya Email</label>
                        <input
                            id="sahrdayaEmail"
                            name="sahrdayaEmail"
                            type="email"
                            required
                            value={form.sahrdayaEmail}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            placeholder="you@sahrdaya.ac.in"
                        />
                    </div>

                    {/* Personal Email */}
                    <div>
                        <label htmlFor="personalEmail" className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                        <input
                            id="personalEmail"
                            name="personalEmail"
                            type="email"
                            required
                            value={form.personalEmail}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            placeholder="you@gmail.com"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone / WhatsApp Number</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-ieee-blue focus:ring-2 focus:ring-ieee-blue/20 outline-none transition"
                            placeholder="e.g. 9876543210"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-lg bg-ieee-blue text-white font-semibold hover:bg-ieee-blue/90 focus:ring-4 focus:ring-ieee-blue/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Complete Setup'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
