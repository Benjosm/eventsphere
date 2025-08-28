/// <reference lib="dom" />
import Dexie from 'dexie';
import localForage from 'localforage';
import { EventSchema } from '../backend/validation';
import { encryptEvent, decryptEvent, EncryptedEventData } from './utils/encryption';

/**
 * The category of the event.
 */
export type EventCategory = 'natural_disaster' | 'political' | 'health' | 'other';

/**
 * Represents a user-created event in the application.
 */
export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  timestamp: number;
}

class EventsDatabase extends Dexie {
  public events: Dexie.Table<Event, string>;

  constructor() {
    super('EventStore');
    this.version(1).stores({
      events: 'id,timestamp,latitude,longitude'
    });
    this.version(2).stores({
      events: 'id,timestamp,latitude,longitude,encryptedData,iv'
    }).upgrade(async trans => {
      // Get the current instance of EventsDatabase to access the encryption key
      const existingInstance = EventStore.getInstance();
      
      // Get encryption key
      const key = await existingInstance.getEncryptionKey();
      
      // Retrieve all existing events from the old schema
      const oldEvents = await trans.table('events').toArray();
      
      // Clear the existing data
      await trans.table('events').clear();
      
      // Encrypt each event and store in the new format
      for (const oldEvent of oldEvents) {
        // Create a complete Event object with inferred default values where needed
        const completeEvent: Event = {
          id: oldEvent.id,
          title: oldEvent.title || 'Migrated Event',
          category: oldEvent.category || 'other',
          latitude: oldEvent.latitude,
          longitude: oldEvent.longitude,
          timestamp: oldEvent.timestamp || Date.now()
        };
        
        try {
          EventSchema.parse(completeEvent);
        } catch (e) {
          console.warn(`Skipping event ${oldEvent.id} during migration: invalid data`, e);
          continue;
        }
        
        // Extract non-sensitive fields for indexing
        const { id, timestamp, latitude, longitude } = completeEvent;
        
        // Encrypt only sensitive fields
        const encrypted = await encryptEvent(
          { title: completeEvent.title, category: completeEvent.category },
          key
        );
        
        // Store with both unencrypted indexing fields and encrypted data
        await trans.table('events').add({
          id,
          timestamp,
          latitude,
          longitude,
          encryptedData: encrypted.data,
          iv: encrypted.iv
        });
      }
    });
    this.events = this.table('events');
  }
}

export class EventStore {
  private db: EventsDatabase;
  private static instance: EventStore;
  private encryptionKey: CryptoKey | null = null;

