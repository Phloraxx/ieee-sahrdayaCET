import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GridBackground } from './components/GridBackground';
import { TechnicalDetails } from './components/TechnicalDetails';
import { FloatingIcons } from './components/FloatingIcons';
import { FloatingAction } from './components/FloatingAction';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-gray-900 font-sans selection:bg-ieee-blue/20">
      
      {/* Background Layer */}
      <GridBackground />
      
      {/* Floating Elements Layer */}
      <FloatingIcons />
      <TechnicalDetails />
      
      {/* UI Layer */}
      <Navbar />
      
      {/* Main Content */}
      <main className="relative z-10">
        <Hero />
      </main>

      <FloatingAction />
    </div>
  );
};

export default App;