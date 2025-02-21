import React from 'react';
import { Scan, ScanLine, Sparkles } from 'lucide-react';

const ScannerIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <Scan className="text-red-600 w-12 h-12" />
      <ScanLine className="absolute top-1/2 left-0 transform -translate-y-1/2 text-green-600 w-12 h-12 animate-pulse" />
      <Sparkles className="absolute -top-2 -right-2 text-yellow-400 w-6 h-6" />
    </div>
  );
};

export default ScannerIcon;