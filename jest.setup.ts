import indexedDB from 'fake-indexeddb';

// Ensure we're in a Node.js environment
if (typeof window === 'undefined') {
  // Set up fake IndexedDB for Node.js environment
  global.window = {
    indexedDB: indexedDB,
    IDBKeyRange: (indexedDB as any).IDBKeyRange
  } as any;
  
  // Also set global scope for older libraries
  global.indexedDB = indexedDB;
  global.IDBKeyRange = (indexedDB as any).IDBKeyRange;
}
