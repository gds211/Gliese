const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20">
      {/* Glassmorphism Container - full width, edge to edge */}
      <div className="relative w-full h-full">
        {/* Frosted Glass Effect - highly transparent with strong blur */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
        
        {/* Radial darkening to reduce center brightness */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)' }}
        />
        
        {/* Subtle top edge highlight for glass depth */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
      </div>
    </div>
  );
};

export default ExploreInterface;