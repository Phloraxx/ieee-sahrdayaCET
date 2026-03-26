import { EventDocument, RegistrationDocument, TicketDocument } from './api/appwrite-admin';
import { FormTemplate } from './validation/schemas';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Create test event data
 */
export function createTestEvent(overrides?: Partial<EventDocument>): EventDocument {
  const now = new Date();
  const eventDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const deadline = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // 6 days from now

  return {
    $id: 'test-event-' + Math.random().toString(36).substr(2, 9),
    $createdAt: now.toISOString(),
    $updatedAt: now.toISOString(),
    title: 'Test Event',
    description: 'This is a test event',
    date: eventDate.toISOString(),
    venue: 'Test Venue',
    price: 0,
    banner_url: 'https://example.com/banner.jpg',
    society_id: 'test-society',
    status: 'published',
    max_capacity: 100,
    current_registrations: 0,
    reserved_slots: 0,
    registration_deadline: deadline.toISOString(),
    ...overrides,
  };
}

/**
 * Create paid test event
 */
export function createPaidTestEvent(overrides?: Partial<EventDocument>): EventDocument {
  return createTestEvent({
    price: 500,
    ...overrides,
  });
}

/**
 * Create full capacity test event
 */
export function createFullCapacityEvent(overrides?: Partial<EventDocument>): EventDocument {
  return createTestEvent({
    max_capacity: 50,
    current_registrations: 50,
    ...overrides,
  });
}

/**
 * Create test registration data
 */
export function createTestRegistration(
  userId: string,
  eventId: string,
  overrides?: Partial<RegistrationDocument>
): RegistrationDocument {
  const now = new Date();

  return {
    $id: 'test-reg-' + Math.random().toString(36).substr(2, 9),
    $createdAt: now.toISOString(),
    $updatedAt: now.toISOString(),
    user_id: userId,
    event_id: eventId,
    form_data: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
    }),
    payment_status: 'completed',
    registration_status: 'confirmed',
    ...overrides,
  };
}

/**
 * Create test ticket
 */
export function createTestTicket(
  registrationId: string,
  userId: string,
  eventId: string,
  overrides?: Partial<TicketDocument>
): TicketDocument {
  const now = new Date();
  const qrData = `${eventId}:${registrationId}:${userId}`;

  return {
    $id: 'test-ticket-' + Math.random().toString(36).substr(2, 9),
    $createdAt: now.toISOString(),
    $updatedAt: now.toISOString(),
    registration_id: registrationId,
    user_id: userId,
    event_id: eventId,
    qr_data: qrData,
    is_scanned: false,
    ...overrides,
  };
}

/**
 * Create test form template
 */
export function createTestFormTemplate(includeAllTypes = false): FormTemplate {
  if (includeAllTypes) {
    return {
      questions: [
        {
          id: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
          validation: { min: 2, max: 100 },
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
        },
        {
          id: 'phone',
          type: 'phone',
          label: 'Phone Number',
          required: false,
        },
        {
          id: 'age',
          type: 'number',
          label: 'Age',
          required: true,
          validation: { min: 13, max: 100 },
        },
        {
          id: 'dob',
          type: 'date',
          label: 'Date of Birth',
          required: false,
        },
        {
          id: 'tshirt_size',
          type: 'select',
          label: 'T-Shirt Size',
          required: true,
          options: ['S', 'M', 'L', 'XL', 'XXL'],
        },
        {
          id: 'dietary',
          type: 'radio',
          label: 'Dietary Preference',
          required: true,
          options: ['Vegetarian', 'Non-Vegetarian', 'Vegan'],
        },
        {
          id: 'interests',
          type: 'checkbox',
          label: 'Areas of Interest',
          required: false,
          options: ['AI/ML', 'Web Dev', 'Mobile Dev', 'IoT', 'Blockchain'],
        },
        {
          id: 'comments',
          type: 'textarea',
          label: 'Additional Comments',
          required: false,
          validation: { max: 500 },
        },
      ],
      version: '1.0',
    };
  }

  // Simple form template
  return {
    questions: [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        required: false,
      },
    ],
    version: '1.0',
  };
}

