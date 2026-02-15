import ExploreFilters from "./explore/ExploreFilters";
import ExploreTokenTable from "./explore/ExploreTokenTable";

const ExploreInterface = () => {
  return (
    <div
      className="absolute inset-0 top-[73px] z-20 w-full min-h-screen m-0 p-0 rounded-none border-t border-white/5 overflow-y-auto scrollbar-hide"
      style={{
        background: 'rgba(11, 14, 20, 0.30)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-6xl mx-auto w-full px-6 pt-12 pb-8">
        <ExploreFilters />
        <ExploreTokenTable />
      </div>
    </div>
  );
};

export default ExploreInterface;
