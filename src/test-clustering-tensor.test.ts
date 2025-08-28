import { ClusterResult } from "./EventStore";
import { Worker } from 'worker_threads';

// Define the AugmentedEvent interface
interface AugmentedEvent {
  id: string;
  vector: number[];
}

// Function to create a realistic test vector using multi-dimensional normal noise
function createTestVector(seed: number): number[] {
  const vector = new Array(128);
  // Use a simple hash of the seed to get different, but consistent, pseudo-random values
  let r = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < 128; i++) {
    r = (r * 9301 + 49297) % 233280;
    vector[i] = (r / 233280.0) * 2 - 1; // Values between -1 and 1
  }
  return vector;
}

// Create 1000 test events
const testEvents: AugmentedEvent[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `event-${i + 1}`,
  vector: createTestVector(i + 1)
}));

// Function to validate a single ClusterResult object
function validateClusterResult(result: any): result is ClusterResult {
  return (
    typeof result === 'object' &&
    typeof result.clusterId === 'string' &&
    Array.isArray(result.eventIds) &&
    result.eventIds.every((id: any) => typeof id === 'string') &&
    typeof result.label === 'string' &&
    typeof result.coordinates === 'object' &&
    typeof result.coordinates.x === 'number' &&
    typeof result.coordinates.y === 'number' &&
    typeof result.coordinates.z === 'number'
  );
}

// Function to test with malformed data
function runErrorCaseTest(worker: Worker) {
  console.log('\n--- Running Error Case Test ---');
  const malformedEvents = [
    { id: 'valid-1', vector: createTestVector(1) },
    { id: 'invalid-1', vector: [1, 2] }, // Vector too short
    { id: 'invalid-2' } // Missing vector
  ];

  worker.postMessage({ events: malformedEvents });
}

// Main execution
console.log('Starting clustering verification test with 1000 events...');

// Create a new Web Worker from the clustering.worker.ts file
const worker = new Worker(new URL('./clustering.worker.ts', import.meta.url));

worker.onmessage = (event) => {
  const { type, data, error } = event.data;

  if (type === 'timing') {
    if (data.phase === 'inferenceStart') {
      console.log('ONNX model loaded, inference about to start.');
    } else if (data.phase === 'complete') {
      const duration = data.duration;
      console.log(`\nClustering completed in ${duration.toFixed(2)} ms.`);
      
      // Verify performance threshold
      if (duration < 100) {
        console.log('SUCCESS: Performance threshold met (<100ms).');
      } else {
        console.error(`FAILURE: Performance threshold exceeded. Duration: ${duration.toFixed(2)} ms.`);
      }
    }
  }

  if (type === 'result') {
    console.log('\n--- Clustering Result Validation ---');
    
    // Verify output is an array
    if (!Array.isArray(data)) {
      console.error('FAILURE: Output is not an array.');
      return;
    }
    
    console.log(`SUCCESS: Output is an array of ${data.length} clusters.`);
    
    // Validate each cluster result
    const allValid = data.every((cluster, index) => {
      if (validateClusterResult(cluster)) {
        return true;
      } else {
        console.error(`FAILURE: Cluster at index ${index} does not conform to ClusterResult interface:`, cluster);
        return false;
      }
    });

    if (allValid) {
      console.log('SUCCESS: All cluster results conform to the ClusterResult interface.');
    }

    // Cross-check for correctness (basic sanity check)
    const totalEventIds = data.reduce((sum: number, cluster: ClusterResult) => sum + cluster.eventIds.length, 0);
    if (totalEventIds === 1000) {
      console.log('SUCCESS: All 1000 input events are accounted for in the clustering output.');
    } else {
      console.error(`FAILURE: Event count mismatch. Input: 1000, Output: ${totalEventIds}.`);
    }

    // Run the error case test
    runErrorCaseTest(worker);
  }

  if (type === 'error') {
    console.log('\n--- Error Case Test Result ---');
    if (error && (error.includes('Invalid vector length') || error.includes('Missing vector'))) {
      console.log('SUCCESS: Worker handled malformed data and reported an error as expected.');
    } else {
      console.error('FAILURE: Unexpected error message:', error);
    }
    console.log('Verification test completed.');
    // Close the worker as the test is finished
    worker.terminate();
  }
};

worker.onerror = (error) => {
  console.error('Web Worker execution failed:', error.message);
  worker.terminate();
};

// Start the timing and send the data to the worker
console.log('Spawning Web Worker for clustering...');
worker.postMessage({
  type: 'process-clusters',
  data: testEvents
});

// Cleanup function for Node.js environments if needed
if (typeof process !== 'undefined') {
  // No specific cleanup needed for now
}


export {}; // To make the file a module
