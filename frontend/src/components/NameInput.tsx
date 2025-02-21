import React, { useState } from 'react';

interface NameInputProps {
  onSubmit: (name: string) => void;
  onLeaderboard: (showLeaderboard: boolean) => void;
}

const NameInput: React.FC<NameInputProps> = ({ onSubmit, onLeaderboard }) => {
  const [inputName, setInputName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inputName.trim();
    if (trimmedName) {
      onSubmit(trimmedName);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-red-700 mb-2">Ho Ho Ho!</h2>
        <p className="text-xl text-gray-700">What's Your Name, Dear Friend?</p>
      </div>
      
      <input
        type="text"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        className="w-full p-4 rounded-lg border-3 border-red-500 focus:border-green-500 outline-none bg-white/90 text-lg placeholder-gray-400"
        placeholder="Enter your name..."
        minLength={2}
        required
      />
      
      <button
        type="submit"
        disabled={!inputName.trim()}
        className="w-full bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600 text-white font-bold py-4 px-6 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105"
      >
        Begin Santa's Scan 🎅
      </button>

      <button
        type="button"
        onClick={() => onLeaderboard(true)}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105"
      >
        View Leaderboard 🏆
      </button>
      
      <div className="text-center text-sm text-gray-500 mt-4">
        * Santa promises to keep your information confidential
      </div>
    </form>
  );
};

export default NameInput;