import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div className="absolute inset-0 top-[73px] z-20 w-full min-h-screen m-0 rounded-none border-x-0 border-b-0 border-t border-white/5 overflow-y-auto scrollbar-hide"
      style={{
        background: 'linear-gradient(to bottom, rgba(11, 14, 20, 0.80), rgba(11, 14, 20, 0.40))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="px-8 lg:px-12 pt-8 pb-8">
        <ExploreFilters />
        <ExploreTokenTable />
      </div>
    </div>
  );
};

export default ExploreInterface;
