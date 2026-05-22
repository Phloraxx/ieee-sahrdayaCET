import { z } from 'zod';

// Edit registration schema
export const editRegistrationSchema = z.object({
  form_data: z.record(z.string(), z.unknown()).optional(),
});

// Type exports
export type EditRegistrationData = z.infer<typeof editRegistrationSchema>;
