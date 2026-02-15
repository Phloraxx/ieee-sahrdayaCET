import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import FullExecom from './pages/FullExecom';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/full-execom" element={<FullExecom />} />
    </Routes>
  );
};

export default App;