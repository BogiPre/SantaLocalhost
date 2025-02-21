import React from 'react';

const ChristmasRoom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      {/* Cozy Christmas Room Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&q=80')",
        }}
      />
      
      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-16 bg-gradient-to-b from-green-900 to-transparent opacity-30" />
      <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-green-900 to-transparent opacity-30" />
      
      {/* Content */}
      {children}
    </div>
  );
};

export default ChristmasRoom;