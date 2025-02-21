import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Scanner from './components/Scanner';
import Snowfall from './components/Snowfall';
import ChristmasRoom from './components/ChristmasRoom';
import ScannerIcon from './components/ScannerIcon';
import Leaderboard from './components/Leaderboard';

function App() {
  const MainContent = () => (
    <>
      <header className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 text-white drop-shadow-lg flex items-center justify-center gap-4">
          <ScannerIcon className="mb-2" />
          Santa's Scanner
          <ScannerIcon className="mb-2" />
        </h1>
        <p className="text-2xl text-white/90">
          Find out if you're on the Naughty or Nice list!
        </p>
      </header>
      
      <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
        <Scanner />
      </div>
    </>
  );

  const LeaderboardContent = () => (
    <>
      <header className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 text-white drop-shadow-lg flex items-center justify-center gap-4">
          <ScannerIcon className="mb-2" />
          Santa's Scanner
          <ScannerIcon className="mb-2" />
        </h1>
      </header>
      
      <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
        <Leaderboard />
      </div>
    </>
  );

  return (
    <Router>
      <ChristmasRoom>
        <div className="min-h-screen bg-gradient-to-b from-red-900/80 via-green-900/80 to-red-900/80">
          <Snowfall />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<MainContent />} />
              <Route path="/leaderboard" element={<LeaderboardContent />} />
            </Routes>
            
            <footer className="text-center mt-8 text-white/75">
              <p>© {new Date().getFullYear()} North Pole Technologies</p>
              <p className="text-sm mt-2">Powered by Elf Magic ✨</p>
            </footer>
          </div>
        </div>
      </ChristmasRoom>
    </Router>
  );
}

export default App;