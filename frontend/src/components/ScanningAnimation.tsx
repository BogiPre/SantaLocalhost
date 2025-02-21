import React from 'react';
import { CheckCircle2, ListChecks, Sparkles } from 'lucide-react';

const ScanningAnimation: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div className="relative text-center space-y-6">
      {/* Santa Animation Container */}
      <div className="relative w-48 h-48 mx-auto animate-wobble">
        <img 
          src="https://st2.depositphotos.com/1029251/48007/i/1600/depositphotos_480071336-stock-photo-santa-claus-santa-claus-checks.jpg"
          alt="Santa checking list"
          className="w-full h-full object-cover rounded-full border-4 border-red-500"
        />
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-8 h-8 text-yellow-400 animate-twinkle" />
        </div>
        <div className="absolute -bottom-2 -left-2">
          <ListChecks className="w-8 h-8 text-green-500 animate-bounce" />
        </div>
      </div>

      {/* Scanning Text */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-red-600">
          Checking {name}'s Record...
        </h2>
        
        <div className="flex flex-col gap-2">
          {scanningSteps.map((step, index) => (
            <ScanStep 
              key={index} 
              text={step} 
              delay={index * 2000} // Increased delay between steps
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-4 bg-green-100 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-green-500 to-red-500 animate-progress rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
      </div>
    </div>
  );
};

const ScanStep: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-2 animate-fadeIn">
      <CheckCircle2 className="w-5 h-5 text-green-500" />
      <span className="text-gray-700">{text}</span>
    </div>
  );
};

const scanningSteps = [
  "Reviewing Christmas spirit levels...",
  "Analyzing cookie consumption...",
  "Checking bedtime compliance...",
  "Measuring kindness quotient...",
  "Consulting with the elves..."
];

export default ScanningAnimation;