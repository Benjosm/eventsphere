/// <reference lib="dom" />
import { EventStore, Event } from './EventStore';

async function testEncryption(): Promise<void> {
  const store = EventStore.getInstance();
  const testEvent: Event = {
    id: 'test-123',
    title: 'Test Earthquake',
    category: 'natural_disaster',
    latitude: 34.0522,
    longitude: -118.2437,
    timestamp: Date.now(),
  };

  console.log('Testing CRUD with encryption...');

  try {
    // CREATE
    await store.append(testEvent);
    console.log('✅ Event created successfully (encrypted)');

    // READ
    const readEvent = await store.read(testEvent.id);
    if (readEvent && readEvent.id === testEvent.id) {
      console.log('✅ Event read successfully (decrypted)');
    } else {
      throw new Error('Read event mismatch');
    }

    // UPDATE
    await store.update(testEvent.id, { title: 'Updated Earthquake' });
    const updatedEvent = await store.read(testEvent.id);
    if (updatedEvent?.title === 'Updated Earthquake') {
      console.log('✅ Event updated successfully');
    } else {
      throw new Error('Update failed');
    }

    // Test decryption error by corrupting IV
    console.log('Testing decryption error handling...');
    const db = (store as any).db;
    const record = await db.events.get(testEvent.id);
    const originalIV = record.iv;
    
    // Corrupt the IV slightly
    const corruptedIV = new Uint8Array(originalIV);
    corruptedIV[0] = ~corruptedIV[0] & 0xFF;
    
    await db.events.put({
      id: record.id,
      encryptedData: record.encryptedData,
      iv: corruptedIV.buffer
    });

    try {
      await store.read(testEvent.id);
      throw new Error('Expected decryption failure due to IV tampering');
    } catch (error: any) {
      if (error.message.includes('authentication failure')) {
        console.log('✅ Decryption error correctly caught:', error.message);
      } else {
        throw error;
      }
    }

    // Restore correct IV
    await db.events.put({
      id: record.id,
      encryptedData: record.encryptedData,
      iv: originalIV
    });
    const restoredEvent = await store.read(testEvent.id);
    if (restoredEvent?.title === 'Updated Earthquake') {
      console.log('✅ Event restored and decrypted correctly');
    }

    // Verify stored data is encrypted
    const storedRecord = await db.events.get(testEvent.id);
    if (storedRecord && storedRecord.encryptedData instanceof ArrayBuffer && storedRecord.iv) {
      console.log('✅ Stored data is encrypted (raw ArrayBuffer)');
    } else {
      throw new Error('Stored data is not encrypted');
    }

    // DELETE
    await store.delete(testEvent.id);
    const deletedEvent = await store.read(testEvent.id);
    if (!deletedEvent) {
      console.log('✅ Event deleted successfully');
    } else {
      throw new Error('Delete failed');
    }

    console.log('🎉 All encryption tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testEncryption().catch(console.error);
