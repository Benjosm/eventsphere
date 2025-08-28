import { z } from 'zod';

// Define schemas matching the TypeScript interfaces
const EventCategorySchema = z.enum(['natural_disaster', 'political', 'health', 'other']);

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: EventCategorySchema,
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
});

// AugmentedEvent extends Event with additional fields
export const AugmentedEventSchema = EventSchema.extend({
  confidenceScore: z.number().optional(),
  sourceReliability: z.number().optional(),
  clusterId: z.string().optional(),
  region: z.string().optional(),
  analysisMetadata: z.record(z.any()).optional(),
  vector: z.array(z.number()).length(128),
});

/**
 * Validates that the input conforms to the AugmentedEvent schema.
 * Ensures all required fields exist and the vector has exactly 128 dimensions.
 * 
 * @param event - The event data to validate
 * @returns The validated AugmentedEvent object
 * @throws Error with validation details if validation fails
 */
export const validateAugmentedEvent = (event: unknown) => {
  const result = AugmentedEventSchema.safeParse(event);
  if (!result.success) {
    const errorMessages = result.error.errors.map(e => 
      `${e.path.length ? e.path.join('.') : 'root'}: ${e.message}`
    ).join('; ');
    
    console.error(`Event validation failed: ${errorMessages}`, { 
      invalidEvent: event, 
      errors: result.error 
    });
    
    throw new Error(`Invalid event data for clustering: ${errorMessages}`);
  }
  return result.data;
};