/**
 * Create valid form submission data
 */
export function createValidFormData(template: FormTemplate): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const question of template.questions) {
    if (!question.required) continue;

    switch (question.type) {
      case 'text':
      case 'textarea':
        data[question.id] = 'Test Value';
        break;
      case 'email':
        data[question.id] = 'test@example.com';
        break;
      case 'phone':
        data[question.id] = '9876543210';
        break;
      case 'number':
        data[question.id] = question.validation?.min || 1;
        break;
      case 'date':
        data[question.id] = new Date().toISOString().split('T')[0];
        break;
      case 'select':
      case 'radio':
        data[question.id] = question.options?.[0] || 'Option 1';
        break;
      case 'checkbox':
        data[question.id] = [question.options?.[0] || 'Option 1'];
        break;
    }
  }

  return data;
}

// ============================================================================
// Mock Appwrite Responses
// ============================================================================

/**
 * Mock Appwrite success response
 */
export function mockAppwriteSuccess<T>(data: T) {
  return Promise.resolve(data);
}

/**
 * Mock Appwrite error response
 */
export function mockAppwriteError(code: number, message: string, type?: string) {
  const error = new Error(message) as Error & { code: number; type?: string };
  error.code = code;
  error.type = type;
  return Promise.reject(error);
}

/**
 * Mock Appwrite list response
 */
export function mockAppwriteList<T>(documents: T[], total?: number) {
  return Promise.resolve({
    total: total ?? documents.length,
    documents,
  });
}

// ============================================================================
// Mock Payment Responses
// ============================================================================

/**
 * Mock successful payment
 */
export function mockPaymentSuccess(transactionId?: string) {
  return {
    success: true,
    transaction_id: transactionId || 'txn_' + Math.random().toString(36).substr(2, 9),
    amount: 500,
    currency: 'INR',
    status: 'completed',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock failed payment
 */
export function mockPaymentFailure(reason = 'Payment declined') {
  return {
    success: false,
    error: 'PAYMENT_FAILED',
    message: reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock pending payment
 */
export function mockPaymentPending(paymentUrl: string) {
  return {
    success: true,
    status: 'pending',
    payment_url: paymentUrl,
    qr_code: 'upi://pay?pa=test@upi&pn=Test&am=500&cu=INR',
    expires_in: 300, // 5 minutes
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Test Assertions
// ============================================================================

/**
 * Assert that response has error
 */
export function assertError(response: { error?: string }, expectedError?: string) {
  if (!response.error) {
    throw new Error('Expected error response but got success');
  }
  if (expectedError && response.error !== expectedError) {
    throw new Error(`Expected error "${expectedError}" but got "${response.error}"`);
  }
}

/**
 * Assert that response is success
 */
export function assertSuccess<T extends { success?: boolean }>(response: T): asserts response is T & { success: true } {
  if (!response.success) {
    throw new Error('Expected success response but got error');
  }
}

/**
 * Assert field errors exist
 */
export function assertFieldErrors(
  response: { field_errors?: Record<string, string> },
  expectedFields: string[]
) {
  if (!response.field_errors) {
    throw new Error('Expected field_errors but none found');
  }
  for (const field of expectedFields) {
    if (!response.field_errors[field]) {
      throw new Error(`Expected field error for "${field}" but none found`);
    }
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a test user ID
 */
export function createTestUserId(): string {
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a test IP address
 */
export function createTestIP(): string {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * Generate QR code data
 */
export function generateQRData(eventId: string, registrationId: string, userId: string): string {
  return `${eventId}:${registrationId}:${userId}`;
}

/**
 * Parse QR code data
 */
export function parseQRData(qrData: string): { eventId: string; registrationId: string; userId: string } | null {
  const parts = qrData.split(':');
  if (parts.length !== 3) return null;
  return {
    eventId: parts[0],
    registrationId: parts[1],
    userId: parts[2],
  };
}
