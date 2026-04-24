const PoolsInterface = () => {
  return (
    <div className="relative w-full min-h-[calc(100vh-65px)] z-20">
      {/* Frosted Glass Effect - highly transparent with strong blur */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

      {/* Radial darkening to reduce center brightness */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)' }}
      />
    </div>
  );
};

export default PoolsInterface;