import { useEffect, useState } from 'react';

const BlackHoleCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);
      
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMoving(false), 150);
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        className={`absolute transition-all duration-300 ${
          isMoving ? 'opacity-100 scale-100' : 'opacity-60 scale-75'
        }`}
        style={{
          left: mousePosition.x - 50,
          top: mousePosition.y - 50,
          width: '100px',
          height: '100px',
        }}
      >
        {/* Black hole core */}
        <div className="absolute inset-0 rounded-full">
          {/* Outer swirl ring */}
          <div 
            className="absolute inset-0 rounded-full animate-spin border-2 border-transparent"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(255, 69, 0, 0.3), transparent)',
              animationDuration: '3s',
              animationDirection: 'normal'
            }}
          />
          
          {/* Middle swirl ring */}
          <div 
            className="absolute inset-2 rounded-full animate-spin border border-transparent"
            style={{
              background: 'conic-gradient(from 180deg, transparent, rgba(255, 140, 0, 0.4), transparent)',
              animationDuration: '2s',
              animationDirection: 'reverse'
            }}
          />
          
          {/* Inner swirl ring */}
          <div 
            className="absolute inset-4 rounded-full animate-spin"
            style={{
              background: 'conic-gradient(from 90deg, transparent, rgba(139, 69, 19, 0.5), transparent)',
              animationDuration: '1.5s',
              animationDirection: 'normal'
            }}
          />
          
          {/* Black hole center */}
          <div 
            className="absolute inset-6 rounded-full bg-black shadow-2xl"
            style={{
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 1), 0 0 30px rgba(255, 69, 0, 0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlackHoleCursor;