import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, Users } from 'node-appwrite';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { EVENTS_COLLECTION_ID, REGISTRATIONS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/api/appwrite-admin';

export const runtime = 'nodejs';

// Environment variables
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ieee_sahrdaya_db';
interface RouteParams {
    params: Promise<{ eventId: string }>;
}

// Get admin client
function getAdminClient(): Client {
    if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
        throw new Error('Missing Appwrite configuration');
    }
    return new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID)
        .setKey(API_KEY);
}

// Helper function to check if user is chair of the event
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
    const client = getAdminClient();
    const databases = new Databases(client);
    const users = new Users(client);

    try {
        // Get event
        const event = await databases.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
        
        // Get society
        const society = await databases.getDocument(DATABASE_ID, SOCIETIES_COLLECTION_ID, event.society_id as string);
        
        // Check if user is chair of this society
        const chairTeamId = `chair_${society.slug}`;
        
        // List user's team memberships
        const memberships = await users.listMemberships(userId);
        
        // Check for chair team or admins team using correct properties
        const isAuthorized = memberships.memberships.some(
            m => m.teamId === chairTeamId || m.teamName === chairTeamId || m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
        );

        return isAuthorized;
    } catch (error) {
        console.error('Error verifying chair access:', error);
        return false;
    }
}

