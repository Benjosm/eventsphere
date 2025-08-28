/**
 * SpatialClusteringService.ts
 * 
 * A simple, synchronous, continent-based grouping mechanism that clusters geographic coordinates
 * into broad continental regions using quadrant-based division of the globe.
 * Designed as a fallback when ML clustering is unavailable or fails.
 */

// Define the structure for input coordinates
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  eventId?: string;
}

// Define the structure for cluster results
export interface ClusterResult {
  clusterId: string;
  label: string;
  coordinates: GeoCoordinate[];
  center: { latitude: number; longitude: number };
}

/**
 * Determines the continental region cluster for a given coordinate.
 * Uses hard-coded quadrant boundaries to assign regions.
 * 
 * @param coord - The geographic coordinate to classify
 * @returns Object containing clusterId and label
 */
function determineCluster(coord: GeoCoordinate): { clusterId: string; label: string } {
  const { latitude, longitude } = coord;

  // Normalize longitude to -180 to 180 range if needed
  const normalizedLon = longitude > 180 ? longitude - 360 : longitude;

  // Define broad continental regions using lat/lon bounds
  if (latitude >= 36 && latitude <= 71 && normalizedLon >= -10 && normalizedLon <= 60) {
    return { clusterId: 'EU', label: 'Europe' };
  } else if (latitude >= 10 && latitude <= 75 && normalizedLon >= 60 && normalizedLon <= 180) {
    return { clusterId: 'AS', label: 'Asia' };
  } else if (latitude >= -10 && latitude <= 45 && normalizedLon >= -80 && normalizedLon <= 30) {
    return { clusterId: 'AF', label: 'Africa' };
  } else if (latitude >= 4 && latitude <= 35 && normalizedLon >= 60 && normalizedLon <= 95) {
    return { clusterId: 'IN', label: 'Indian Subcontinent' };
  } else if (latitude >= -55 && latitude <= 15 && (normalizedLon >= -90 && normalizedLon <= -30)) {
    return { clusterId: 'SA', label: 'South America' };
  } else if (latitude >= 15 && latitude <= 70 && (normalizedLon >= -170 && normalizedLon <= -65)) {
    return { clusterId: 'NA', label: 'North America' };
  } else if (latitude >= -47 && latitude <= -10 && (normalizedLon >= 113 && normalizedLon <= 154)) {
    return { clusterId: 'OC', label: 'Oceania' };
  } else if (latitude >= 12 && latitude <= 37 && (normalizedLon >= -105 && normalizedLon <= -85)) {
    return { clusterId: 'CA', label: 'Central America & Caribbean' };
  } else if (latitude >= 60 && (normalizedLon >= -170 && normalizedLon <= -60)) {
    return { clusterId: 'AR', label: 'Arctic' };
  } else {
    return { clusterId: 'OT', label: 'Other' };
  }
}

/**
 * Main function to group coordinates into spatial clusters
 * 
 * @param coordinates - Array of GeoCoordinate objects
 * @returns Array of ClusterResult objects
 */
export function clusterCoordinates(coordinates: GeoCoordinate[]): ClusterResult[] {
  // Group coordinates by cluster
  const clusters = new Map<string, ClusterResult>();

  for (const coord of coordinates) {
    const { clusterId, label } = determineCluster(coord);
    
    if (!clusters.has(clusterId)) {
      // Initialize cluster with default center
      const initialCenter = getApproximateCenter(clusterId);
      clusters.set(clusterId, {
        clusterId,
        label,
        coordinates: [],
        center: initialCenter
      });
    }

    clusters.get(clusterId)!.coordinates.push(coord);
  }

  // Compute centroid for each cluster and assign as center
  for (const cluster of clusters.values()) {
    if (cluster.coordinates.length > 0) {
      const centroid = computeCentroid(cluster.coordinates);
      cluster.center = centroid;
    }
  }

  return Array.from(clusters.values());
}

/**
 * Computes the centroid of a set of coordinates
 * 
 * @param coords - Array of GeoCoordinate objects
 * @returns The centroid as a latitude/longitude object
 */
function computeCentroid(coords: GeoCoordinate[]): { latitude: number; longitude: number } {
  let sumLat = 0;
  let sumLon = 0;

  for (const coord of coords) {
    sumLat += coord.latitude;
    sumLon += coord.longitude;
  }

  return {
    latitude: sumLat / coords.length,
    longitude: sumLon / coords.length
  };
}

/**
 * Provides an approximate geographic center for a cluster based on its ID
 * Used as a temporary center before centroid calculation
 * 
 * @param clusterId - The ID of the cluster
 * @returns Approximate center coordinates
 */
function getApproximateCenter(clusterId: string): { latitude: number; longitude: number } {
  const centers: Record<string, { latitude: number; longitude: number }> = {
    'EU': { latitude: 50, longitude: 10 },
    'AS': { latitude: 40, longitude: 100 },
    'AF': { latitude: 5, longitude: 20 },
    'IN': { latitude: 20, longitude: 78 },
    'NA': { latitude: 50, longitude: -100 },
    'SA': { latitude: -10, longitude: -60 },
    'OC': { latitude: -25, longitude: 135 },
    'CA': { latitude: 20, longitude: -90 },
    'AR': { latitude: 80, longitude: -110 },
    'OT': { latitude: 0, longitude: 0 }
  };

  return centers[clusterId] || { latitude: 0, longitude: 0 };
}

// Export a default instance for convenience
export default {
  clusterCoordinates,
  determineCluster
};
