import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 overflow-y-auto scrollbar-hide">
      <div className="w-[95%] max-w-[1600px] mx-auto pt-10 pb-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(15, 20, 30, 0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <ExploreFilters />
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-hide">
            <ExploreTokenTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreInterface;
