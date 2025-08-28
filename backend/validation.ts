import { z } from 'zod';

// Define the Event interface that matches our application data structure
export interface Event {
  id: string;
  title: string;
  category: 'natural_disaster' | 'political' | 'health' | 'other';
  latitude: number;
  longitude: number;
  /**
   * ISO 8601 datetime string (e.g., "2023-08-27T10:00:00.000Z")
   */
  timestamp: number;
}

// Define the Event schema using Zod for validation
export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['natural_disaster', 'political', 'health', 'other']),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number()
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
