import React from 'react';
import { Canvas } from '@react-three/fiber';
import Globe from './Globe';

const App = () => {
  return (
    <Canvas style={{ height: '100vh', width: '100vw' }}>
      <Globe />
    </Canvas>
  );
};

export default App;
