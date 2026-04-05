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

// ============================================================================
// Simplified Schema Types (Post-Migration)
// ============================================================================

/**
 * Organization/Society document
 * Manages IEEE societies, chapters, and branches
 */
export interface Organization {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    name: string;
    slug: string;
    type?: 'student_branch' | 'chapter' | 'society';
    description?: string;
    logo_url?: string;
    contact_email?: string;
    social_links?: {
        website?: string;
        instagram?: string;
        linkedin?: string;
    };
    admins?: string[];
    settings?: {
        default_payment_account?: string;
    };
}

/**
 * Venue information for events
 */
export interface EventVenue {
    type: 'physical' | 'online' | 'hybrid';
    address?: string;
    room?: string;
    map_url?: string;
    online_link?: string;
}

/**
 * Pricing information for events
 */
export interface EventPricing {
    is_paid: boolean;
    ieee_member_price?: number;
    non_member_price?: number;
    early_bird_price?: number;
    early_bird_deadline?: string;
    currency?: string;
}

/**
 * Dynamic form field definition
 */
export interface EventFormField {
    field_id: string;
    label: string;
    type: 'text' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'email' | 'phone' | 'number';
    options?: string[];
    required: boolean;
    order: number;
}

/**
 * Speaker information for events
 */
export interface EventSpeaker {
    name: string;
    title?: string;
    bio?: string;
    photo_url?: string;
    linkedin?: string;
}

/**
 * Schedule item for events
 */
export interface EventScheduleItem {
    time: string;
    title: string;
    description?: string;
    speaker?: string;
}

/**
 * FAQ item for events
 */
export interface EventFAQ {
    question: string;
    answer: string;
}

/**
 * Event settings
 */
export interface EventSettings {
    require_approval?: boolean;
    allow_waitlist?: boolean;
    check_in_enabled?: boolean;
    certificate_enabled?: boolean;
    self_check_in?: boolean;
}

/**
 * Event organizer reference
 */
export interface EventOrganizer {
    user_id: string;
    role: 'lead' | 'volunteer';
}

/**
 * Consolidated Event document
 * Merges old `events` + `event_metadata` collections
 */
export interface ConsolidatedEvent {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    
    // Organization reference (replaces society_id)
    org_id: string;
    society_id?: string; // Backwards compatibility
    
    // Basic Info
    title: string;
    slug?: string;
    description?: string;
    short_description?: string;
    
    // Timing
    date: string; // Legacy field, use start_date
    start_date?: string;
    end_date?: string;
    registration_deadline?: string;
    registration_start?: string;
    timezone?: string;
    
    // Location
    venue?: string; // Legacy field
    venue_details?: EventVenue;
    
    // Capacity & Counts (denormalized for performance)
    max_capacity?: number;
    registered_count?: number;
    checked_in_count?: number;
    waitlist_count?: number;
    
    // Pricing (merged from event_metadata)
    price: number;
    is_paid?: boolean;
    ieee_member_price?: number;
    non_member_price?: number;
    early_bird_price?: number;
    early_bird_deadline?: string;
    currency?: string;
    pricing_tiers?: string; // JSON string for complex pricing
    
    // Media
    banner_url?: string;
    gallery_urls?: string[];
    
    // Registration Form (dynamic fields)
    registration_form?: EventFormField[];
    form_template?: string; // Legacy JSON string
    form_template_id?: string;
    
    // Status
    status: 'draft' | 'published' | 'archived' | 'completed' | 'cancelled';
    visibility?: 'public' | 'members_only' | 'invite_only';
    registration_open?: boolean;
    
    // Metadata (merged from event_metadata)
    tags?: string; // Comma-separated or JSON array
    category?: 'workshop' | 'seminar' | 'hackathon' | 'conference' | 'meetup' | 'other';
    speakers?: EventSpeaker[];
    schedule?: EventScheduleItem[];
    faqs?: EventFAQ[];
    
    // Settings (merged from event_metadata)
    settings?: EventSettings;
    check_in_enabled?: boolean;
    self_check_in?: boolean;
    enable_waitlist?: boolean;
    allow_waitlist?: boolean;
    waitlist_limit?: number;
    
    // Contact
    contact_email?: string;
    contact_phone?: string;
    external_link?: string;
    
