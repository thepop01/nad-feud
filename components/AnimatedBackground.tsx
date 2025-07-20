
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.15)_0%,rgba(124,58,237,0)_60%)]"></div>
      <div id="stars" className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50"></div>
      <div id="stars2" className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[pulse_10s_ease-in-out_infinite]"></div>
      <div id="stars3" className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-[pulse_15s_ease-in-out_infinite_2s]"></div>
      <div className="absolute top-0 left-0 w-1 h-1 bg-white rounded-full animate-[shooting-star_12s_ease-in-out_infinite_5s]"></div>
      <div className="absolute top-1/4 right-0 w-1 h-1 bg-white rounded-full animate-[shooting-star_15s_ease-in-out_infinite_1s]"></div>
      <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-white rounded-full animate-[shooting-star_10s_ease-in-out_infinite_8s]"></div>
       <style>{`
        @keyframes shooting-star {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(calc(-100vw * 0.7), calc(100vh * 0.7)) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
