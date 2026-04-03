import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
  ID,
  Query,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  REGISTRATIONS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

function normalizeIndianPhone(raw: string): { local: string; e164: string } | null {
  const digits = raw.replace(/\D/g, '');
  let local = '';

  if (/^[6-9]\d{9}$/.test(digits)) {
    local = digits;
  } else if (/^91[6-9]\d{9}$/.test(digits)) {
    local = digits.slice(2);
  } else if (/^0[6-9]\d{9}$/.test(digits)) {
    local = digits.slice(1);
  }

  if (!local) return null;
  return { local, e164: `+91${local}` };
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function parseRegistrationFormPayload(reg: Record<string, unknown>): Record<string, unknown> {
  const fromFormResponses = reg.form_responses;
  if (typeof fromFormResponses === 'string' && fromFormResponses.trim()) {
    try {
      const parsed = JSON.parse(fromFormResponses);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to legacy shape
    }
  } else if (fromFormResponses && typeof fromFormResponses === 'object' && !Array.isArray(fromFormResponses)) {
    return fromFormResponses as Record<string, unknown>;
  }

  const fromFormData = reg.form_data;
  if (typeof fromFormData === 'string' && fromFormData.trim()) {
    try {
      const parsed = JSON.parse(fromFormData);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  } else if (fromFormData && typeof fromFormData === 'object' && !Array.isArray(fromFormData)) {
    return fromFormData as Record<string, unknown>;
  }

  return {};
}

function getRegistrationPhone(reg: Record<string, unknown>, formPayload: Record<string, unknown>): string {
  return (
    asNonEmptyString(reg.user_phone) ||
    asNonEmptyString(reg.user_phone_) ||
    asNonEmptyString(formPayload.user_phone) ||
    asNonEmptyString(formPayload.user_phone_) ||
    asNonEmptyString(formPayload.phone) ||
    ''
  );
}

/**
 * Check if user is chair of event's society or global admin
 */
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    // Check if user is global admin
    const isAdmin = memberships.memberships.some(m => 
      m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );
    if (isAdmin) return true;
    
    // Get society to check chair team
    const society = await db.getDocument(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      event.society_id as string
    );
    const chairTeamId = `chair_${society.slug}`;
    
    // Check if user is chair
    return memberships.memberships.some(m => 
      m.teamId === chairTeamId || m.teamName === chairTeamId
    );
  } catch (error) {
    console.error('Error checking chair access:', error);
    return false;
  }
}

