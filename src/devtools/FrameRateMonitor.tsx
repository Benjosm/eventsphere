import { useEffect } from 'react';

/**
 * Monitors and logs the current frame rate to console during development.
 * Uses requestAnimationFrame timing to calculate actual rendering performance.
 */
const FrameRateMonitor = () => {
  useEffect(() => {
    let frameCount = 0;
    let lastLoggedTime = performance.now();
    let lastTimestamp = performance.now();
    
    const animate = (timestamp: number) => {
      frameCount++;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Log FPS every second with clear target reference
      const timeSinceLastLog = timestamp - lastLoggedTime;
      if (timeSinceLastLog >= 1000) {
        const fps = Math.round(frameCount * 1000 / timeSinceLastLog);
        const status = fps >= 58 ? '✅' : '⚠️';
        console.log(`FPS Monitor: ${status} ${fps} fps (target: 60)`);
        frameCount = 0;
        lastLoggedTime = timestamp;
      }
      
      requestAnimationFrame(animate);
    };
    
    const handle = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(handle);
  }, []);
  
  return null;
};

export default FrameRateMonitor;