/**
 * GET /api/admin/events/[eventId]/analytics
 * Get aggregated analytics data for an event
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const { eventId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'all';

    try {
        // Check authentication
        const user = await getSignedInUserFromRequest(req);
        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Check authorization
        const isAuthorized = await isUserChairOfEvent(user.$id, eventId);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'You do not have permission to access this event\'s analytics' },
                { status: 403 }
            );
        }

        const client = getAdminClient();
        const databases = new Databases(client);

        // Get event details
        let event;
        try {
            event = await databases.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
        } catch {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: 'Event not found' },
                { status: 404 }
            );
        }

        // Build date range filter
        const dateFilters: string[] = [Query.equal('event_id', eventId)];
        
        if (range === '7d') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            dateFilters.push(Query.greaterThan('registration_date', sevenDaysAgo.toISOString()));
        } else if (range === '30d') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilters.push(Query.greaterThan('registration_date', thirtyDaysAgo.toISOString()));
        }

        // Fetch all registrations for this event
        const registrations: Record<string, unknown>[] = [];
        let offset = 0;
        const limit = 100;
        
        while (true) {
            const batch = await databases.listDocuments(
                DATABASE_ID,
                REGISTRATIONS_COLLECTION_ID,
                [
                    ...dateFilters,
                    Query.limit(limit),
                    Query.offset(offset),
                    Query.orderDesc('registration_date'),
                ]
            );
            
            registrations.push(...batch.documents);
            
            if (batch.documents.length < limit) break;
            offset += limit;
        }

        // Calculate overview statistics
        const totalRegistrations = registrations.length;
        const confirmedRegistrations = registrations.filter(
            r => r.registration_status === 'confirmed' || r.payment_status === 'paid' || r.payment_status === 'free'
        ).length;
        const pendingRegistrations = registrations.filter(r => r.payment_status === 'pending').length;
        const cancelledRegistrations = registrations.filter(r => r.registration_status === 'cancelled').length;
        
        const capacity = (event.max_capacity as number) || 0;
        const capacityUtilization = capacity > 0 
            ? Math.round((confirmedRegistrations / capacity) * 100) 
            : 0;

        const isPaidEvent = (event.price as number) > 0;
        const totalRevenue = isPaidEvent
            ? registrations
                .filter(r => r.payment_status === 'paid')
                .reduce((sum, r) => sum + ((r.amount_paid as number) || (event.price as number) || 0), 0)
            : 0;

        const checkInCount = registrations.filter(r => r.checked_in === true).length;
        const checkInRate = confirmedRegistrations > 0 
            ? Math.round((checkInCount / confirmedRegistrations) * 100) 
            : 0;

        const completionRate = totalRegistrations > 0
            ? Math.round((confirmedRegistrations / totalRegistrations) * 100)
            : 0;

        // Registrations over time
        const registrationsByDate = new Map<string, { daily: number; cumulative: number }>();
        let cumulative = 0;
        
        // Sort by date ascending for cumulative calculation
        const sortedRegs = [...registrations].sort(
            (a, b) => new Date(a.registration_date as string).getTime() - new Date(b.registration_date as string).getTime()
        );
        
        sortedRegs.forEach(reg => {
            const date = new Date(reg.registration_date as string).toISOString().split('T')[0];
            const existing = registrationsByDate.get(date) || { daily: 0, cumulative: 0 };
            existing.daily++;
            cumulative++;
            existing.cumulative = cumulative;
            registrationsByDate.set(date, existing);
        });

        const registrationsOverTime = Array.from(registrationsByDate.entries())
            .map(([date, data]) => ({
                date,
                daily: data.daily,
                cumulative: data.cumulative,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Payment status breakdown
        const paymentCounts = {
            paid: 0,
            pending: 0,
            failed: 0,
            free: 0,
            refunded: 0,
        };
        
        registrations.forEach(reg => {
            const status = (reg.payment_status as string) || 'pending';
            if (status in paymentCounts) {
                paymentCounts[status as keyof typeof paymentCounts]++;
            }
        });

        const paymentBreakdown = Object.entries(paymentCounts)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                status: status.charAt(0).toUpperCase() + status.slice(1),
                count,
                amount: status === 'paid' 
                    ? registrations
                        .filter(r => r.payment_status === 'paid')
                        .reduce((sum, r) => sum + ((r.amount_paid as number) || 0), 0)
                    : 0,
            }));

        // Department distribution
        const departmentCounts = new Map<string, number>();
        registrations.forEach(reg => {
            // Try to get department from form_responses
            let department = 'Unknown';
            try {
                const formResponses = reg.form_responses 
                    ? JSON.parse(reg.form_responses as string) 
                    : {};
                department = formResponses.department || formResponses.dept || 'Unknown';
            } catch {
                // Use default
            }
            departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
        });

        const departmentDistribution = Array.from(departmentCounts.entries())
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);

        // Semester distribution
        const semesterCounts = new Map<string, number>();
        registrations.forEach(reg => {
            let semester = 'Unknown';
            try {
                const formResponses = reg.form_responses 
                    ? JSON.parse(reg.form_responses as string) 
                    : {};
                semester = formResponses.semester || formResponses.sem || 'Unknown';
            } catch {
                // Use default
            }
            semesterCounts.set(semester, (semesterCounts.get(semester) || 0) + 1);
        });

        // Sort semesters (S1, S2, etc.)
        const semesterDistribution = Array.from(semesterCounts.entries())
            .map(([semester, count]) => ({ semester, count }))
            .sort((a, b) => {
                const numA = parseInt(a.semester.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.semester.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

        // Check-in status
        const checkInStatus = {
            checked_in: checkInCount,
            not_checked_in: confirmedRegistrations - checkInCount,
        };

        // Recent registrations (latest 20)
        const recentRegistrations = registrations.slice(0, 20).map(reg => {
            let formResponses: Record<string, unknown> = {};
            try {
                formResponses = reg.form_responses 
                    ? JSON.parse(reg.form_responses as string) 
                    : {};
            } catch {
                // Use empty object
            }

            return {
                id: reg.$id,
                ticket_id: reg.ticket_id || '',
                user_name: reg.user_name || 'Unknown',
                user_email: reg.user_email || '',
                user_phone: reg.user_phone || '',
                department: formResponses.department || '',
                semester: formResponses.semester || '',
                section: formResponses.section || '',
                roll_number: formResponses.roll_number || '',
                registration_date: reg.registration_date || reg.$createdAt,
                payment_status: reg.payment_status || 'pending',
                checked_in: reg.checked_in === true,
                check_in_time: reg.check_in_time || null,
                form_responses: formResponses,
            };
        });

        return NextResponse.json({
            overview: {
                total_registrations: totalRegistrations,
                confirmed_registrations: confirmedRegistrations,
                pending_registrations: pendingRegistrations,
                cancelled_registrations: cancelledRegistrations,
                capacity,
                capacity_utilization: capacityUtilization,
                total_revenue: totalRevenue,
                check_in_count: checkInCount,
                check_in_rate: checkInRate,
                completion_rate: completionRate,
            },
            registrations_over_time: registrationsOverTime,
            payment_breakdown: paymentBreakdown,
            department_distribution: departmentDistribution,
            semester_distribution: semesterDistribution,
            check_in_status: checkInStatus,
            recent_registrations: recentRegistrations,
            event: {
                id: event.$id,
                title: event.title,
                date: event.date,
                venue: event.venue || '',
                price: event.price || 0,
                max_capacity: event.max_capacity || 0,
                registration_deadline: event.registration_deadline || null,
                is_paid_event: isPaidEvent,
            },
        });
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
