import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const paymentStatus = searchParams.get('payment_status') || 'all';
    const checkinStatus = searchParams.get('checkin_status') || 'all';
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
    
    // Add sorting
    if (sortOrder === 'desc') {
      queries.push(Query.orderDesc(sortBy === 'registration_date' ? '$createdAt' : sortBy));
    } else {
      queries.push(Query.orderAsc(sortBy === 'registration_date' ? '$createdAt' : sortBy));
    }
    
    // Get total count
    const countQueries = [Query.equal('event_id', eventId)];
    if (paymentStatus && paymentStatus !== 'all') {
      countQueries.push(Query.equal('payment_status', paymentStatus));
    }
    const allRegistrations = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, countQueries);
    const total = allRegistrations.total;
    
    // Add pagination
    queries.push(Query.limit(limit));
    queries.push(Query.offset((page - 1) * limit));
    
    // Fetch registrations
    const registrationsRes = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, queries);
    
    // Enrich with user info
    const enrichedRegistrations = await Promise.all(
      registrationsRes.documents.map(async (reg) => {
        let userName = 'Unknown';
        let userEmail = '';
        
        try {
          const regUser = await users.get(reg.user_id as string);
          userName = regUser.name || 'Unknown';
          userEmail = regUser.email || '';
        } catch {
          // User not found, use form data
          const formData = reg.form_data as Record<string, unknown> | undefined;
          if (formData) {
            userName = (formData.name as string) || 'Unknown';
            userEmail = (formData.email as string) || '';
          }
        }
        
        // Apply search filter client-side if search term provided
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesName = userName.toLowerCase().includes(searchLower);
          const matchesEmail = userEmail.toLowerCase().includes(searchLower);
          if (!matchesName && !matchesEmail) {
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
          user_phone: ((reg.form_data || {}) as Record<string, unknown>).phone as string || '',
          department: ((reg.form_data || {}) as Record<string, unknown>).department as string || '',
          semester: ((reg.form_data || {}) as Record<string, unknown>).semester as string || '',
          form_data: reg.form_data,
          payment_status: reg.payment_status || 'pending',
          registration_status: reg.registration_status || 'pending',
          checked_in: reg.checked_in || false,
          checked_in_at: reg.checked_in_at,
          ticket_id: reg.ticket_id,
        };
      })
    );
    
    // Filter out nulls (search results)
    const filteredRegistrations = enrichedRegistrations.filter(r => r !== null);
    
    // Get event details
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);

    return NextResponse.json({
      registrations: filteredRegistrations,
      total: search ? filteredRegistrations.length : total,
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
