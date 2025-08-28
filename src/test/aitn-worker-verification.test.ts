import { Worker } from 'worker_threads';
import { calculateCosineSimilarity } from '../workers/AIThematicNamingWorker';

// Define the structure for centroid data
interface CentroidData {
  centroid: number[];
  center: { latitude: number; longitude: number };
}

// Define the structure for cluster results
interface ClusterResult {
  clusterId: string;
  label: string;
  coordinates: { latitude: number; longitude: number }[];
  center: { latitude: number; longitude: number };
}

// Function to create a realistic test centroid vector using multi-dimensional normal noise
function createTestCentroid(seed: number): number[] {
  const vector = new Array(5); // Using 5 dimensions to match thematic label vectors
  // Use a simple hash of the seed to get different, but consistent, pseudo-random values
  let r = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < 5; i++) {
    r = (r * 9301 + 49297) % 233280;
    vector[i] = (r / 233280.0) * 2 - 1; // Values between -1 and 1
  }
  return vector;
}

// Create 1000 test centroids
const testCentroids: CentroidData[] = Array.from({ length: 1000 }, (_, i) => ({
  centroid: createTestCentroid(i + 1),
  center: {
    latitude: (Math.random() - 0.5) * 180,
    longitude: (Math.random() - 0.5) * 360
  }
}));

// Extract centroids and centers for worker input
const centroids = testCentroids.map(c => c.centroid);
const centers = testCentroids.map(c => c.center);

// Map thematic labels to their vectors (must match those in AIThematicNamingWorker.ts)
const thematicLabels = [
  { label: "Political Unrest", vector: [0.9, 0.2, 0.1, 0.05, 0.8] },
  { label: "Natural Disaster", vector: [0.1, 0.9, 0.2, 0.8, 0.1] },
  { label: "Public Health Crisis", vector: [0.2, 0.3, 0.9, 0.7, 0.2] },
  { label: "Economic Event", vector: [0.8, 0.1, 0.1, 0.1, 0.7] },
  { label: "Cultural Festival", vector: [0.4, 0.2, 0.3, 0.1, 0.1] },
  { label: "Technological Advancement", vector: [0.3, 0.4, 0.2, 0.2, 0.6] }
];

console.log('Starting AI Thematic Naming Worker verification test with 1000 centroids...');

// Create a new Web Worker from the AIThematicNamingWorker.ts file
const worker = new Worker(new URL('./workers/AIThematicNamingWorker.ts', import.meta.url));

// Variables for performance measurement
let startTime: number;

// Listen for messages from the worker
worker.onmessage = (event) => {
  const results: ClusterResult[] = event.data;

  // Check for error response
  if (results && (results as any).error) {
    console.error('Worker error:', (results as any).error);
    worker.terminate();
    return;
  }

  // Measure execution time
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`\nThematic naming completed in ${duration.toFixed(2)} ms.`);

  // Verify performance threshold (<100ms)
  if (duration < 100) {
    console.log('SUCCESS: Performance threshold met (<100ms).');
  } else {
    console.error(`FAILURE: Performance threshold exceeded. Duration: ${duration.toFixed(2)} ms.`);
  }

  // Verify output is an array
  if (!Array.isArray(results)) {
    console.error('FAILURE: Output is not an array.');
    worker.terminate();
    return;
  }

  console.log(`SUCCESS: Output is an array of ${results.length} clusters.`);

  // Validate all labels are populated
  const allLabelsPopulated = results.every(cluster => 
    cluster.label && typeof cluster.label === 'string' && cluster.label.length > 0
  );

  if (allLabelsPopulated) {
    console.log('SUCCESS: All cluster labels are populated with non-empty strings.');
  } else {
    console.error('FAILURE: One or more cluster labels are missing or empty.');
  }

  // Verify cosine similarity > 0.8 for each cluster
  console.log('\n--- Validating Cosine Similarity Threshold ---');
  let similarityThresholdMet = true;
  let failedClusters = 0;

  results.forEach((cluster, index) => {
    // Find the corresponding input centroid
    const inputCentroid = testCentroids[index].centroid;
    
    // Find the thematic label vector that matches the assigned label
    const matchedLabel = thematicLabels.find(label => label.label === cluster.label);
    
    if (!matchedLabel) {
      console.error(`FAILURE: Assigned label "${cluster.label}" not found in thematic labels.`);
      similarityThresholdMet = false;
      failedClusters++;
      return;
    }
    
    // Calculate cosine similarity between centroid and label vector
    const similarity = calculateCosineSimilarity(inputCentroid, matchedLabel.vector);
    
    // Verify similarity exceeds 0.8 threshold
    if (similarity <= 0.8) {
      console.error(`FAILURE: Cluster ${index} similarity too low: ${similarity.toFixed(4)} (threshold: 0.8)`);
      similarityThresholdMet = false;
      failedClusters++;
    }
  });

  if (similarityThresholdMet) {
    console.log(`SUCCESS: All ${results.length} clusters have cosine similarity > 0.8 with their assigned labels.`);
  } else {
    console.error(`FAILURE: ${failedClusters} clusters have cosine similarity <= 0.8 with their assigned labels.`);
  }

  // Final summary
  console.log('\n--- Test Summary ---');
  console.log(`Performance threshold met: ${duration < 100 ? 'YES' : 'NO'}`);
  console.log(`All labels populated: ${allLabelsPopulated ? 'YES' : 'NO'}`);
  console.log(`All similarity thresholds met: ${similarityThresholdMet ? 'YES' : 'NO'}`);

  if (duration < 100 && allLabelsPopulated && similarityThresholdMet) {
    console.log('VERIFICATION SUCCESS: All acceptance criteria have been met.');
  } else {
    console.log('VERIFICATION FAILED: One or more acceptance criteria were not met.');
  }

  // Close the worker
  worker.terminate();
};

worker.onerror = (error) => {
  console.error('Web Worker execution failed:', error.message);
  worker.terminate();
};

// Start timing and send data to worker
startTime = performance.now();
worker.postMessage({ centroids, centers });

export {}; // To make the file a module
