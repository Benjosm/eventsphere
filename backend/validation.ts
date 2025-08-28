import { z } from 'zod';

// Define the Event schema using Zod
const EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown())
}).strict();

export function validateEvent(event: unknown) {
  try {
    return EventSchema.parse(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation failed:', error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', '));
    } else {
      console.error('Unexpected validation error:', error);
    }
    throw error;
  }
}

export { EventSchema };
