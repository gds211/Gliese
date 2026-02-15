import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 overflow-y-auto scrollbar-hide">
      <div className="w-[90%] max-w-[1200px] mx-auto py-6">
        <div
          className="rounded-3xl border border-white/10 overflow-hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <ExploreFilters />
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-hide">
            <ExploreTokenTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreInterface;