/**
 * GET /api/admin/events/[eventId]/registrations
 * List all registrations for an event with pagination and filters
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'list_event_registrations', eventId });

  try {
    // Authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Authorization
    const isChair = await isUserChairOfEvent(user.$id, eventId);
    if (!isChair) {
      log.warn('Unauthorized registrations access', { userId: user.$id, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to view this event\'s registrations.' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const allIdsOnly = searchParams.get('all_ids') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const paymentStatus = searchParams.get('payment_status') || 'all';
    const checkinStatus = searchParams.get('checkin_status') || 'all';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const sortBy = searchParams.get('sort_by') || 'registration_date';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    const db = getDatabases();
    const users = getUsers();
    
    // Build query
    const queries: string[] = [
      Query.equal('event_id', eventId),
    ];
    
    // Add filters
    if (paymentStatus && paymentStatus !== 'all') {
      queries.push(Query.equal('payment_status', paymentStatus));
    }
    
    if (checkinStatus && checkinStatus !== 'all') {
      if (checkinStatus === 'checked_in') {
        queries.push(Query.equal('checked_in', true));
      } else if (checkinStatus === 'not_checked_in') {
        queries.push(Query.equal('checked_in', false));
      }
    }

    // Add date range filters
    if (dateFrom) {
      queries.push(Query.greaterThanEqual('$createdAt', dateFrom));
    }
    if (dateTo) {
      queries.push(Query.lessThanEqual('$createdAt', dateTo));
    }

    // If only IDs are requested, return them quickly
    if (allIdsOnly) {
      const allIds: string[] = [];
      let cursor: string | undefined = undefined;
      
      // Fetch all IDs in batches of 100
      while (true) {
        const batchQueries = [...queries, Query.limit(100)];
        if (cursor) {
          batchQueries.push(Query.cursorAfter(cursor));
        }
        
        const batch = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, batchQueries);
        allIds.push(...batch.documents.map(doc => doc.$id));
        
        if (batch.documents.length < 100) break;
        cursor = batch.documents[batch.documents.length - 1].$id;
      }
      
      return NextResponse.json({ all_ids: allIds });
    }
    
    // Add sorting
    if (sortOrder === 'desc') {
      queries.push(Query.orderDesc(sortBy === 'registration_date' ? '$createdAt' : sortBy));
    } else {
      queries.push(Query.orderAsc(sortBy === 'registration_date' ? '$createdAt' : sortBy));
    }
    
    // When searching, we need to fetch ALL registrations first (up to 500),
    // enrich them with user info, apply search filter, then paginate.
    // This is because search is on user name/email which requires user lookup.
    const isSearching = !!search.trim();
    const SEARCH_FETCH_LIMIT = 500; // Max registrations to fetch when searching
    
    // For non-search queries, get total count first
    let totalBeforeSearch = 0;
    if (!isSearching) {
      const countQueries = [Query.equal('event_id', eventId)];
      if (paymentStatus && paymentStatus !== 'all') {
        countQueries.push(Query.equal('payment_status', paymentStatus));
      }
      if (checkinStatus && checkinStatus !== 'all') {
        if (checkinStatus === 'checked_in') {
          countQueries.push(Query.equal('checked_in', true));
        } else if (checkinStatus === 'not_checked_in') {
          countQueries.push(Query.equal('checked_in', false));
        }
      }
      if (dateFrom) {
        countQueries.push(Query.greaterThanEqual('$createdAt', dateFrom));
      }
      if (dateTo) {
        countQueries.push(Query.lessThanEqual('$createdAt', dateTo));
      }
      const allRegistrations = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, countQueries);
      totalBeforeSearch = allRegistrations.total;
    }
    
    // Add pagination/limit based on whether we're searching
    if (isSearching) {
      // Fetch more results when searching to allow post-filtering
      queries.push(Query.limit(SEARCH_FETCH_LIMIT));
      // No offset - we'll paginate after filtering
    } else {
      // Normal pagination
      queries.push(Query.limit(limit));
      queries.push(Query.offset((page - 1) * limit));
    }
    
    // Fetch registrations
    const registrationsRes = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, queries);
    
    // Enrich with user info and apply search filter
    const searchLower = search.toLowerCase().trim();
    const enrichedRegistrations = await Promise.all(
      registrationsRes.documents.map(async (reg) => {
        const regRecord = reg as Record<string, unknown>;
        const formPayload = parseRegistrationFormPayload(regRecord);
        let userName = 'Unknown';
        let userEmail = '';
        
        try {
          const regUser = await users.get(reg.user_id as string);
          userName = regUser.name || 'Unknown';
          userEmail = regUser.email || '';
        } catch {
          // User not found, use stored registration payload
          userName = asNonEmptyString(formPayload.name) || 'Unknown';
          userEmail = asNonEmptyString(formPayload.email) || '';
        }
        
        const userPhone = getRegistrationPhone(regRecord, formPayload);
        const ticketId = (reg.ticket_id as string) || '';
        
        // Apply search filter if searching
        if (isSearching) {
          const matchesName = userName.toLowerCase().includes(searchLower);
          const matchesEmail = userEmail.toLowerCase().includes(searchLower);
          const matchesPhone = userPhone.includes(searchLower);
          const matchesTicket = ticketId.toLowerCase().includes(searchLower);
          if (!matchesName && !matchesEmail && !matchesPhone && !matchesTicket) {
            return null;
          }
        }
        
        return {
          id: reg.$id, // Map the Appwrite ID to the expected UI property
          $id: reg.$id,
          $createdAt: reg.$createdAt,
          user_id: reg.user_id,
          user_name: userName,
          user_email: userEmail,
          user_phone: userPhone,
          department: asNonEmptyString(formPayload.department) || asNonEmptyString(formPayload.dept) || '',
          semester: asNonEmptyString(formPayload.semester) || asNonEmptyString(formPayload.sem) || '',
          form_data: formPayload,
          payment_status: reg.payment_status || 'pending',
          registration_status: reg.registration_status || 'pending',
          checked_in: reg.checked_in || false,
          checked_in_at: reg.checked_in_at,
          ticket_id: ticketId,
        };
      })
    );
    
    // Filter out nulls (search non-matches)
    const allFilteredRegistrations = enrichedRegistrations.filter(r => r !== null);
    
    // Calculate totals and apply pagination for search results
    let finalRegistrations;
    let total: number;
    let pages: number;
    
    if (isSearching) {
      // For search: total is the filtered count, paginate the filtered results
      total = allFilteredRegistrations.length;
      pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      finalRegistrations = allFilteredRegistrations.slice(startIndex, startIndex + limit);
    } else {
      // For non-search: use the pre-counted total
      total = totalBeforeSearch;
      pages = Math.ceil(total / limit);
      finalRegistrations = allFilteredRegistrations;
    }
    
    // Get event details
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);

    return NextResponse.json({
      registrations: finalRegistrations,
      total,
      pages,
      page,
      limit,
      event: {
        $id: event.$id,
        title: event.title,
        date: event.date,
        price: event.price,
      },
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }
    
    log.error('Failed to fetch registrations', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch registrations.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events/[eventId]/registrations
 * Manual registration by admin
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'manual_registration', eventId });

  try {
    // Authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Authorization
    const isChair = await isUserChairOfEvent(user.$id, eventId);
    if (!isChair) {
      log.warn('Unauthorized manual registration attempt', { userId: user.$id, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to create registrations for this event.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, email, phone, department, semester, section, roll_number } = body;
    const normalizedPhone = phone && String(phone).trim()
      ? normalizeIndianPhone(String(phone))
      : null;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Name and email are required.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (phone && String(phone).trim() && !normalizedPhone) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Phone must be a valid Indian mobile number.' },
        { status: 400 }
      );
    }

    const db = getDatabases();
    const users = getUsers();

    // Get event
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    // Find or create user
    let targetUserId: string;
    try {
      const usersList = await users.list([Query.equal('email', email), Query.limit(1)]);
      if (usersList.users.length > 0) {
        targetUserId = usersList.users[0].$id;
        log.info('Found existing user', { targetUserId, email });
      } else {
        const newUser = await users.create(
          ID.unique(),
          email,
          normalizedPhone?.e164,
          undefined,
          name
        );
        targetUserId = newUser.$id;
        log.info('Created new user', { targetUserId, email });
      }
    } catch (error) {
      log.error('Failed to find/create user', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: 'USER_ERROR', message: 'Failed to process user information.' },
        { status: 500 }
      );
    }

    // Check for duplicate registration (active statuses only)
    const existingRegs = await db.listDocuments(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('user_id', targetUserId),
        Query.equal('event_id', eventId),
        Query.notEqual('registration_status', 'cancelled'),
        Query.notEqual('registration_status', 'expired'),
        Query.limit(1),
      ]
    );

    if (existingRegs.documents.length > 0) {
      log.warn('Duplicate registration detected', { targetUserId, eventId });
      return NextResponse.json(
        { error: 'DUPLICATE_REGISTRATION', message: 'User is already registered for this event.' },
        { status: 409 }
      );
    }

    // Prepare form data
    const formData: Record<string, unknown> = {
      name,
      email,
    };
    if (normalizedPhone) formData.phone = normalizedPhone.local;
    if (department && department.trim()) formData.department = department.trim();
    if (semester && semester.trim()) formData.semester = semester.trim();
    if (section && section.trim()) formData.section = section.trim();
    if (roll_number && roll_number.trim()) formData.roll_number = roll_number.trim();

    // Manual registrations bypass payment flow and should always be marked as free
    const paymentStatus = 'free';

    // Create registration as confirmed
    const registration = await db.createDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: targetUserId,
        event_id: eventId,
        user_name: name,
        user_email: email,
        user_phone: normalizedPhone?.local || '',
        form_responses: JSON.stringify(formData),
        payment_status: paymentStatus,
        registration_status: 'confirmed',
        registration_date: new Date().toISOString(),
        checked_in: false,
      }
    );

    log.info('Manual registration created', { 
      registrationId: registration.$id, 
      targetUserId,
      paymentStatus 
    });

    // Create ticket ID
    const ticketId = ID.unique();

    // Update registration with ticket ID
    await db.updateDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registration.$id,
      {
        ticket_id: ticketId,
      }
    );

    log.info('Ticket created for manual registration', { ticketId, registrationId: registration.$id });

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.$id,
        user_id: targetUserId,
        user_name: name,
        user_email: email,
        user_phone: normalizedPhone?.local || '',
        department: department || '',
        semester: semester || '',
        section: section || '',
        roll_number: roll_number || '',
        payment_status: paymentStatus,
        registration_status: 'confirmed',
        ticket_id: ticketId,
        registration_date: registration.$createdAt,
      },
      message: 'Registration created successfully.',
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }
    
    log.error('Failed to create manual registration', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create registration.' },
      { status: 500 }
    );
  }
}

