import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import Papa from 'papaparse';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { getUsers, EVENTS_COLLECTION_ID, REGISTRATIONS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/api/appwrite-admin';

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

// Format date for export
function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
}

// Parse form responses safely
function parseFormResponses(formResponses: string | null | undefined): Record<string, unknown> {
    if (!formResponses) return {};
    try {
        return JSON.parse(formResponses);
    } catch {
        return {};
    }
}

/**
 * GET /api/admin/events/[eventId]/export
 * Export registrations as CSV or PDF
 * 
 * Query params:
 * - type: 'csv' | 'pdf' (default: 'csv')
 * - filter: 'all' | 'checked_in' | 'contacts' | 'pending' (default: 'all')
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const { eventId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'csv';
    const filter = searchParams.get('filter') || 'all';

    try {
        // Authentication - verify user is signed in
        const user = await getSignedInUserFromRequest(req);
        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Authentication required.' },
                { status: 401 }
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

        // Authorization - check if user is admin or chair of this event's society
        const users = getUsers();
        const memberships = await users.listMemberships(user.$id);

        // Check if user is global admin
        const isGlobalAdmin = memberships.memberships.some(
            m => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
        );

        // Check if user is chair of event's society
        let isEventChair = false;
        if (!isGlobalAdmin && event.society_id) {
            try {
                // Get society to find the chair team
                const society = await databases.getDocument(
                    DATABASE_ID,
                    SOCIETIES_COLLECTION_ID,
                    event.society_id as string
                );
                const chairTeamId = `chair_${society.slug}`;
                
                isEventChair = memberships.memberships.some(
                    m => m.teamId === chairTeamId || m.teamName === chairTeamId
                );
            } catch (error) {
                console.error('Error checking society chair access:', error);
            }
        }

        if (!isGlobalAdmin && !isEventChair) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'You do not have permission to export this event.' },
                { status: 403 }
            );
        }

        // Build query based on filter
        const queries: string[] = [Query.equal('event_id', eventId)];
        
        if (filter === 'checked_in') {
            queries.push(Query.equal('checked_in', true));
        } else if (filter === 'pending') {
            queries.push(Query.equal('payment_status', 'pending'));
        }

        // Fetch all registrations with pagination
        const registrations: Record<string, unknown>[] = [];
        let offset = 0;
        const limit = 100;
        
        while (true) {
            const batch = await databases.listDocuments(
                DATABASE_ID,
                REGISTRATIONS_COLLECTION_ID,
                [
                    ...queries,
                    Query.limit(limit),
                    Query.offset(offset),
                    Query.orderDesc('registration_date'),
                ]
            );
            
            registrations.push(...batch.documents);
            
            if (batch.documents.length < limit) break;
            offset += limit;
        }

        if (registrations.length === 0) {
            return NextResponse.json(
                { error: 'NO_DATA', message: 'No registrations found matching the filter' },
                { status: 404 }
            );
        }

        // Generate CSV based on filter type
        let csvData: Record<string, unknown>[];
        let filename: string;
        const eventSlug = (event.title as string).replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const timestamp = new Date().toISOString().split('T')[0];

        if (filter === 'contacts') {
            // Contact list: Names, emails, phones only
            csvData = registrations.map((r, index) => ({
                'S.No': index + 1,
                'Name': r.user_name || '-',
                'Email': r.user_email || '-',
                'Phone': r.user_phone || '-',
            }));
            filename = `${eventSlug}_Contacts_${timestamp}.csv`;
        } else if (filter === 'checked_in') {
            // Attendance report: Checked-in students with check-in time
            csvData = registrations.map((r, index) => {
                const formData = parseFormResponses(r.form_responses as string);
                return {
                    'S.No': index + 1,
                    'Ticket ID': r.ticket_id || '-',
                    'Name': r.user_name || '-',
                    'Email': r.user_email || '-',
                    'Phone': r.user_phone || '-',
                    'Department': formData.department || formData.dept || '-',
                    'Semester': formData.semester || formData.sem || '-',
                    'Check-in Time': formatDate(r.check_in_time as string),
                    'Checked In By': r.checked_in_by || '-',
                };
            });
            filename = `${eventSlug}_Attendance_${timestamp}.csv`;
        } else {
            // All registrations: Full data with all fields
            csvData = registrations.map((r, index) => {
                const formData = parseFormResponses(r.form_responses as string);
                
                // Base fields
                const row: Record<string, unknown> = {
                    'S.No': index + 1,
                    'Ticket ID': r.ticket_id || '-',
                    'Name': r.user_name || '-',
                    'Email': r.user_email || '-',
                    'Phone': r.user_phone || '-',
                    'Registration Date': formatDate(r.registration_date as string),
                    'Registration Status': r.registration_status || '-',
                    'Payment Status': r.payment_status || '-',
                    'Amount Paid': r.amount_paid || 0,
                    'Payment Reference': r.payment_reference || '-',
                    'UTR Number': r.utr_number || '-',
                    'Checked In': r.checked_in ? 'Yes' : 'No',
                    'Check-in Time': r.checked_in ? formatDate(r.check_in_time as string) : '-',
                };

                // Add common form fields
                row['Department'] = formData.department || formData.dept || '-';
                row['Semester'] = formData.semester || formData.sem || '-';
                row['Section'] = formData.section || '-';
                row['Roll Number'] = formData.roll_number || formData.rollNumber || '-';
                row['College'] = formData.college || '-';
                row['Year'] = formData.year || '-';

                // Add any additional custom fields from form_responses
                const standardFields = [
                    'department', 'dept', 'semester', 'sem', 'section', 
                    'roll_number', 'rollNumber', 'college', 'year'
                ];
                
                Object.entries(formData).forEach(([key, value]) => {
                    if (!standardFields.includes(key) && value) {
                        // Convert camelCase/snake_case to Title Case
                        const label = key
                            .replace(/_/g, ' ')
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                        row[`Custom: ${label}`] = String(value);
                    }
                });

                return row;
            });
            filename = `${eventSlug}_Registrations_${timestamp}.csv`;
        }

        // Generate CSV using papaparse
        const csv = Papa.unparse(csvData, {
            quotes: true,
            header: true,
        });

        // Add BOM for Excel compatibility with UTF-8
        const bom = '\uFEFF';
        const csvWithBom = bom + csv;

        // Return CSV file
        return new NextResponse(csvWithBom, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Export API error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Failed to export data' },
            { status: 500 }
        );
    }
}
