import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { sphericalLerp } from 'dampen';

const useOrbitControls = (enabled = true) => {
  const { camera, gl } = useThree();
  const rafId = useRef<number | null>(null);
  
  // Current camera parameters
  const spherical = useRef({ theta: Math.PI, phi: Math.PI / 2, radius: 5 });
  const target = useRef({ x: 0, y: 0, z: 0 });
  
  // Damped values for smooth animation
  const dampedSpherical = useRef({ theta: Math.PI, phi: Math.PI / 2, radius: 5 });
  const dampedTarget = useRef({ x: 0, y: 0, z: 0 });
  
  // Velocity tracking for momentum
  const velocity = useRef({ theta: 0, phi: 0, radius: 0 });
  
  // State for mouse/touch interaction
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 });
  const [startTouchDistance, setStartTouchDistance] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  
  // Touch helpers
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Animation loop for damping
  const animate = () => {
    // Apply damping to spherical coordinates
    const dampFactor = 0.1; // Adjust for desired damping effect
    const newTheta = sphericalLerp(dampedSpherical.current.theta, spherical.current.theta, velocity.current.theta, dampFactor);
    const newPhi = sphericalLerp(dampedSpherical.current.phi, spherical.current.phi, velocity.current.phi, dampFactor);
    const newRadius = sphericalLerp(dampedSpherical.current.radius, spherical.current.radius, velocity.current.radius, dampFactor);
    
    // Update damped values
    dampedSpherical.current.theta = newTheta.value;
    dampedSpherical.current.phi = newPhi.value;
    dampedSpherical.current.radius = Math.max(2, Math.min(10, newRadius.value));
    
    velocity.current.theta = newTheta.velocity;
    velocity.current.phi = newPhi.velocity;
    velocity.current.radius = newRadius.velocity;
    
    // Convert spherical to Cartesian for camera position
    const phi = dampedSpherical.current.phi;
    const theta = dampedSpherical.current.theta;
    const radius = dampedSpherical.current.radius;
    
    const x = target.current.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.current.y + radius * Math.cos(phi);
    const z = target.current.z + radius * Math.sin(phi) * Math.cos(theta);
    
    camera.position.set(x, y, z);
    camera.lookAt(target.current.x, target.current.y, target.current.z);
    
    // Continue animation
    rafId.current = requestAnimationFrame(animate);
  };
  
  // Start animation loop
  useEffect(() => {
    if (!enabled) return;
    
    rafId.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [enabled]);
  
  // Mouse event handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (!enabled) return;
    
    setIsMouseDown(true);
    setStartMouse({ x: e.clientX, y: e.clientY });
    
    // Prevent default to avoid text selection
    e.preventDefault();
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!enabled || !isMouseDown) return;
    
    setIsDragging(true);
    
    const deltaX = e.clientX - startMouse.x;
    const deltaY = e.clientY - startMouse.y;
    
    // Update spherical coordinates
    spherical.current.theta -= deltaX * 0.01;
    spherical.current.phi -= deltaY * 0.01;
    
    // Clamp phi to prevent flipping
    spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));
    
    // Update start position for next frame
    setStartMouse({ x: e.clientX, y: e.clientY });
    
    // Reset velocity when actively dragging
    velocity.current.theta = 0;
    velocity.current.phi = 0;
    
    e.preventDefault();
  };
  
  const handleMouseUp = () => {
    setIsMouseDown(false);
    setLastTouchTime(Date.now());
  };
  
  const handleWheel = (e: WheelEvent) => {
    if (!enabled) return;
    
    // Adjust zoom speed and direction
    const zoomSpeed = 0.1;
    spherical.current.radius += e.deltaY * 0.001 * zoomSpeed * spherical.current.radius;
    
    // Clamp radius
    spherical.current.radius = Math.max(2, Math.min(10, spherical.current.radius));
    
    // Reset zoom velocity
    velocity.current.radius = 0;
    
    e.preventDefault();
  };
  
  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (!enabled) return;
    
    setIsMouseDown(true);
    
    if (e.touches.length === 1) {
      setStartMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length >= 2) {
      setStartTouchDistance(getTouchDistance(e.touches));
    }
    
    e.preventDefault();
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!enabled) return;
    
    setIsDragging(true);
    
    if (e.touches.length === 1 && !startTouchDistance) {
      const deltaX = e.touches[0].clientX - startMouse.x;
      const deltaY = e.touches[0].clientY - startMouse.y;
      
      spherical.current.theta -= deltaX * 0.01;
      spherical.current.phi -= deltaY * 0.01;
      
      // Clamp phi to prevent flipping
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));
      
      setStartMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      
      // Reset velocity when actively dragging
      velocity.current.theta = 0;
      velocity.current.phi = 0;
    } else if (e.touches.length >= 2) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / startTouchDistance;
      
      // Apply zoom based on pinch distance
      spherical.current.radius /= scale;
      
      // Clamp radius
      spherical.current.radius = Math.max(2, Math.min(10, spherical.current.radius));
      
      // Reset zoom velocity
      velocity.current.radius = 0;
      
      // Update start distance for next frame
      setStartTouchDistance(currentDistance);
    }
    
    e.preventDefault();
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    setIsMouseDown(false);
    setStartTouchDistance(0);
    setLastTouchTime(Date.now());
    
    // If no more touches, end dragging
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
    
    e.preventDefault();
  };
  
  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = gl.domElement;
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    
    // Set initial camera position
    camera.position.set(
      spherical.current.radius * Math.sin(spherical.current.phi) * Math.sin(spherical.current.theta),
      spherical.current.radius * Math.cos(spherical.current.phi),
      spherical.current.radius * Math.sin(spherical.current.phi) * Math.cos(spherical.current.theta)
    );
    camera.lookAt(0, 0, 0);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, gl, camera]);
  
  // Update the target position if needed
  const updateTarget = (x: number, y: number, z: number) => {
    target.current.x = x;
    target.current.y = y;
    target.current.z = z;
  };
  
  return {
    updateTarget
  };
};

export default useOrbitControls;
