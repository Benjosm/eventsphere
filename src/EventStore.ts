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

  constructor() {
    if (!window.indexedDB) {
      throw new Error('IndexedDB is not supported in this browser.');
    }

    this.db = new EventsDatabase();
    localForage.setDriver(localForage.INDEXEDDB);
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

  async create(event: Event): Promise<void> {
    EventSchema.parse(event);
    try {
      await this.db.transaction('rw', this.db.events, async () => {
        await this.db.events.add(event);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.create(event);
      }
      throw error;
    }
  }

  async createMany(events: Event[]): Promise<void> {
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
        return this.createMany(validEvents);
      }
      throw error;
    }
  }

  async read(id: string): Promise<Event | undefined> {
    try {
      return await this.db.transaction('r', this.db.events, async () => {
        return await this.db.events.get(id);
      });
    } catch (error) {
      if (this.isCorruptionError(error)) {
        await this.reinitialize();
        return this.read(id);
      }
      throw error;
    }
  }

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
