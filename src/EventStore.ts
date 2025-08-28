/// <reference lib="dom" />
import Dexie from 'dexie';
import localForage from 'localforage';
import { EventSchema } from '../backend/validation';

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
    this.events = this.table('events');
  }
}

export class EventStore {
  private db: EventsDatabase;
  private static instance: EventStore;

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
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.add(event);
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
      return await this.db.transaction('r', this.db.events, async () => {
        return await this.db.events.get(streamId);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.read(streamId);
      }
      console.error('Failed to read event:', error);
      throw new Error(`EventStore.read() failed: ${(error as Error).message}`);
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

  async appendMany(events: Event[]): Promise<void> {
    const validEvents = events.map(event => {
      EventSchema.parse(event);
      return event;
    });

    try {
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.bulkAdd(validEvents);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.appendMany(validEvents);
      }
      throw error;
    }
  }

  // Keep the old methods for backward compatibility, marked as deprecated
  /** @deprecated Use append() instead */
  async create(event: Event): Promise<void> {
    return this.append(event);
  }

  /** @deprecated Use appendMany() instead */
  async createMany(events: Event[]): Promise<void> {
    return this.appendMany(events);
  }

  /** @deprecated Use read() instead */
  async readById(id: string): Promise<Event | undefined> {
    return this.read(id);
  }

  /** @deprecated Use update() instead */
  async update(id: string, partialEvent: Partial<Event>): Promise<void> {
    try {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error('Event not found');
      }
      const updatedEvent = { ...existing, ...partialEvent };
      EventSchema.parse(updatedEvent);
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.put(updatedEvent);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.update(id, partialEvent);
      }
      throw error;
    }
  }

  /** @deprecated Use delete() instead */
  async delete(id: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.delete(id);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.delete(id);
      }
      throw error;
    }
  }
}

// Initialize the singleton instance
const eventStore = EventStore.getInstance();
export default eventStore;
