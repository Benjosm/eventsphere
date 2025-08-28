import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/drei';
import { CoordinateConversionService } from './utils/CoordinateConversionService';
import { EventStore, Event, ClusterResult } from './EventStore';
import useOrbitControls from './hooks/useOrbitControls';
import { clusterCoordinates, ClusterResult as SpatialClusterResult } from './utils/SpatialClusteringService';

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
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  
  // Subscribe to real-time event data stream
  useEffect(() => {
    const eventStore = EventStore.getInstance();
  
    // Load initial events and cluster them
    const loadAndClusterEvents = async () => {
      const initialEvents = await eventStore.list();
      const validEvents = initialEvents.filter(event => {
        return (
          event.latitude >= -90 &&
          event.latitude <= 90 &&
          event.longitude >= -180 &&
          event.longitude <= 180
        );
      });
      setEvents(validEvents);
      
      // Cluster the events
      const clusteredResult = await eventStore.clusterEvents();
      setClusters(clusteredResult);
    };
  
    loadAndClusterEvents();
  
    // Subscribe to new events
    const unsubscribe = eventStore.subscribe(event => {
      if (
        event.latitude >= -90 &&
        event.latitude <= 90 &&
        event.longitude >= -180 &&
        event.longitude <= 180
      ) {
        setEvents(prevEvents => [...prevEvents, event]);
        
        // Recalculate clusters with new event
        const updatedEvents = [...events, event];
        const eventStore = EventStore.getInstance();
        eventStore.clusterEvents().then(clusteredResult => {
          setClusters(clusteredResult);
        });
      }
    });
  
    return () => unsubscribe();
  }, [events]);
  
  // Create InstancedMesh for individual markers
  const markerRef = useRef<THREE.InstancedMesh>(null!);
  const markerGeometry = useMemo(() => new THREE.ConeGeometry(0.01, 0.05, 8), []);
  
  // Define cluster colors for visual differentiation
  const clusterColors: Record<string, number> = {
    'EU': 0x0066cc, // Europe - Blue
    'AS': 0xcc6600, // Asia - Orange
    'AF': 0x009900, // Africa - Green
    'IN': 0xcc0066, // Indian Subcontinent - Pink
    'NA': 0xcc9900, // North America - Brown
    'SA': 0x6600cc, // South America - Purple
    'OC': 0x00cccc, // Oceania - Cyan
    'CA': 0xcccc00, // Central America & Caribbean - Yellow
    'AR': 0x999999, // Arctic - Gray
    'OT': 0x666666  // Other - Dark Gray
  };

  // Create a material instance that supports per-instance coloring
  const markerMaterial = useMemo(() => 
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      vertexColors: true,
      side: THREE.DoubleSide
    }), []);

  // Create a map to associate event IDs with their cluster IDs
  const eventClusterMap = useMemo(() => {
    const map = new Map<string, string>();
    clusters.forEach(cluster => {
      cluster.coordinates.forEach(coord => {
        if (coord.eventId) {
          map.set(coord.eventId, cluster.clusterId);
        }
      });
    });
    return map;
  }, [clusters]);

  // Initialize marker colors when marker mesh is created
  useEffect(() => {
    if (markerRef.current && !markerRef.current.instanceColor) {
      // Initialize instance color attribute with default red color
      const colors = new Float32Array(markerRef.current.count * 3);
      // Initialize all instances to red (fallback color)
      for (let i = 0; i < markerRef.current.count; i++) {
        colors[i * 3] = 1;     // r
        colors[i * 3 + 1] = 0; // g
        colors[i * 3 + 2] = 0; // b
      }
      markerRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      markerRef.current.instanceColor.needsUpdate = true;
    }
  }, []);
  
  // Create InstancedMesh for markers
  useEffect(() => {
    if (markerRef.current) return; // Already initialized
  
    // Create instance color attribute with default values
    const colors = new Float32Array(10000 * 3);
    for (let i = 0; i < 10000 * 3; i++) {
      colors[i] = 0; // Initialize to black (will be updated later)
    }
    const instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    
    const instancedMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, 10000);
    instancedMesh.instanceColor = instanceColor;
    instancedMesh.frustumCulled = false;
    scene.add(instancedMesh);
    markerRef.current = instancedMesh;
  
    return () => {
      if (markerRef.current) {
        scene.remove(markerRef.current);
        markerRef.current.geometry.dispose();
        if (markerRef.current.material) {
          if (Array.isArray(markerRef.current.material)) {
            markerRef.current.material.forEach(material => material.dispose());
          } else {
            markerRef.current.material.dispose();
          }
        }
        if (markerRef.current.instanceColor) {
          markerRef.current.instanceColor.dispose();
        }
        markerRef.current = null!;
      }
    };
  }, [scene, markerGeometry, markerMaterial]);
  
  // Create visual representations for clusters
  const clusterGroupRef = useRef(new THREE.Group());
  
  // Create cluster visualization meshes
  const {
    clusterSphereGeometry,
    clusterSphereMaterial,
    clusterRingGeometry,
    clusterRingMaterial
  } = useMemo(() => {
    // Sphere geometry for cluster representation
    const clusterSphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    
    // Semi-transparent material for cluster sphere
    const clusterSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: true,
      renderOrder: -1
    });
    
    // Ring geometry for cluster emphasis
    const clusterRingGeometry = new THREE.RingGeometry(0.08, 0.09, 32);
    
    // Material for cluster ring
    const clusterRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthTest: true,
      renderOrder: -1
    });
    
    return {
      clusterSphereGeometry,
      clusterSphereMaterial,
      clusterRingGeometry,
      clusterRingMaterial
    };
  }, []);
  
  // Update clusters visualization when clusters change
  useEffect(() => {
    // Clear existing cluster visuals
    while (clusterGroupRef.current.children.length) {
      const child = clusterGroupRef.current.children[0];
      clusterGroupRef.current.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    
    // Create new cluster visuals
    clusters.forEach(cluster => {
      // Calculate cluster position from center coordinates
      const position = CoordinateConversionService.convertToSpherical(
        cluster.center.latitude,
        cluster.center.longitude
      );
      
      if (position !== null) {
        // Scale sphere based on cluster size (number of events)
        const scale = Math.log(cluster.coordinates.length) * 0.01 + 0.03; // Logarithmic scaling
        
        // Create cluster sphere
        const sphereMesh = new THREE.Mesh(clusterSphereGeometry, clusterSphereMaterial);
        sphereMesh.position.copy(position).multiplyScalar(1.02);
        sphereMesh.scale.set(scale, scale, scale);
        clusterGroupRef.current.add(sphereMesh);
        
        // Create cluster ring
        const ringMesh = new THREE.Mesh(clusterRingGeometry, clusterRingMaterial);
        ringMesh.position.copy(position).multiplyScalar(1.01);
        
        // Align ring to globe surface (tangent plane)
        const normal = position.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        ringMesh.quaternion.setFromUnitVectors(up, normal);
        
        clusterGroupRef.current.add(ringMesh);
      }
    });
    
    // Add cluster group to scene
    scene.add(clusterGroupRef.current);
    
    // Cleanup
    return () => {
      scene.remove(clusterGroupRef.current);
    };
  }, [clusters, scene, clusterSphereGeometry, clusterSphereMaterial, clusterRingGeometry, clusterRingMaterial]);

  // Cleanup memoized resources when component unmounts
  useEffect(() => {
    return () => {
      markerGeometry.dispose();
      markerMaterial.dispose();
    };
  }, []);
  
  // Log successful initialization
  useEffect(() => {
    console.log("Globe operational");
  }, []);
  
  // Update markers when events or clusters change
  useEffect(() => {
    if (!markerRef.current) return;
  
    const dummy = new THREE.Object3D();
    let instanceId = 0;
  
    // Update marker positions and colors
    events.forEach(event => {
      const position = CoordinateConversionService.convertToSpherical(
        event.latitude,
        event.longitude
      );
      if (position !== null) {
        // Update position
        dummy.position.copy(position).multiplyScalar(1.01);
        dummy.updateMatrix();
        markerRef.current.setMatrixAt(instanceId, dummy.matrix);
        
        // Get cluster ID for this event
        const clusterId = eventClusterMap.get(event.id) || 'OT';
        const color = clusterColors[clusterId] || 0xff0000;
        
        // Update color for this instance
        if (markerRef.current.instanceColor) {
          const threeColor = new THREE.Color(color);
          markerRef.current.instanceColor.setXYZ(
            instanceId,
            threeColor.r,
            threeColor.g,
            threeColor.b
          );
        }
        
        instanceId++;
      }
    });
  
    markerRef.current.count = instanceId;
    markerRef.current.instanceMatrix.needsUpdate = true;
    if (markerRef.current.instanceColor) {
      markerRef.current.instanceColor.needsUpdate = true;
    }
  }, [events, eventClusterMap, clusterColors]);

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
};

export default Globe;
