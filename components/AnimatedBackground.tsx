
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Gradient Base - Deep Indigo to Vibrant Magenta */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0050] via-[#2d1b69] to-[#a00080]"></div>

      {/* Secondary gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#4c1d95]/20 to-[#581c87]/30"></div>

      {/* Nebula Cloud Effects */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-[#a855f7]/30 to-transparent rounded-full blur-3xl animate-nebula-drift-1"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-radial from-[#ec4899]/25 to-transparent rounded-full blur-3xl animate-nebula-drift-2"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-radial from-[#3b82f6]/20 to-transparent rounded-full blur-2xl animate-nebula-drift-3"></div>
      </div>

      {/* Large Floating Bubbles */}
      <div className="bubble-large bubble-1"></div>
      <div className="bubble-large bubble-2"></div>
      <div className="bubble-large bubble-3"></div>
      <div className="bubble-large bubble-4"></div>
      <div className="bubble-large bubble-5"></div>

      {/* Medium Floating Bubbles */}
      <div className="bubble-medium bubble-6"></div>
      <div className="bubble-medium bubble-7"></div>
      <div className="bubble-medium bubble-8"></div>
      <div className="bubble-medium bubble-9"></div>
      <div className="bubble-medium bubble-10"></div>
      <div className="bubble-medium bubble-11"></div>
      <div className="bubble-medium bubble-12"></div>

      {/* Small Floating Bubbles */}
      <div className="bubble-small bubble-13"></div>
      <div className="bubble-small bubble-14"></div>
      <div className="bubble-small bubble-15"></div>
      <div className="bubble-small bubble-16"></div>
      <div className="bubble-small bubble-17"></div>
      <div className="bubble-small bubble-18"></div>
      <div className="bubble-small bubble-19"></div>
      <div className="bubble-small bubble-20"></div>

      {/* Light Orbs and Lens Flares */}
      <div className="light-orb orb-1"></div>
      <div className="light-orb orb-2"></div>
      <div className="light-orb orb-3"></div>
      <div className="lens-flare flare-1"></div>
      <div className="lens-flare flare-2"></div>

      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/5 w-32 h-32 bg-[#a855f7] rounded-full blur-3xl opacity-20 animate-glow-pulse-1"></div>
      <div className="absolute bottom-1/4 right-1/3 w-24 h-24 bg-[#ec4899] rounded-full blur-2xl opacity-25 animate-glow-pulse-2"></div>
      <div className="absolute top-2/3 left-2/3 w-20 h-20 bg-[#3b82f6] rounded-full blur-xl opacity-30 animate-glow-pulse-3"></div>

      {/* CSS Styles */}
      <style>{`
        /* Gradient utilities */
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }

        /* Enhanced 3D Bubble Base Styles */
        .bubble-large, .bubble-medium, .bubble-small {
          position: absolute;
          border-radius: 50%;
          backdrop-filter: blur(3px);
          border: 2px solid rgba(255, 255, 255, 0.15);

          /* Multi-layered 3D background with custom gradients */
          background:
            /* Specular highlight overlay */
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.6) 30%, transparent 60%),
            /* Secondary neon reflection */
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 40%, transparent 70%),
            /* Lavender accent reflection */
            radial-gradient(ellipse 15% 10% at 60% 80%, #d7bfff 0%, rgba(215, 191, 255, 0.3) 50%, transparent 80%);

          /* Enhanced 3D shadows and lighting */
          box-shadow:
            /* Inner highlight - top edge */
            inset 0 3px 8px rgba(255, 255, 255, 0.4),
            /* Inner shadow - bottom edge */
            inset 0 -3px 8px rgba(0, 0, 0, 0.2),
            /* Inner side shadows for roundness */
            inset 3px 0 8px rgba(255, 255, 255, 0.15),
            inset -3px 0 8px rgba(0, 0, 0, 0.1),
            /* Outer glow */
            0 0 30px rgba(168, 85, 247, 0.2),
            /* Main drop shadow */
            0 8px 32px rgba(0, 0, 0, 0.4),
            /* Secondary soft shadow for depth */
            0 4px 16px rgba(0, 0, 0, 0.2);

          /* 3D transform properties */
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        /* 3D Bubble Highlight Effects */
        .bubble-large::before, .bubble-medium::before, .bubble-small::before {
          content: '';
          position: absolute;
          top: 15%;
          left: 25%;
          width: 35%;
          height: 35%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.6) 30%,
            rgba(255, 255, 255, 0.2) 60%,
            transparent 100%);
          filter: blur(1px);
          transform: translateZ(10px);
        }

        /* Secondary reflection for ultra-realism */
        .bubble-large::after, .bubble-medium::after, .bubble-small::after {
          content: '';
          position: absolute;
          top: 60%;
          right: 20%;
          width: 20%;
          height: 20%;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%);
          filter: blur(0.5px);
          transform: translateZ(5px);
        }

        /* Large Bubbles - Enhanced 3D */
        .bubble-large {
          width: 140px;
          height: 140px;
          border-width: 3px;
          box-shadow:
            inset 0 4px 12px rgba(255, 255, 255, 0.5),
            inset 0 -4px 12px rgba(0, 0, 0, 0.25),
            inset 4px 0 12px rgba(255, 255, 255, 0.2),
            inset -4px 0 12px rgba(0, 0, 0, 0.15),
            0 0 40px rgba(168, 85, 247, 0.3),
            0 12px 48px rgba(0, 0, 0, 0.5),
            0 6px 24px rgba(0, 0, 0, 0.3);
        }

        /* Medium Bubbles - Enhanced 3D */
        .bubble-medium {
          width: 90px;
          height: 90px;
          border-width: 2px;
          box-shadow:
            inset 0 3px 10px rgba(255, 255, 255, 0.4),
            inset 0 -3px 10px rgba(0, 0, 0, 0.2),
            inset 3px 0 10px rgba(255, 255, 255, 0.15),
            inset -3px 0 10px rgba(0, 0, 0, 0.1),
            0 0 30px rgba(168, 85, 247, 0.25),
            0 8px 36px rgba(0, 0, 0, 0.4),
            0 4px 18px rgba(0, 0, 0, 0.25);
        }

        /* Small Bubbles - Enhanced 3D */
        .bubble-small {
          width: 50px;
          height: 50px;
          border-width: 1.5px;
          box-shadow:
            inset 0 2px 6px rgba(255, 255, 255, 0.35),
            inset 0 -2px 6px rgba(0, 0, 0, 0.15),
            inset 2px 0 6px rgba(255, 255, 255, 0.1),
            inset -2px 0 6px rgba(0, 0, 0, 0.08),
            0 0 20px rgba(168, 85, 247, 0.2),
            0 6px 24px rgba(0, 0, 0, 0.35),
            0 3px 12px rgba(0, 0, 0, 0.2);
        }

        /* Individual Bubble Positions, Animations & Custom Gradients */

        /* Large Bubbles with Unique Gradients */
        .bubble-1 {
          top: 10%; left: 15%;
          animation: float-1 20s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.6) 30%, transparent 60%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 40%, transparent 70%),
            radial-gradient(ellipse at center, #ffffff00 0%, #ffffff30 40%, #e0ccff50 100%);
        }

        .bubble-2 {
          top: 25%; right: 20%;
          animation: float-2 25s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.7) 25%, transparent 55%),
            radial-gradient(ellipse 15% 12% at 65% 75%, #d7bfff 0%, rgba(215, 191, 255, 0.5) 45%, transparent 75%),
            linear-gradient(135deg, #a00080 0%, #5800a0 50%, #0f0050 100%);
        }

        .bubble-3 {
          bottom: 30%; left: 25%;
          animation: float-3 18s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.8) 20%, transparent 50%),
            radial-gradient(ellipse 25% 20% at 75% 30%, #6df0ff 0%, rgba(109, 240, 255, 0.3) 35%, transparent 65%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 60%, #eec0ff 100%);
        }

        .bubble-4 {
          top: 60%; right: 15%;
          animation: float-4 22s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.6) 30%, transparent 60%),
            radial-gradient(ellipse 18% 15% at 60% 80%, #d7bfff 0%, rgba(215, 191, 255, 0.4) 50%, transparent 80%),
            linear-gradient(45deg, #ffffff00 0%, #ffffff30 30%, #e0ccff50 100%);
        }

        .bubble-5 {
          bottom: 15%; right: 35%;
          animation: float-5 24s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.7) 25%, transparent 55%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 40%, transparent 70%),
            linear-gradient(225deg, #a00080 0%, #5800a0 40%, #0f0050 100%);
        }

        /* Medium Bubbles with Unique Gradients */
        .bubble-6 {
          top: 20%; left: 45%;
          animation: float-6 16s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.8) 20%, transparent 50%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 50%, #eec0ff 100%);
        }

        .bubble-7 {
          top: 70%; left: 60%;
          animation: float-7 19s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.6) 30%, transparent 60%),
            radial-gradient(ellipse 15% 12% at 65% 75%, #d7bfff 0%, rgba(215, 191, 255, 0.5) 45%, transparent 75%),
            radial-gradient(ellipse at center, #ffffff00 0%, #ffffff30 60%, #e0ccff50 100%);
        }

        .bubble-8 {
          bottom: 40%; right: 45%;
          animation: float-8 21s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.7) 25%, transparent 55%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 40%, transparent 70%),
            linear-gradient(180deg, #a00080 0%, #5800a0 60%, #0f0050 100%);
        }

        .bubble-9 {
          top: 40%; left: 80%;
          animation: float-9 17s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.8) 20%, transparent 50%),
            radial-gradient(ellipse 18% 15% at 60% 80%, #d7bfff 0%, rgba(215, 191, 255, 0.4) 50%, transparent 80%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 40%, #eec0ff 100%);
        }

        .bubble-10 {
          bottom: 60%; left: 10%;
          animation: float-10 23s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.6) 30%, transparent 60%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 40%, transparent 70%),
            linear-gradient(90deg, #ffffff00 0%, #ffffff30 50%, #e0ccff50 100%);
        }

        .bubble-11 {
          top: 80%; right: 60%;
          animation: float-11 15s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.7) 25%, transparent 55%),
            radial-gradient(ellipse 15% 12% at 65% 75%, #d7bfff 0%, rgba(215, 191, 255, 0.5) 45%, transparent 75%),
            linear-gradient(315deg, #a00080 0%, #5800a0 50%, #0f0050 100%);
        }

        .bubble-12 {
          top: 35%; left: 30%;
          animation: float-12 20s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.8) 20%, transparent 50%),
            radial-gradient(ellipse 25% 20% at 75% 30%, #6df0ff 0%, rgba(109, 240, 255, 0.3) 35%, transparent 65%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 70%, #eec0ff 100%);
        }

        /* Small Bubbles with Unique Gradients */
        .bubble-13 {
          top: 15%; left: 70%;
          animation: float-13 12s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.9) 20%, transparent 45%),
            radial-gradient(ellipse at center, #ffffff00 0%, #ffffff30 70%, #e0ccff50 100%);
        }

        .bubble-14 {
          bottom: 20%; left: 40%;
          animation: float-14 14s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.8) 25%, transparent 50%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.5) 35%, transparent 65%),
            linear-gradient(60deg, #a00080 0%, #5800a0 70%, #0f0050 100%);
        }

        .bubble-15 {
          top: 50%; right: 25%;
          animation: float-15 13s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.9) 15%, transparent 40%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 80%, #eec0ff 100%);
        }

        .bubble-16 {
          bottom: 50%; right: 70%;
          animation: float-16 16s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.8) 25%, transparent 50%),
            radial-gradient(ellipse 15% 12% at 65% 75%, #d7bfff 0%, rgba(215, 191, 255, 0.6) 40%, transparent 70%),
            radial-gradient(ellipse at center, #ffffff00 0%, #ffffff30 80%, #e0ccff50 100%);
        }

        .bubble-17 {
          top: 75%; left: 50%;
          animation: float-17 11s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.9) 20%, transparent 45%),
            radial-gradient(ellipse 20% 15% at 70% 25%, #6df0ff 0%, rgba(109, 240, 255, 0.5) 35%, transparent 65%),
            linear-gradient(270deg, #a00080 0%, #5800a0 50%, #0f0050 100%);
        }

        .bubble-18 {
          top: 30%; right: 80%;
          animation: float-18 15s ease-in-out infinite;
          background:
            radial-gradient(ellipse 30% 20% at 20% 10%, #ffffff 0%, rgba(255, 255, 255, 0.9) 15%, transparent 40%),
            radial-gradient(ellipse 18% 15% at 60% 80%, #d7bfff 0%, rgba(215, 191, 255, 0.5) 45%, transparent 75%),
            radial-gradient(ellipse at center, #ccf1ff 0%, #7ee8fa 60%, #eec0ff 100%);
        }

        .bubble-19 {
          bottom: 35%; left: 75%;
          animation: float-19 13s ease-in-out infinite;
          background:
            radial-gradient(ellipse 35% 25% at 25% 15%, #ffffff 0%, rgba(255, 255, 255, 0.8) 25%, transparent 50%),
            radial-gradient(ellipse 25% 20% at 75% 30%, #6df0ff 0%, rgba(109, 240, 255, 0.4) 30%, transparent 60%),
            linear-gradient(120deg, #ffffff00 0%, #ffffff30 60%, #e0ccff50 100%);
        }

        .bubble-20 {
          top: 85%; right: 40%;
          animation: float-20 14s ease-in-out infinite;
          background:
            radial-gradient(ellipse 40% 30% at 30% 20%, #ffffff 0%, rgba(255, 255, 255, 0.9) 20%, transparent 45%),
            radial-gradient(ellipse 15% 12% at 65% 75%, #d7bfff 0%, rgba(215, 191, 255, 0.6) 40%, transparent 70%),
            linear-gradient(150deg, #a00080 0%, #5800a0 40%, #0f0050 100%);
        }

        /* Light Orbs */
        .light-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(168, 85, 247, 0.4) 30%,
            rgba(236, 72, 153, 0.2) 60%,
            transparent 100%);
          filter: blur(1px);
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
        }

        .orb-1 {
          top: 20%;
          left: 80%;
          width: 60px;
          height: 60px;
          animation: orb-float-1 15s ease-in-out infinite;
        }

        .orb-2 {
          bottom: 25%;
          left: 20%;
          width: 40px;
          height: 40px;
          animation: orb-float-2 18s ease-in-out infinite;
        }

        .orb-3 {
          top: 60%;
          right: 30%;
          width: 50px;
          height: 50px;
          animation: orb-float-3 12s ease-in-out infinite;
        }

        /* Lens Flares */
        .lens-flare {
          position: absolute;
          background: linear-gradient(45deg,
            transparent 0%,
            rgba(255, 255, 255, 0.6) 45%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0.6) 55%,
            transparent 100%);
          filter: blur(0.5px);
        }

        .flare-1 {
          top: 30%;
          left: 60%;
          width: 200px;
          height: 2px;
          transform: rotate(45deg);
          animation: flare-pulse-1 8s ease-in-out infinite;
        }

        .flare-2 {
          bottom: 40%;
          right: 20%;
          width: 150px;
          height: 1px;
          transform: rotate(-30deg);
          animation: flare-pulse-2 10s ease-in-out infinite;
        }

        /* Nebula Drift Animations */
        @keyframes nebula-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(20px, -30px) scale(1.1); opacity: 0.6; }
          66% { transform: translate(-15px, 20px) scale(0.9); opacity: 0.3; }
        }

        @keyframes nebula-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(-25px, -20px) scale(1.2); opacity: 0.4; }
        }

        @keyframes nebula-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          25% { transform: translate(15px, 25px) scale(0.8); opacity: 0.35; }
          75% { transform: translate(-20px, -15px) scale(1.1); opacity: 0.15; }
        }

        /* Glow Pulse Animations */
        @keyframes glow-pulse-1 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        @keyframes glow-pulse-2 {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        @keyframes glow-pulse-3 {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        /* Enhanced 3D Bubble Float Animations - Large Bubbles */
        @keyframes float-1 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            opacity: 0.7;
          }
          25% {
            transform: translate3d(15px, -20px, 10px) scale(1.1) rotateX(5deg) rotateY(-10deg);
            opacity: 0.9;
          }
          50% {
            transform: translate3d(-10px, -35px, -5px) scale(0.9) rotateX(-3deg) rotateY(8deg);
            opacity: 0.6;
          }
          75% {
            transform: translate3d(20px, -15px, 8px) scale(1.05) rotateX(2deg) rotateY(-5deg);
            opacity: 0.8;
          }
        }

        @keyframes float-2 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            opacity: 0.6;
          }
          33% {
            transform: translate3d(-20px, 25px, 15px) scale(1.2) rotateX(-8deg) rotateY(12deg);
            opacity: 0.8;
          }
          66% {
            transform: translate3d(15px, -10px, -8px) scale(0.8) rotateX(6deg) rotateY(-15deg);
            opacity: 0.5;
          }
        }

        @keyframes float-3 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            opacity: 0.8;
          }
          50% {
            transform: translate3d(25px, -30px, 12px) scale(1.15) rotateX(-10deg) rotateY(20deg);
            opacity: 0.9;
          }
        }

        @keyframes float-4 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            opacity: 0.7;
          }
          25% {
            transform: translate3d(-15px, 20px, -10px) scale(0.9) rotateX(8deg) rotateY(-18deg);
            opacity: 0.5;
          }
          75% {
            transform: translate3d(10px, -25px, 6px) scale(1.1) rotateX(-5deg) rotateY(10deg);
            opacity: 0.8;
          }
        }

        @keyframes float-5 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            opacity: 0.6;
          }
          40% {
            transform: translate3d(20px, 15px, 18px) scale(1.3) rotateX(-12deg) rotateY(25deg);
            opacity: 0.9;
          }
          80% {
            transform: translate3d(-25px, -20px, -12px) scale(0.85) rotateX(15deg) rotateY(-20deg);
            opacity: 0.4;
          }
        }

        /* Medium Bubbles */
        @keyframes float-6 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(-18px, 22px) scale(1.2); opacity: 0.7; }
        }

        @keyframes float-7 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          33% { transform: translate(12px, -18px) scale(0.9); opacity: 0.4; }
          66% { transform: translate(-15px, 25px) scale(1.1); opacity: 0.8; }
        }

        @keyframes float-8 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          25% { transform: translate(22px, -12px) scale(1.15); opacity: 0.9; }
          75% { transform: translate(-8px, 18px) scale(0.95); opacity: 0.5; }
        }

        @keyframes float-9 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(-20px, -15px) scale(1.25); opacity: 0.8; }
        }

        @keyframes float-10 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          30% { transform: translate(15px, 20px) scale(0.8); opacity: 0.3; }
          70% { transform: translate(-12px, -25px) scale(1.1); opacity: 0.7; }
        }

        @keyframes float-11 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          50% { transform: translate(18px, -22px) scale(1.3); opacity: 0.9; }
        }

        @keyframes float-12 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(-25px, 10px) scale(0.9); opacity: 0.4; }
          75% { transform: translate(20px, -18px) scale(1.2); opacity: 0.8; }
        }

        /* Small Bubbles */
        @keyframes float-13 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(-10px, 15px) scale(1.4); opacity: 0.7; }
        }

        @keyframes float-14 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate(8px, -12px) scale(0.7); opacity: 0.3; }
          66% { transform: translate(-15px, 18px) scale(1.2); opacity: 0.6; }
        }

        @keyframes float-15 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(12px, -8px) scale(1.3); opacity: 0.8; }
        }

        @keyframes float-16 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          25% { transform: translate(-8px, 10px) scale(1.1); opacity: 0.6; }
          75% { transform: translate(15px, -12px) scale(0.8); opacity: 0.3; }
        }

        @keyframes float-17 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(-12px, -10px) scale(1.5); opacity: 0.8; }
        }

        @keyframes float-18 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(10px, 8px) scale(0.6); opacity: 0.2; }
          66% { transform: translate(-6px, -15px) scale(1.3); opacity: 0.7; }
        }

        @keyframes float-19 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(8px, -14px) scale(1.2); opacity: 0.9; }
        }

        @keyframes float-20 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(-10px, 6px) scale(0.8); opacity: 0.5; }
          75% { transform: translate(12px, -8px) scale(1.4); opacity: 0.7; }
        }

        /* Light Orb Animations */
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          33% { transform: translate(-30px, 20px) scale(1.2); opacity: 1; }
          66% { transform: translate(25px, -15px) scale(0.9); opacity: 0.6; }
        }

        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          50% { transform: translate(20px, -25px) scale(1.3); opacity: 0.9; }
        }

        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(-15px, 18px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(22px, -12px) scale(1.1); opacity: 0.8; }
        }

        /* Lens Flare Animations */
        @keyframes flare-pulse-1 {
          0%, 100% { opacity: 0; transform: rotate(45deg) scale(1); }
          50% { opacity: 0.8; transform: rotate(45deg) scale(1.2); }
        }

        @keyframes flare-pulse-2 {
          0%, 100% { opacity: 0; transform: rotate(-30deg) scale(1); }
          50% { opacity: 0.6; transform: rotate(-30deg) scale(1.5); }
        }

        /* Performance optimizations */
        * {
          will-change: transform, opacity;
        }

        /* Fallback for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
