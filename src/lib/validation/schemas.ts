import { z } from 'zod';

// ============================================================================
// Base Field Schemas
// ============================================================================

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email is too long');

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Phone must be 10 digits starting with 6-9')
  .optional()
  .or(z.literal(''));

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z0-9\s.'-()]+$/, 'Name contains invalid characters');

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

export const dateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format');

export const priceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(100000, 'Price is too high');

export const capacitySchema = z
  .number()
  .int('Capacity must be a whole number')
  .min(1, 'Capacity must be at least 1')
  .max(10000, 'Capacity is too high')
  .optional();

// ============================================================================
// Custom Field Schemas
// ============================================================================

export const customFieldTypeSchema = z.enum([
  'text',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'textarea',
]);

export const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().max(500).optional(),
});

export const customFieldSchema = z.object({
  id: z.string().min(1).max(500),
  type: customFieldTypeSchema,
  label: z.string().min(1, 'Label is required').max(200, 'Label is too long'),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validation: fieldValidationSchema.optional(),
});

export const formTemplateSchema = z.object({
  questions: z.array(customFieldSchema).min(1, 'At least one question is required'),
  version: z.string().max(50).default('1.0'),
});

// ============================================================================
// Event Schema
// ============================================================================

export const eventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title is too long'),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional(),
  date: dateSchema,
  venue: z
    .string()
    .min(2, 'Venue must be at least 2 characters')
    .max(200, 'Venue is too long')
    .optional(),
  price: priceSchema,
  max_capacity: capacitySchema,
  registration_deadline: dateSchema.optional(),
  banner_url: urlSchema,
  society_id: z.string().min(1, 'Society ID is required'),
  status: z.enum(['draft', 'published', 'archived', 'completed']).default('draft'),
});

export const eventUpdateSchema = eventSchema.partial();

// ============================================================================
// Registration Schema
// ============================================================================

export const registrationDataSchema = z.object({
  // User info fields
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  
  // Additional fields are dynamic based on form template
  // They will be validated separately against the form template
}).passthrough(); // Allow additional fields

export const registrationSchema = z.object({
  event_id: z.string().min(1, 'Event ID is required'),
  user_id: z.string().min(1, 'User ID is required'),
  form_data: registrationDataSchema,
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  registration_status: z
    .enum(['pending', 'confirmed', 'cancelled', 'expired'])
    .default('pending'),
});

// ============================================================================
// Payment Schema
// ============================================================================

export const paymentSchema = z.object({
  registration_id: z.string().min(1, 'Registration ID is required'),
  amount: priceSchema,
  currency: z.enum(['INR', 'USD']).default('INR'),
  payment_method: z.enum(['upi', 'card', 'netbanking', 'wallet']).optional(),
  transaction_id: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
});

// ============================================================================
// Ticket Schema
// ============================================================================

export const ticketSchema = z.object({
  registration_id: z.string().min(1, 'Registration ID is required'),
  user_id: z.string().min(1, 'User ID is required'),
  event_id: z.string().min(1, 'Event ID is required'),
  qr_data: z.string().optional(),
  is_scanned: z.boolean().default(false),
  scanned_at: dateSchema.optional(),
});

// ============================================================================
// Check-in Schema
// ============================================================================

export const checkInSchema = z.object({
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  qr_data: z.string().min(1, 'QR data is required'),
});

// ============================================================================
// Email Schema
// ============================================================================

export const emailRequestSchema = z.object({
  to: z.array(emailSchema).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  body: z.string().min(1, 'Body is required').max(5000, 'Body is too long'),
  html: z.boolean().default(false),
  event_id: z.string().optional(),
  registration_id: z.string().optional(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate form data against a form template
 * Returns errors for fields that don't match their question type
 */
export function validateFormData(
  formData: Record<string, unknown>,
  template: z.infer<typeof formTemplateSchema>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const question of template.questions) {
    const value = formData[question.id];

    // Check required fields
    if (question.required && (value === undefined || value === null || value === '')) {
      errors[question.id] = `${question.label} is required`;
      continue;
    }

    // Skip validation if field is optional and empty
    if (!value) continue;

    // Type-specific validation
    switch (question.type) {
      case 'email':
        if (typeof value !== 'string' || !emailSchema.safeParse(value).success) {
          errors[question.id] = 'Invalid email format';
        }
        break;

      case 'phone':
        if (typeof value !== 'string' || !phoneSchema.safeParse(value).success) {
          errors[question.id] = 'Phone must be 10 digits starting with 6-9';
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors[question.id] = 'Must be a valid number';
        } else {
          const num = Number(value);
          if (question.validation?.min !== undefined && num < question.validation.min) {
            errors[question.id] = `Must be at least ${question.validation.min}`;
          }
          if (question.validation?.max !== undefined && num > question.validation.max) {
            errors[question.id] = `Must be at most ${question.validation.max}`;
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors[question.id] = 'Must be text';
        } else {
          if (question.validation?.min !== undefined && value.length < question.validation.min) {
            errors[question.id] = `Must be at least ${question.validation.min} characters`;
          }
          if (question.validation?.max !== undefined && value.length > question.validation.max) {
            errors[question.id] = `Must be at most ${question.validation.max} characters`;
          }
          if (question.validation?.pattern) {
            try {
              const regex = new RegExp(question.validation.pattern);
              if (!regex.test(value)) {
                errors[question.id] = question.validation.message || 'Invalid format';
              }
            } catch {
              // Invalid regex in template
            }
          }
        }
        break;

      case 'date':
        if (typeof value !== 'string' || !dateSchema.safeParse(value).success) {
          errors[question.id] = 'Invalid date format';
        }
        break;

      case 'select':
      case 'radio':
        if (!question.options || !question.options.includes(String(value))) {
          errors[question.id] = 'Invalid selection';
        }
        break;

      case 'checkbox':
        if (!Array.isArray(value)) {
          errors[question.id] = 'Must be an array of selections';
        } else if (question.options) {
          const invalidOptions = value.filter((v) => !question.options!.includes(String(v)));
          if (invalidOptions.length > 0) {
            errors[question.id] = 'Invalid selections';
          }
        }
        break;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type FormTemplate = z.infer<typeof formTemplateSchema>;
export type EventData = z.infer<typeof eventSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type TicketData = z.infer<typeof ticketSchema>;
export type CheckInData = z.infer<typeof checkInSchema>;
export type EmailRequest = z.infer<typeof emailRequestSchema>;
