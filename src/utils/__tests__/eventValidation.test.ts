import { validateAugmentedEvent } from '../eventValidation';

describe('Event Validation', () => {
  const createBaseEvent = (vector: number[]) => ({
    id: 'event-123',
    title: 'Test Event',
    category: 'health' as const,
    latitude: 37.7749,
    longitude: -122.4194,
    timestamp: Date.now(),
    vector,
  });

  it('validates event with correct 128-dimensional vector', () => {
    const validEvent = createBaseEvent(Array(128).fill(0));
    expect(() => validateAugmentedEvent(validEvent)).not.toThrow();
  });

  it('rejects event with 127-dimensional vector', () => {
    const invalidEvent = createBaseEvent(Array(127).fill(0));
    expect(() => validateAugmentedEvent(invalidEvent)).toThrow(
      'Invalid event data for clustering: vector: Array must contain exactly 128 element(s)'
    );
  });

  it('rejects event with 129-dimensional vector', () => {
    const invalidEvent = createBaseEvent(Array(129).fill(0));
    expect(() => validateAugmentedEvent(invalidEvent)).toThrow(
      'Invalid event data for clustering: vector: Array must contain exactly 128 element(s)'
    );
  });

  it('accepts event with all augmentation fields', () => {
    const fullEvent = {
      ...createBaseEvent(Array(128).fill(0)),
      confidenceScore: 0.95,
      sourceReliability: 0.8,
      clusterId: 'cluster-1',
      region: 'North America',
      analysisMetadata: { source: 'satellite' }
    };
    expect(() => validateAugmentedEvent(fullEvent)).not.toThrow();
  });

  it('validates minimal augmentation fields', () => {
    const minimalEvent = {
      ...createBaseEvent(Array(128).fill(0)),
      confidenceScore: undefined
    };
    expect(() => validateAugmentedEvent(minimalEvent)).not.toThrow();
  });
});
