import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GridBackground } from './components/GridBackground';
import { TechnicalDetails } from './components/TechnicalDetails';
import { FloatingIcons } from './components/FloatingIcons';
import { FloatingAction } from './components/FloatingAction';
import { WhatsHappening } from './components/WhatsHappening';

const App: React.FC = () => {
  return (
    <div className="relative w-full bg-white text-gray-900 font-sans selection:bg-ieee-blue/20">

      {/* Fixed "Cover" Layer (Hero + Background) 
          These elements stay pinned to the viewport.
          The Hero component handles its own scroll-based exit animations (zoom/fade/move up).
      */}
      <div className="fixed inset-0 z-0 h-screen overflow-hidden">
        {/* Background Elements */}
        <GridBackground />
        <FloatingIcons />
        <TechnicalDetails />

        {/* Navbar - Fixed at top (its own style handles positioning, but we include it here conceptually) */}
        <Navbar />

        {/* Hero - Fixed full screen */}
        <Hero />
      </div>

      {/* Scrolling Content Layer 
          This container starts at 100vh (below the fold) and scrolls UP over the fixed hero.
          Background needs to be solid to cover the fixed layer.
      */}
      <div className="relative z-10 mt-[100vh]">
        <WhatsHappening />

      </div>

      <FloatingAction />
    </div>
  );
};

export default App;