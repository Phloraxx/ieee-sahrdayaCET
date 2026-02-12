import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GridBackground } from './components/GridBackground';
import { TechnicalDetails } from './components/TechnicalDetails';
import { FloatingIcons } from './components/FloatingIcons';
import { FloatingAction } from './components/FloatingAction';
import { WhatsHappening } from './components/WhatsHappening';
import { Execom } from './components/Execom';

const App: React.FC = () => {
  return (
    <div className="relative w-full bg-white text-gray-900 font-sans selection:bg-ieee-blue/20">
      
      {/* Anchor for Home Section at the absolute top of the document flow */}
      <div id="home" className="absolute top-0 left-0 w-full h-1" />

      {/* Fixed "Cover" Layer (Hero + Background) 
          These elements stay pinned to the viewport.
          The Hero component handles its own scroll-based exit animations (zoom/fade/move up).
      */}
      <div className="fixed inset-0 z-0 h-[100dvh] overflow-hidden">
        {/* Background Elements */}
        <GridBackground />
        <FloatingIcons />
        <TechnicalDetails />

        {/* Hero - Fixed full screen */}
        <Hero />
      </div>
      
      {/* Navbar - Fixed at top, outside the z-0 layer so it stays on top of scrolling content */}
      <Navbar />

      {/* Scrolling Content Layer 
          This container starts at 100vh (below the fold) and scrolls UP over the fixed hero.
          Background needs to be solid to cover the fixed layer.
      */}
      <div className="relative z-10 mt-[100dvh]">
        <WhatsHappening />
        <Execom />
        {/* Placeholder About Section */}
        <section id="about" className="py-20 bg-gray-50 text-center">
            <h2 className="text-2xl font-bold text-gray-800">About Us</h2>
            <p className="text-gray-600 mt-4">Learn more about our student branch and mission.</p>
        </section>
      </div>

      <FloatingAction />
    </div>
  );
};

export default App;