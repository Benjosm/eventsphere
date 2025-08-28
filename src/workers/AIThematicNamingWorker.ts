/**
 * AIThematicNamingWorker.ts
 * 
 * Web Worker for AI-generated thematic naming of clusters.
 * Contains mathematical functions for similarity calculations between cluster centroids and thematic labels.
 */

/**
 * Calculates the cosine similarity between two vectors.
 * Cosine similarity measures the cosine of the angle between two non-zero vectors in an inner product space.
 * It is a measure of similarity between two vectors of an inner product space that measures the cosine of the angle between them.
 * The cosine of 0° is 1, and it is less than 1 for any angle in the interval (0, π] radians.
 * It is thus a judgment of orientation and not magnitude: two vectors with the same orientation have a cosine similarity of 1,
 * two vectors at 90° have a similarity of 0, and two vectors diametrically opposed having a similarity of -1.
 * 
 * @param vectorA - First vector as an array of numbers
 * @param vectorB - Second vector as an array of numbers
 * @returns The cosine similarity between the two vectors (value between -1 and 1)
 */
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match. Got lengths ${vectorA.length} and ${vectorB.length}`);
  }

  if (vectorA.length === 0) {
    throw new Error('Vectors must have at least one element');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  const productOfMagnitudes = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  // If either vector is a zero vector, similarity is defined as 0
  if (productOfMagnitudes === 0) {
    return 0;
  }

  return dotProduct / productOfMagnitudes;
}

/**
 * Represents a thematic label for cluster naming.
 */
interface ThematicLabel {
  /**
   * The human-readable label name.
   */
  label: string;
  
  /**
   * The vector representation of the thematic label.
   */
  vector: number[];
}

/**
 * Assigns thematic names to clusters by comparing centroids to predefined thematic labels using cosine similarity.
 * For each cluster centroid, the function calculates the cosine similarity with each thematic label vector
 * and assigns the label with the highest similarity score.
 * 
 * @param centroids - Array of cluster centroids, each as a number[] vector
 * @param thematicLabels - Array of thematic labels, each containing a label string and vector
 * @returns Array of thematic label strings matching the order of input clusters
 * @throws Error if centroids or thematicLabels arrays are empty, or if vector dimensions don't match
 */
function assignThematicNames(centroids: number[][], thematicLabels: ThematicLabel[]): string[] {
  if (centroids.length === 0) {
    throw new Error('Centroids array cannot be empty');
  }

  if (thematicLabels.length === 0) {
    throw new Error('Thematic labels array cannot be empty');
  }

  // Validate that all centroids have the same dimensionality as the first thematic label vector
  const expectedDimension = thematicLabels[0].vector.length;
  for (const centroid of centroids) {
    if (centroid.length !== expectedDimension) {
      throw new Error(`Centroid vector dimension ${centroid.length} does not match expected dimension ${expectedDimension}`);
    }
  }

  // Validate that all thematic label vectors have the same dimensionality
  for (const label of thematicLabels) {
    if (label.vector.length !== expectedDimension) {
      throw new Error(`Thematic label vector dimension ${label.vector.length} does not match expected dimension ${expectedDimension}`);
    }
  }

  // For each centroid, find the thematic label with the highest cosine similarity
  const assignedLabels: string[] = [];
  
  for (const centroid of centroids) {
    let bestSimilarity = -1;
    let bestLabel = thematicLabels[0].label;
    
    for (const label of thematicLabels) {
      const similarity = calculateCosineSimilarity(centroid, label.vector);
      
      // Update best match if this label has higher similarity
      // Use >= to get the first label in case of ties
      if (similarity >= bestSimilarity) {
        bestSimilarity = similarity;
        bestLabel = label.label;
      }
    }
    
    assignedLabels.push(bestLabel);
  }
  
  return assignedLabels;
}

// Export all functions for use in the worker
export { calculateCosineSimilarity, assignThematicNames };
export type { ThematicLabel };

/**
 * Represents the result of a spatial cluster.
 */
export interface ClusterResult {
  clusterId: string;
  label: string;
  coordinates: { latitude: number; longitude: number }[];
  center: { latitude: number; longitude: number };
}

/**
 * Message data structure expected by the worker.
 */
interface ClusteringMessageData {
  centroids: number[][];
  centers: { latitude: number; longitude: number }[];
}

// Predefined thematic labels with vector representations
// In a real implementation, these would be loaded from a model
const THEMATIC_LABELS: ThematicLabel[] = [
  { label: "Political Unrest", vector: [0.9, 0.2, 0.1, 0.05, 0.8] },
  { label: "Natural Disaster", vector: [0.1, 0.9, 0.2, 0.8, 0.1] },
  { label: "Public Health Crisis", vector: [0.2, 0.3, 0.9, 0.7, 0.2] },
  { label: "Economic Event", vector: [0.8, 0.1, 0.1, 0.1, 0.7] },
  { label: "Cultural Festival", vector: [0.4, 0.2, 0.3, 0.1, 0.1] },
  { label: "Technological Advancement", vector: [0.3, 0.4, 0.2, 0.2, 0.6] }
];

// Handle messaging based on execution environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Node.js environment - use worker_threads with dynamic import for ESM
  (async () => {
    try {
      const { parentPort } = await import('worker_threads');
      
      // Add diagnostic logging for debugging
      console.log('Node.js environment detected');
      console.log('parentPort exists:', parentPort !== null && parentPort !== undefined);
      
      if (parentPort) {
        parentPort.on('message', (data: ClusteringMessageData) => {
          const { centroids, centers } = data;
          
          // Log when message is received
          console.log('Message received in worker, centroids count:', centroids.length);

          try {
            // Generate AI thematic names for each cluster
            const labels = assignThematicNames(centroids, THEMATIC_LABELS);

            // Create final cluster results with AI-generated labels
            const results: ClusterResult[] = centroids.map((_, index) => ({
              clusterId: `cluster-${index}`,
              label: labels[index],
              coordinates: [], // Populated in higher-level logic
              center: centers[index]
            }));

            // Send results back to the main thread
            parentPort.postMessage(results);
          } catch (error) {
            parentPort.postMessage({ error: error instanceof Error ? error.message : 'Unknown error' });
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize worker in Node.js environment:', error);
    }
  })();
} else {
  // Browser environment
  self.onmessage = function(event: MessageEvent<ClusteringMessageData>) {
    const { centroids, centers } = event.data;

    try {
      // Generate AI thematic names for each cluster
      const labels = assignThematicNames(centroids, THEMATIC_LABELS);

      // Create final cluster results with AI-generated labels
      const results: ClusterResult[] = centroids.map((_, index) => ({
        clusterId: `cluster-${index}`,
        label: labels[index],
        coordinates: [], // Populated in higher-level logic
        center: centers[index]
      }));

      // Send results back to the main thread
      postMessage(results);
    } catch (error) {
      postMessage({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}
