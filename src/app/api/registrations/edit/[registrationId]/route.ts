import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { getRegistration, updateRegistration } from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { editRegistrationSchema } from '@/lib/api/validation';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ registrationId: string }>;
}

/**
 * PATCH /api/registrations/edit/[registrationId]
 * Edit registration before payment is completed
 * Requires authentication (user must own registration)
 * Only allows edits if payment_status = 'pending'
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { registrationId } = await params;
  const log = createLogger({ action: 'edit-registration', registrationId });

  try {
    // 1. Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Edit registration attempt without authentication');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'You must be signed in to edit registration.' },
        { status: 401 }
      );
    }

    const userId = user.$id;
    log.info('Edit registration request', { userId });

    // 2. Get registration
    const registration = await getRegistration(registrationId);
    if (!registration) {
      log.warn('Registration not found');
      return NextResponse.json(
        { error: 'REGISTRATION_NOT_FOUND', message: 'The requested registration does not exist.' },
        { status: 404 }
      );
    }

    // 3. Check ownership
    if (registration.user_id !== userId) {
      log.warn('Unauthorized edit attempt', { ownerId: registration.user_id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You can only edit your own registrations.' },
        { status: 403 }
      );
    }

    // 4. Check if editable (payment must be pending)
    if (registration.payment_status !== 'pending') {
      log.warn('Edit attempt on non-pending registration', { status: registration.payment_status });
      return NextResponse.json(
        { error: 'EDIT_NOT_ALLOWED', message: 'Registrations can only be edited before payment is completed.' },
        { status: 400 }
      );
    }

    // 5. Validate request body
    const body = await req.json();
    const parsed = editRegistrationSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid edit data', { errors: parsed.error.issues });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data provided.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // 6. Update registration
    const updateData: { form_data?: Record<string, unknown> } = {};
    
    if (parsed.data.form_data) {
      // Merge with existing form data
      let existingFormData: Record<string, unknown> = {};
      try {
        existingFormData = JSON.parse(registration.form_data || '{}');
      } catch {
        // Keep empty object
      }
      updateData.form_data = { ...existingFormData, ...parsed.data.form_data };
    }

    const updatedRegistration = await updateRegistration(registrationId, updateData);

    log.info('Registration updated', { userId });

    return NextResponse.json({
      success: true,
      message: 'Registration updated successfully.',
      registration: {
        id: updatedRegistration.$id,
        payment_status: updatedRegistration.payment_status,
        registration_status: updatedRegistration.registration_status,
        updated_at: updatedRegistration.$updatedAt,
      },
    });
  } catch (error) {
    log.error('Failed to edit registration', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

