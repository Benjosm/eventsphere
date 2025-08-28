/**
 * Represents an event with its base data plus any additional computed or injected metadata.
 * This interface is used to pass enriched event data into the clustering algorithm.
 */
export interface AugmentedEvent extends Event {
  /** Additional confidence score for the event */
  confidenceScore?: number;
  /** Reliability score of the data source */
  sourceReliability?: number;
  /** ID of the cluster the event belongs to */
  clusterId?: string;
  /** Geographical region name */
  region?: string;
  /** Dynamic metadata storage */
  analysisMetadata?: Record<string, any>;
  /** 128-dimensional vector for clustering algorithm */
  vector: number[];
}

/**
 * The category of the event.
 * (Duplicated from EventStore.ts for type consistency in one file)
 */
export type EventCategory = 'natural_disaster' | 'political' | 'health' | 'other';

/**
 * Represents a user-created event in the application.
 * (Duplicated from EventStore.ts for type consistency in one file)
 */
export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  timestamp: number;
  clusterId?: string;
}
