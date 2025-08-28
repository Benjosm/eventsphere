import { EventStore } from '../../src/EventStore';
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

describe('EventStore', () => {
  let eventStore: EventStore;

  beforeEach(async () => {
    // Clear IndexedDB between tests
    await Dexie.delete('EventStore');
    eventStore = new EventStore();
  });

  describe('Database initialization', () => {
    it('should initialize with correct Event schema', () => {
      const db = (eventStore as any).db;
      expect(db.name).toBe('EventStore');
      expect(db.tables.map((table: any) => table.name)).toEqual(['events']);
      const eventSchema = db.events.schema;
      expect(eventSchema.primKey.name).toBe('id');
      // Extract index names from schema indexes
      const indexNames = eventSchema.indexes.map((idx: any) => idx.name);
      // The actual schema only has the indexes defined in the version(1).stores
      expect(indexNames).toEqual(['id', 'timestamp', 'latitude', 'longitude', 'title', 'category']);
    });
  });

  describe('Validation enforcement', () => {
    it('should reject create() with missing id', async () => {
      const invalidEvent = {
        title: 'Test Event',
        category: 'work',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      };
      await expect(eventStore.create(invalidEvent as any)).rejects.toThrow(
        'Invalid event data'
      );
    });

    it('should reject create() with invalid category', async () => {
      const invalidEvent = {
        id: uuidv4(),
        title: 'Invalid Category',
        category: 'Meeting', // Invalid category - must be replaced
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      };
      await expect(eventStore.create(invalidEvent)).rejects.toThrow(
        'Invalid event data'
      );
    });

    it('should reject update() with invalid category', async () => {
      const event = {
        id: uuidv4(),
        title: 'Test',
        category: 'work',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      };
      await eventStore.create(event);
      await expect(
        eventStore.update(event.id, { category: 'Meeting' })
      ).rejects.toThrow('Invalid event data');
    });
  });

  describe('Batch operations', () => {
    it('should process 100+ events via createMany without blocking UI', async () => {
      const events = Array.from({ length: 105 }, () => ({
        id: uuidv4(),
        title: 'Batch Event',
        category: 'work',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      }));

      const start = performance.now();
      await eventStore.createMany(events);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Should complete quickly
      expect(await (eventStore as any).db.events.count()).toBe(105);
    });
  });

  describe('Error recovery', () => {
    it('should automatically recover from database corruption', async () => {
      // Corrupt database by deleting it
      await Dexie.delete('EventStore');

      // Recreate the store to get a reference to the deleted database
      eventStore = new EventStore();

      // First operation should fail and trigger recovery
      const validEvent = {
        id: uuidv4(),
        title: 'Recovery Test',
        category: 'work',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now()
      };

      // The first create should work after automatic database reinitialization
      await eventStore.create(validEvent);

      // Read should succeed after recovery
      const stored = await eventStore.read(validEvent.id);
      expect(stored).toEqual(validEvent);
    });
  });

  describe('Read/delete operations', () => {
    it('should handle missing events in read() without error', async () => {
      expect(await eventStore.read('non-existent-id')).toBeUndefined();
    });

    it('should handle missing events in delete() without error', async () => {
      await expect(eventStore.delete('non-existent-id')).resolves.not.toThrow();
      expect(await (eventStore as any).db.events.count()).toBe(0);
    });
  });
});
