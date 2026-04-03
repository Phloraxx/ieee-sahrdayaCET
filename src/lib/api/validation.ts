import { z } from 'zod';

// Registration form data validation
export const registrationFormSchema = z.object({
  form_data: z.record(z.string(), z.unknown()).optional().default({}),
});

// Event ID validation
export const eventIdSchema = z.string().min(1, 'Event ID is required');

// Registration ID validation
export const registrationIdSchema = z.string().min(1, 'Registration ID is required');

// Edit registration schema
export const editRegistrationSchema = z.object({
  form_data: z.record(z.string(), z.unknown()).optional(),
});

// Form template question schema
export const formQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'select', 'radio', 'checkbox', 'textarea', 'number', 'date']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
});

export const formTemplateSchema = z.object({
  questions: z.array(formQuestionSchema),
  version: z.string().default('1.0'),
});

// Type exports
export type RegistrationFormData = z.infer<typeof registrationFormSchema>;
export type EditRegistrationData = z.infer<typeof editRegistrationSchema>;
export type FormQuestion = z.infer<typeof formQuestionSchema>;
export type FormTemplate = z.infer<typeof formTemplateSchema>;
