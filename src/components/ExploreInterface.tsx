import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Glassmorphism card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <ExploreFilters />
          <ExploreTokenTable />
        </div>
      </div>
    </div>
  );
};

export default ExploreInterface;
