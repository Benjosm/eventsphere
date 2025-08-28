import { useEffect } from 'react';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

/**
 * A React component that adds a performance stats panel (FPS, ms, MB) to the scene.
 * Only intended for development use.
 */
const StatsPanel = () => {
  useEffect(() => {
    const stats = new Stats();
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0';
    stats.dom.style.left = '0';
    stats.dom.style.zIndex = '999';
    document.body.appendChild(stats.dom);

    const animate = () => {
      stats.update();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      document.body.removeChild(stats.dom);
    };
  }, []);

  return null;
};

export default StatsPanel;
