import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-8 min-h-screen">
        <div className="border-t border-slate-700/50 bg-[#0B101B]/90 backdrop-blur-2xl overflow-hidden">
          <ExploreFilters />
          <ExploreTokenTable />
        </div>
      </div>
    </div>
  );
};

export default ExploreInterface;
