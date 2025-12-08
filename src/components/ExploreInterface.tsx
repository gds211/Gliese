const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 px-6">
      {/* Liquid Glass Container - matches navbar content width */}
      <div className="relative w-full h-full">
        {/* Apple-style Liquid Glass Effect */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl rounded-t-3xl" />
        
        {/* Subtle inner glow for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-t-3xl" />
        
        {/* Glass border highlight */}
        <div className="absolute inset-0 rounded-t-3xl border border-white/50 shadow-2xl" />
      </div>
    </div>
  );
};

export default ExploreInterface;