    // Organizers
    organizers?: EventOrganizer[];
    created_by?: string;
    
    // Soft delete
    is_deleted?: boolean;
    deleted_at?: string;
}

/**
 * Embedded ticket within registration
 * Replaces separate tickets collection
 */
export interface EmbeddedTicket {
    ticket_id: string;
    ticket_code: string;
    qr_code: string;
    qr_data?: string;
    qr_image_url?: string;
    issued_at: string;
    expires_at?: string;
    is_scanned?: boolean;
    scanned_at?: string;
}

/**
 * Payment information within registration
 */
export interface RegistrationPayment {
    required: boolean;
    amount?: number;
    currency?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    method?: 'razorpay' | 'upi' | 'cash' | 'free';
    transaction_id?: string;
    payment_gateway_response?: Record<string, unknown>;
    paid_at?: string;
    refunded_at?: string;
    refund_reason?: string;
}

/**
 * Notification tracking within registration
 */
export interface RegistrationNotification {
    type: 'confirmation' | 'ticket' | 'cancellation';
    sent_at: string;
    channel: 'email' | 'sms';
}

/**
 * Consolidated Registration document
 * Merges old `event_registrations` + `tickets` collections
 */
export interface ConsolidatedRegistration {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    
    // References
    event_id: string;
    user_id: string;
    
    // Registration Details
    registration_number?: string;
    registration_status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted' | 'expired';
    
    // User Info (denormalized)
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    
    // Form Responses (matches event.registration_form)
    form_responses: string; // JSON string of key-value pairs
    
    // Embedded Ticket (was separate collection)
    ticket?: string; // JSON string of EmbeddedTicket
    ticket_id?: string; // Legacy reference for backwards compatibility
    
    // Check-in Status (denormalized)
    checked_in: boolean;
    checked_in_at?: string;
    check_in_time?: string;
    checked_in_by?: string;
    
    // Payment
    payment_status: 'pending' | 'paid' | 'completed' | 'failed' | 'refunded' | 'not_required';
    payment?: string; // JSON string of RegistrationPayment
    payment_ticket_id?: string;
    
    // Metadata
    source?: 'web' | 'app' | 'admin' | 'import';
    ip_address?: string;
    user_agent?: string;
    registration_date?: string;
    
    // Notifications
    notifications_sent?: string; // JSON string of RegistrationNotification[]
    
    // Cancellation
    cancelled_at?: string;
    cancellation_reason?: string;
}


/**
 * Email notification tracking document
 */
export interface EmailNotification {
    $id: string;
    $createdAt: string;
    
    // Target
    recipient_email: string;
    recipient_user_id?: string;
    
    // Context
    event_id?: string;
    registration_id?: string;
    org_id: string;
    
    // Email details
    type: 'registration_confirmation' | 'ticket' | 'cancellation' | 'announcement';
    subject: string;
    template_id?: string;
    template_data?: Record<string, unknown>;
    
    // Status
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
    
    // Timestamps
    queued_at?: string;
    sent_at?: string;
    delivered_at?: string;
    opened_at?: string;
    
    // Error handling
    error?: {
        code?: string;
        message?: string;
        retry_count?: number;
    };
    
    // Provider info
    provider?: 'sendgrid' | 'ses' | 'smtp';
    provider_message_id?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Parse embedded ticket from registration
 */
export function parseEmbeddedTicket(registration: ConsolidatedRegistration): EmbeddedTicket | null {
    if (!registration.ticket) return null;
    try {
        return JSON.parse(registration.ticket) as EmbeddedTicket;
    } catch {
        return null;
    }
}

/**
 * Parse form responses from registration
 */
export function parseFormResponses(registration: ConsolidatedRegistration): Record<string, unknown> {
    if (!registration.form_responses) return {};
    try {
        return JSON.parse(registration.form_responses) as Record<string, unknown>;
    } catch {
        return {};
    }
}

/**
 * Parse payment info from registration
 */
export function parsePaymentInfo(registration: ConsolidatedRegistration): RegistrationPayment | null {
    if (!registration.payment) return null;
    try {
        return JSON.parse(registration.payment) as RegistrationPayment;
    } catch {
        return null;
    }
}

