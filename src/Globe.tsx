import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/drei';

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

  useEffect(() => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);

    scene.add(ambientLight);
    scene.add(directionalLight);

    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
    };
  }, [scene]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
};

export default Globe;
