import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/drei';
import { CoordinateConversionService } from './utils/CoordinateConversionService';

const Globe = () => {
  // Create the sphere geometry with radius 1, 64 width segments, and 64 height segments
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);

  // Load Earth texture
  const [colorMap] = useLoader(THREE.TextureLoader, ['https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg']);

  // Create a standard material for realistic lighting interaction
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.2
    });
    if (colorMap) mat.map = colorMap;
    mat.color.set(0x2288ff); // Fallback color if no texture
    return mat;
  }, [colorMap]);

  // Create a mesh Ref to reference the mesh in the scene
  const meshRef = useRef<THREE.Mesh>(null!);

  const { scene } = useThree();

  // Simulate event data with sample coordinates (in a real app, this would come from the EventDataManagement Epic)
  const eventData = [
    { id: 1, lat: 40.7128, lon: -74.0060, name: 'New York' }, // New York - valid
    { id: 2, lat: 51.5074, lon: -0.1278, name: 'London' }, // London - valid
    { id: 3, lat: 35.6762, lon: 139.6503, name: 'Tokyo' }, // Tokyo - valid
    { id: 4, lat: -33.8688, lon: 151.2093, name: 'Sydney' }, // Sydney - valid
    { id: 5, lat: -23.5505, lon: -46.6333, name: 'Sao Paulo' }, // Sao Paulo - valid
    { id: 6, lat: 90, lon: 180, name: 'North Pole 180' }, // North Pole - edge case
    { id: 7, lat: -90, lon: -180, name: 'South Pole -180' }, // South Pole - edge case
    { id: 8, lat: 91, lon: 0, name: 'Invalid Latitude' }, // Invalid lat > 90
    { id: 9, lat: -91, lon: 0, name: 'Invalid Negative Latitude' }, // Invalid lat < -90
    { id: 10, lat: 0, lon: 181, name: 'Invalid Longitude' }, // Invalid lon > 180
    { id: 11, lat: 0, lon: -181, name: 'Invalid Negative Longitude' }, // Invalid lon < -180
    { id: 12, lat: 0, lon: 0, name: 'Equator Prime Meridian' }, // Valid - origin point
    { id: 13, lat: 45, lon: 90, name: 'NE Hemisphere' }, // Valid - NE quadrant
    { id: 14, lat: -45, lon: -90, name: 'SW Hemisphere' }, // Valid - SW quadrant
  ];

  useEffect(() => {
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);

    scene.add(ambientLight);
    scene.add(directionalLight);

    // Create markers for each event
    eventData.forEach(event => {
      const position = CoordinateConversionService.convertToSpherical(event.lat, event.lon);
      
      if (position !== null) {
        // Create a simple sphere as a marker
        const markerGeometry = new THREE.SphereGeometry(0.01, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        
        // Position the marker on the globe surface
        marker.position.copy(position);
        
        // Add the marker to the scene
        scene.add(marker);
      }
    });

    // Cleanup function
    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
      
      // Remove any markers that were added
      eventData.forEach(event => {
        const position = CoordinateConversionService.convertToSpherical(event.lat, event.lon);
        if (position !== null) {
          // Find and remove marker at this position (simplified - in practice you'd store references)
          const marker = scene.getObjectByName(`marker-${event.id}`);
          if (marker) scene.remove(marker);
        }
      });
    };
  }, [scene]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
};

export default Globe;
