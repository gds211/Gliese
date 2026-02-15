import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20">
      {/* Glassmorphism Container - full width, edge to edge */}
      <div className="relative w-full h-full overflow-y-auto">
        {/* Frosted Glass Effect - highly transparent with strong blur */}
        <div className="sticky inset-0 bg-white/10 backdrop-blur-xl min-h-full" style={{ position: 'fixed', top: 73, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
        
        {/* Radial darkening to reduce center brightness */}
        <div 
          className="pointer-events-none"
          style={{ position: 'fixed', top: 73, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)', zIndex: -1 }}
        />
        
        {/* Subtle top edge highlight for glass depth */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

        {/* Content */}
        <div className="relative z-10">
          <ExploreFilters />
          <ExploreTokenTable />
        </div>
      </div>
    </div>
  );
};

export default ExploreInterface;
