'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import { Event, Society } from '@/types';
import { Query } from 'appwrite';
import { ArrowRight, Loader2, Calendar, MapPin, Clock, Users, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { GridBackground } from '@/components/GridBackground';
import { TechnicalDetails } from '@/components/TechnicalDetails';
import BentoLayout from './components/BentoLayout';
import AsymmetricHero from './components/AsymmetricHero';
import BentoEventCard from './components/BentoEventCard';
import ArchiveCarousel from './components/ArchiveCarousel';

async function getEvents() {
    try {
        const eventsResponse = await databases.listDocuments(
            DATABASE_ID,
            EVENTS_COLLECTION_ID,
            [Query.orderDesc('date'), Query.limit(100)]
        );

        const societiesResponse = await databases.listDocuments(
            DATABASE_ID,
            SOCIETIES_COLLECTION_ID
        );

        const societiesMap = new Map(
            (societiesResponse.documents as unknown as Society[]).map((s) => [s.$id, s])
        );

        return eventsResponse.documents
            .filter((event) => event.status === 'published' || event.status === 'completed')
            .map((event) => {
                const society = societiesMap.get(event.society_id);
                return {
                    $id: event.$id,
                    $createdAt: event.$createdAt,
                    $updatedAt: event.$updatedAt,
                    title: event.title,
                    description: event.description,
                    date: event.date,
                    venue: event.venue,
                    price: event.price,
                    banner_url: event.banner_url,
                    society_id: event.society_id,
                    status: event.status,
                    max_capacity: event.max_capacity,
                    society: society ? {
                        $id: society.$id,
                        name: society.name,
                        logo_url: society.logo_url,
                    } : undefined,
                } as Event & { society?: Society };
            });
    } catch (error: any) {
        console.error('Error fetching events:', error?.message || 'Unknown error');
        return [];
    }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventWithSociety | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const [evRes, socRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID, [
            Query.equal('status', ['published', 'completed']),
            Query.orderDesc('date'),
            Query.limit(50),
          ]),
          databases.listDocuments(DATABASE_ID, SOCIETIES_COLLECTION_ID, [Query.limit(30)]),
        ]);
        const societies = socRes.documents as unknown as Society[];
        const socMap = new Map(societies.map((s) => [s.$id, s]));
        setEvents((evRes.documents as unknown as Event[]).map((e) => ({ ...e, society: socMap.get(e.society_id) })));
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const now = new Date();

  // Featured event is the closest upcoming event, or the most recent past event if none upcoming
  const featuredEvent = useMemo(() => {
    if (events.length === 0) return null;
    const upcoming = events.filter((e) => new Date(e.date) > now).reverse();
    return upcoming.length > 0 ? upcoming[0] : events[0];
  }, [events]);

  const listEvents = useMemo(() => {
    return events.filter(e => e.$id !== featuredEvent?.$id);
  }, [events, featuredEvent]);

  // Colors for the event list cards
  const cardColors = ['bg-[#eedbf0]', 'bg-[#f5f6ce]', 'bg-[#e0f0ea]', 'bg-[#fbe4d8]'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex flex-col items-center justify-center gap-4">
        <Navbar />
        <Loader2 className="w-10 h-10 animate-spin text-black" />
        <span className="text-sm font-bold tracking-widest text-[#111] uppercase">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111] selection:bg-black selection:text-white font-sans overflow-hidden hover:overflow-y-auto lg:hover:overflow-hidden">
      <Navbar />

      <main className="flex flex-col lg:flex-row h-auto lg:h-screen pt-20 pb-4 lg:py-24 lg:px-8 gap-6 max-w-[1800px] mx-auto overflow-y-auto lg:overflow-hidden">

        {/* LEFT PANEL : Featured / Hero */}
        <div className="w-full lg:w-5/12 xl:w-[45%] min-h-[60vh] lg:h-full relative rounded-[40px] overflow-hidden bg-gradient-to-br from-[#f2dced] to-[#e4cde5] shadow-sm flex flex-col p-8 lg:p-12 transition-all group shrink-0 mx-0 lg:mx-0 border-4 border-transparent">
          {/* Background Image / Banner */}
          {featuredEvent?.banner_url && (
            <div className="absolute inset-0 z-0 mix-blend-multiply opacity-80 transition-transform duration-1000 group-hover:scale-105">
              <Image
                src={featuredEvent.banner_url}
                alt="Featured Event Background"
                fill
                className="object-cover object-center"
                priority
              />
              {/* Gradient to ensure text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#ecc1e5] via-[#f2dced]/80 to-transparent" />
            </div>
          )}

          <div className="relative z-10 flex flex-col h-full justify-between mt-auto">
            <div className="space-y-4 max-w-lg mt-auto pb-4">
              <p className="-rotate-90 absolute -left-16 top-10 text-xs tracking-widest uppercase font-semibold text-black/60 origin-left hidden sm:block">
                {featuredEvent?.society?.name || 'IEEE Sahrdaya'}
              </p>

              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black leading-[0.9] tracking-tighter text-black uppercase drop-shadow-sm">
                {featuredEvent?.title || "UPCOMING EVENTS & CONFERENCES"}
              </h1>

              <p className="text-black/80 font-medium text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 pr-6">
                {featuredEvent?.description || "Join us for the largest technical events, workshops, and hackathons hosted by the IEEE Sahrdaya Student Branch."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-6">
              <button
                onClick={() => featuredEvent && setSelected(featuredEvent)}
                className="bg-[#111] hover:bg-black text-white rounded-full px-8 py-4 text-sm font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl"
              >
                Read more
              </button>
              {featuredEvent?.registration_url && (
                <a
                  href={featuredEvent.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-transparent border-2 border-black hover:bg-black hover:text-white text-black rounded-full px-8 py-4 text-sm font-bold tracking-wide transition-all flex items-center gap-2"
                >
                  Book event <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL : Event List */}
        <div className="flex-1 h-auto lg:h-full flex flex-col bg-white rounded-[40px] px-6 py-8 lg:p-10 lg:pr-4 mx-0 lg:mx-0 shadow-sm border border-gray-100/50">

          {/* Top Bar (No filters as there are only 1-2 events at a time) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="bg-black text-white px-6 py-3 rounded-full text-xs font-black tracking-wider uppercase shrink-0 w-full sm:w-auto text-center">
              Events Directory
            </div>
          </div>

          {/* Main Header */}
          <h2 className="text-3xl lg:text-5xl font-black leading-none tracking-tighter uppercase text-black mb-4 max-w-2xl">
            THE WORLD BIGGEST <br className="hidden sm:block" />
            CONFERENCE FOR <br className="hidden sm:block" />
            THE DIGITAL <span className="inline-flex items-center mx-2 text-sm lg:text-base border-2 border-black rounded-full px-4 py-1.5 align-middle tracking-widest">{new Date().getFullYear()}</span> <br className="hidden sm:block" />
            TECHNOLOGYS IN <span className="inline-block translate-y-2"><StarIcon className="w-8 h-8 lg:w-10 lg:h-10 text-black fill-current" /></span> EVENTS!
          </h2>

          {/* Text Marquee Belt */}
          <div className="mb-6 mr-4 lg:mr-8 overflow-hidden">
            <TextMarquee />
          </div>

          {/* List Header */}
          <div className="flex items-center justify-between mt-2 mb-6 px-2 shrink-0">
            <h3 className="text-xl font-black tracking-tighter uppercase">Discover Next</h3>
            <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{now.toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Event List (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-2 lg:pr-4 space-y-4 pb-20 custom-scrollbar min-h-[50vh] lg:min-h-0">
            {listEvents.length > 0 ? (
              listEvents.map((event, index) => {
                const eventDate = new Date(event.date);
                const isPast = eventDate < now;
                const bgColor = isPast ? 'bg-gray-50 border border-gray-200 grayscale-[0.2]' : cardColors[index % cardColors.length];

                return (
                  <div
                    key={event.$id}
                    onClick={() => setSelected(event)}
                    className={`cursor-pointer block p-6 lg:p-8 rounded-[32px] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${bgColor} relative group overflow-hidden`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {event.society?.logo_url ? (
                            <div className="w-8 h-8 rounded-full bg-white p-1.5 shadow-sm">
                              <Image src={event.society.logo_url} alt={event.society.name} width={24} height={24} className="object-contain" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black font-black text-xs">
                              {event.society?.name?.charAt(0) || 'I'}
                            </div>
                          )}
                          <span className="text-[10px] font-bold opacity-60 tracking-widest uppercase">
                            {event.society?.name || 'IEEE SB'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 block">
                            {isPast ? 'Past Event' : event.venue || 'TBA'}
                          </span>
                          <h4 className="text-2xl lg:text-3xl font-black tracking-tighter leading-[1.1] uppercase group-hover:underline underline-offset-4 decoration-2">
                            {event.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-3 shrink-0 mt-4 sm:mt-0">
                        <span className="text-xs font-bold opacity-60 tracking-widest uppercase mb-1">
                          {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>

                        {!isPast && event.registration_url ? (
                          <a
                            href={event.registration_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black text-white px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                          >
                            Register <ArrowUpRight className="w-3 h-3" />
                          </a>
                        ) : (
                          <div className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold tracking-widest uppercase shadow-sm group-hover:bg-white group-hover:text-black group-hover:shadow-md transition-all">
                            {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {isPast && (
                      <div className="absolute top-6 right-6 bg-black/5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-black/40">
                        Completed
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center text-gray-500 font-semibold space-y-2">
                <p>No events found.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {selected && <EventBottomSheet event={selected} onClose={() => setSelected(null)} />}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.1);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0,0,0,0.2);
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 2L14.4 9.6H22L15.8 14.1L18.2 21.7L12 17.2L5.8 21.7L8.2 14.1L2 9.6H9.6L12 2Z" />
    </svg>
  )
}
