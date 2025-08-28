import React from 'react';
import { Canvas } from '@react-three/fiber';
import Globe from './Globe';
import StatsPanel from './components/Stats';
import PerformanceTestTool from './devtools/PerformanceTestTool';

const App = () => {
  return (
    <Canvas style={{ height: '100vh', width: '100vw' }}>
      <Globe />
      {import.meta.env.DEV && (
        <>
          <StatsPanel />
          <PerformanceTestTool />
        </>
      )}
    </Canvas>
  );
};

export default App;
