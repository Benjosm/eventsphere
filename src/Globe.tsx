import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/drei';
import { CoordinateConversionService } from './utils/CoordinateConversionService';
import { EventStore, Event } from './EventStore';
import useOrbitControls from './hooks/useOrbitControls';

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
  
  const { scene, camera, gl: renderer } = useThree();
  useOrbitControls(true);
  
  // Set up lighting
  useEffect(() => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
  
    scene.add(ambientLight);
    scene.add(directionalLight);
  
    // Set camera position
    camera.position.z = 2;
  
    // Cleanup lighting and camera on unmount
    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
    };
  }, [scene, camera]);
  
  const [events, setEvents] = useState<Event[]>([]);

  // Subscribe to real-time event data stream
  useEffect(() => {
    const eventStore = EventStore.getInstance();
  
    // Load initial events
    eventStore.list().then(initialEvents => {
      const validEvents = initialEvents.filter(event => {
        return (
          event.latitude >= -90 &&
          event.latitude <= 90 &&
          event.longitude >= -180 &&
          event.longitude <= 180
        );
      });
      setEvents(validEvents);
    });
  
    // Subscribe to new events
    const unsubscribe = eventStore.subscribe(event => {
      if (
        event.latitude >= -90 &&
        event.latitude <= 90 &&
        event.longitude >= -180 &&
        event.longitude <= 180
      ) {
        setEvents(prevEvents => [...prevEvents, event]);
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  // Create InstancedMesh for markers
  const markerRef = useRef<THREE.InstancedMesh>(null!);
  
  const markerGeometry = useMemo(() => new THREE.ConeGeometry(0.01, 0.05, 8), []);
  const markerMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }), []);
  
  // Create InstancedMesh once
  useEffect(() => {
    if (markerRef.current) return; // Already initialized
  
    const instancedMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, 10000);
    instancedMesh.frustumCulled = false;
    scene.add(instancedMesh);
    markerRef.current = instancedMesh;
  
    return () => {
      if (markerRef.current) {
        scene.remove(markerRef.current);
        markerRef.current.geometry.dispose();
        markerRef.current.material.dispose();
        markerRef.current = null!;
      }
    };
  }, [scene, markerGeometry, markerMaterial]);

  // Cleanup memoized resources when component unmounts
  useEffect(() => {
    return () => {
      markerGeometry.dispose();
      markerMaterial.dispose();
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (!markerRef.current) return;
  
    const dummy = new THREE.Object3D();
    let instanceId = 0;
  
    events.forEach(event => {
      const position = CoordinateConversionService.convertToSpherical(
        event.latitude,
        event.longitude
      );
      if (position !== null) {
        dummy.position.copy(position).multiplyScalar(1.01);
        dummy.updateMatrix();
        markerRef.current.setMatrixAt(instanceId, dummy.matrix);
        instanceId++;
      }
    });
  
    markerRef.current.count = instanceId;
    markerRef.current.instanceMatrix.needsUpdate = true;
  }, [events]);

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
};

export default Globe;
