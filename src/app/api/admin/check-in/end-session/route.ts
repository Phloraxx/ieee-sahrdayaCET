import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { createLogger } from '@/lib/api/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const endSessionSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

/**
 * POST /api/admin/check-in/end-session
 * Sessionless mode: Returns success without any DB operations
 * No actual session document exists to update
 */
export async function POST(req: NextRequest) {
  const log = createLogger({ action: 'end_check_in_session' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized session end attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // Validate request body
    const body = await req.json();
    const parsed = endSessionSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid end session data', { errors: parsed.error.issues, userId });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid session data.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const { session_id } = parsed.data;

    // Sessionless mode: No DB operations needed
    // Just acknowledge the end of the session
    log.info('Virtual check-in session ended (sessionless mode)', { 
      sessionId: session_id, 
      userId 
    });

    return NextResponse.json({
      success: true,
      session: {
        $id: session_id,
        status: 'completed',
        ended_at: new Date().toISOString(),
        ended_by: userId,
        _sessionless: true,
      },
      stats: {
        total_checked_in: 0, // Stats come from event.checked_in_count, not session
      },
      message: 'Check-in session ended successfully (sessionless mode).',
      notice: 'Sessions are optional. Check-in counts are tracked at the event level.',
    });
  } catch (error) {
    log.error('Failed to end session', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to end check-in session.' },
      { status: 500 }
    );
  }
}

