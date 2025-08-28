import * as THREE from 'three';

/**
 * Service for converting geographic coordinates (latitude, longitude) to Three.js 3D spherical coordinates.
 * Assumes a unit sphere (radius = 1) and uses standard spherical to Cartesian conversion.
 */
export class CoordinateConversionService {
  /**
   * Converts latitude and longitude (in degrees) to a 3D vector on a unit sphere.
   * @param latitude - Geographic latitude in degrees (-90 to 90)
   * @param longitude - Geographic longitude in degrees (-180 to 180)
   * @returns A THREE.Vector3 representing the point on the unit sphere, or null if inputs are invalid
   */
  public static convertToSpherical(latitude: number, longitude: number): THREE.Vector3 | null {
    // Validate input
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      console.error('Invalid input: latitude and longitude must be valid numbers.');
      return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn(`Invalid coordinate received: lat ${latitude}, lon ${longitude}. Skipping marker placement.`);
      return null;
    }

    // Convert degrees to radians
    const latRad = (latitude * Math.PI) / 180;
    const lonRad = (longitude * Math.PI) / 180;

    // Calculate Cartesian coordinates on unit sphere
    const x = Math.cos(latRad) * Math.cos(lonRad);
    const y = Math.sin(latRad);
    const z = Math.cos(latRad) * Math.sin(lonRad);

    return new THREE.Vector3(x, y, z);
  }
}