  private constructor() {
    if (!window.indexedDB) {
      console.warn('IndexedDB is not supported in this browser. Running in degraded (in-memory) mode.');
      this.db = new EventsDatabase();
      // Will use in-memory store as fallback
      return;
    }
  
    this.db = new EventsDatabase();
    localForage.setDriver(localForage.INDEXEDDB);
  
    // Attempt to open the database to detect runtime errors (e.g., private mode)
    this.db.on('error', (error) => {
      console.warn('EventStore initialization error:', error);
      if (error.name === 'OpenFailed' || error.message.includes('blocked') || error.message.includes('version')) {
        console.warn('Falling back to in-memory mode due to initialization failure.');
      }
    });
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;
    
    try {
      const storedKey = await localForage.getItem('event_encryption_key');
      if (storedKey) {
        this.encryptionKey = await crypto.subtle.importKey(
          'jwk',
          storedKey,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
        return this.encryptionKey;
      }
    } catch (error) {
      console.warn('Failed to retrieve encryption key, generating new one', error);
    }

    this.encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('jwk', this.encryptionKey);
    await localForage.setItem('event_encryption_key', exportedKey);
    return this.encryptionKey;
  }

  public static getInstance(): EventStore {
    if (!EventStore.instance) {
      EventStore.instance = new EventStore();
    }
    return EventStore.instance;
  }

  private async reinitialize(): Promise<void> {
    this.db.close();
    await this.db.delete();
    this.db = new EventsDatabase();
    await this.db.open();
  }

  private isCorruptionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'InvalidStateError' ||
      error.name === 'VersionError'
    );
  }

  async append(event: Event): Promise<void> {
    EventSchema.parse(event);
    try {
      const key = await this.getEncryptionKey();
      
      // Separate sensitive and non-sensitive fields
      const { title, category } = event;
      const nonSensitive = {
        id: event.id,
        timestamp: event.timestamp,
        latitude: event.latitude,
        longitude: event.longitude
      };
      
      // Encrypt only sensitive fields
      const encrypted = await encryptEvent({ title, category }, key);
      
      // Store with both unencrypted indexing fields and encrypted data
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.add({
          ...nonSensitive,
          encryptedData: encrypted.data,
          iv: encrypted.iv
        });
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.append(event);
      }
      console.error('Failed to append event:', error);
      throw new Error(`EventStore.append() failed: ${(error as Error).message}`);
    }
  }

  async read(streamId: string): Promise<Event | undefined> {
    try {
      const key = await this.getEncryptionKey();
      const record = await this.db.transaction('r', this.db.events, async () => {
        return await this.db.events.get(streamId);
      });
      
      if (!record || !record.encryptedData || !record.iv) return undefined;
      
      // Decrypt sensitive fields
      const sensitiveData = await decryptEvent({
        data: record.encryptedData,
        iv: record.iv
      }, key);
      
      // Reconstruct full event with unencrypted and decrypted fields
      return {
        id: record.id,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        title: sensitiveData.title,
        category: sensitiveData.category
      };
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.read(streamId);
      }
      console.error('Failed to read event:', error);
      throw new Error(`EventStore.read() failed: ${(error as Error).message}`);
    }
  }

  // Observer pattern for real-time updates
  private subscribers: Array<(event: Event) => void> = [];
  
  /**
   * Subscribe to new events being created
   * @param callback - Function to call with each new event
   * @returns Function to unsubscribe
   */
  subscribe(callback: (event: Event) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  /**
   * Notify all subscribers of a new event
   * @param event - The created event
   */
  private notifySubscribers(event: Event): void {
    this.subscribers.forEach(sub => {
      try {
        sub(event);
      } catch (error) {
        console.error('EventStore subscriber error:', error);
      }
    });
  }
  
  // Create a new method for creating events with validation
  async create(event: Event): Promise<void> {
    try {
      // Validate the event data
      EventSchema.parse(event);
      
      const key = await this.getEncryptionKey();
      
      // Separate sensitive and non-sensitive fields
      const { title, category } = event;
      const nonSensitive = {
        id: event.id,
        timestamp: event.timestamp,
        latitude: event.latitude,
        longitude: event.longitude
      };
      
      // Encrypt only sensitive fields
      const encrypted = await encryptEvent({ title, category }, key);
      
      // Store with both unencrypted indexing fields and encrypted data
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.add({
          ...nonSensitive,
          encryptedData: encrypted.data,
          iv: encrypted.iv
        });
      });
  
      // Notify subscribers after successful creation
      this.notifySubscribers(event);
    } catch (error) {
      // Re-throw validation errors as is
      if (error instanceof Error && error.name === 'ZodError') {
        throw error;
      }
      
      // Handle database corruption
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.create(event);
      }
      
      console.error('Failed to create event:', error);
      throw new Error(`EventStore.create() failed: ${(error as Error).message}`);
    }
  }

  async update(streamId: string, updates: Partial<Event>): Promise<void> {
    try {
      // Get current event from database
      const record = await this.db.transaction('r', this.db.events, async () => {
        return await this.db.events.get(streamId);
      });
      
      if (!record || !record.encryptedData || !record.iv) {
        throw new Error(`Event with id ${streamId} not found`);
      }
      
      // Decrypt current sensitive fields
      const key = await this.getEncryptionKey();
      const sensitiveData = await decryptEvent({
        data: record.encryptedData,
        iv: record.iv
      }, key);
      
      // Build current event with unencrypted fields
      const currentEvent: Event = {
        id: record.id,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        title: sensitiveData.title,
        category: sensitiveData.category
      };
      
      // Apply updates to create the new event
      const updatedEvent: Event = {
        ...currentEvent,
        ...updates
      };
      
      // Validate the updated event
      EventSchema.parse(updatedEvent);
      
      // Encrypt updated sensitive fields
      const { title, category } = updatedEvent;
      const nonSensitive = {
        id: updatedEvent.id,
        timestamp: updatedEvent.timestamp,
        latitude: updatedEvent.latitude,
        longitude: updatedEvent.longitude
      };
      const encrypted = await encryptEvent({ title, category }, key);
      
      // Update both unencrypted and encrypted data
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.put({
          ...nonSensitive,
          encryptedData: encrypted.data,
          iv: encrypted.iv
        });
      });
    } catch (error) {
      // Re-throw validation errors as is
      if (error instanceof Error && error.name === 'ZodError') {
        throw error;
      }
      
      // Handle database corruption
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.update(streamId, updates);
      }
      
      console.error('Failed to update event:', error);
      throw new Error(`EventStore.update() failed: ${(error as Error).message}`);
    }
  }

  async delete(streamId: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.delete(streamId);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.delete(streamId);
      }
      console.error('Failed to delete event:', error);
      throw new Error(`EventStore.delete() failed: ${(error as Error).message}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.clear();
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.clear();
      }
      console.error('Failed to clear events:', error);
      throw new Error(`EventStore.clear() failed: ${(error as Error).message}`);
    }
  }

  async list(): Promise<Event[]> {
    try {
      const key = await this.getEncryptionKey();
      
      // Use indexed sorting by timestamp (newest first)
      const records = await this.db.transaction('r', this.db.events, async () => {
        return await this.db.events.orderBy('timestamp').reverse().toArray();
      });
      
      const events: Event[] = [];
      for (const record of records) {
        if (record.encryptedData && record.iv) {
          try {
            // Decrypt sensitive fields
            const sensitiveData = await decryptEvent({
              data: record.encryptedData,
              iv: record.iv
            }, key);
            
            // Reconstruct full event
            events.push({
              id: record.id,
              timestamp: record.timestamp,
              latitude: record.latitude,
              longitude: record.longitude,
              title: sensitiveData.title,
              category: sensitiveData.category
            });
          } catch (error) {
            console.error('Failed to decrypt event', record.id, error);
            // Skip corrupted/undecryptable events
            continue;
          }
        }
      }
      
      return events;
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.list();
      }
      console.error('Failed to list events:', error);
      throw new Error(`EventStore.list() failed: ${(error as Error).message}`);
    }
  }

  async search(category?: EventCategory, query?: string): Promise<Event[]> {
    try {
      let allEvents = await this.list();
      
      // Filter by category if specified
      if (category) {
        allEvents = allEvents.filter(event => event.category === category);
      }
      
      // Filter by search query if specified
      if (query && query.trim()) {
        const searchTerm = query.trim().toLowerCase();
        allEvents = allEvents.filter(event =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.category.toLowerCase().includes(searchTerm)
        );
      }
      
      return allEvents;
    } catch (error) {
      console.error('Failed to search events:', error);
      throw new Error(`EventStore.search() failed: ${(error as Error).message}`);
    }
  }

  async createMany(events: Event[]): Promise<void> {
    if (!events.length) return;
    
    try {
      const key = await this.getEncryptionKey();
      
      await this.db.transaction('rw', this.db.events, async () => {
        for (const event of events) {
          EventSchema.parse(event);
          
          // Separate sensitive and non-sensitive fields
          const { title, category } = event;
          const nonSensitive = {
            id: event.id,
            timestamp: event.timestamp,
            latitude: event.latitude,
            longitude: event.longitude
          };
          
          // Encrypt only sensitive fields
          const encrypted = await encryptEvent({ title, category }, key);
          
          // Store with both unencrypted indexing fields and encrypted data
          await this.db.events.add({
            ...nonSensitive,
            encryptedData: encrypted.data,
            iv: encrypted.iv
          });
        }
      });
    } catch (error) {
      // Re-throw validation errors as is
      if (error instanceof Error && error.name === 'ZodError') {
        throw error;
      }
      
      // Handle database corruption
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.createMany(events);
      }
      
      console.error('Failed to create multiple events:', error);
      throw new Error(`EventStore.createMany() failed: ${(error as Error).message}`);
    }
  }
}
