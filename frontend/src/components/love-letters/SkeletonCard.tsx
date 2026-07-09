// 1. GRID SKELETON: For the main "All Letters" dashboard page
export function AllLettersSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      {/* Title Header Shimmer */}
      <div className="w-48 h-8 bg-neutral-800 rounded-md mb-8" />
      
      {/* 3-Column Grid Matching Your Real Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, idx) => (
          <div 
            key={idx} 
            className="w-full h-[150px] bg-neutral-800/40 border border-neutral-700/20 rounded-md flex flex-col justify-between p-4 relative overflow-hidden"
          >
            {/* Flap Hinge Line Shimmer */}
            <div className="absolute top-[40px] inset-x-0 h-[1px] bg-neutral-700/30" />
            
            {/* "To:" Line */}
            <div className="w-24 h-3 bg-neutral-800 rounded z-10" />
            
            {/* Footer Row */}
            <div className="flex justify-between items-center w-full z-10">
              <div className="w-16 h-3 bg-neutral-800 rounded" />
              <div className="w-5 h-5 rounded-full bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. MODAL SKELETON: For when a user clicks an envelope but the individual record is fetching
export function LetterDetailModalSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Darkened static backdrop frame */}
      <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md" />

      {/* Skeleton Frame */}
      <div className="relative w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800/80 flex flex-col z-10 max-h-[85vh] animate-pulse">
        <div className="absolute top-0 inset-x-0 h-1 bg-neutral-800 rounded-t-xl" />

        {/* Header Area */}
        <div className="flex items-center justify-between border-b border-neutral-800/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-neutral-800" />
            <div className="w-24 h-3 bg-neutral-800 rounded" />
          </div>
          <div className="w-14 h-3 bg-neutral-800 rounded" />
        </div>

        {/* Paper Text Area */}
        <div className="flex-1 p-8 space-y-6">
          <div className="w-3/4 h-5 bg-neutral-800 rounded" />
          <div className="space-y-3 pt-2">
            <div className="w-full h-3.5 bg-neutral-800 rounded" />
            <div className="w-full h-3.5 bg-neutral-800 rounded" />
            <div className="w-11/12 h-3.5 bg-neutral-800 rounded" />
          </div>
          {/* Mock Spotify Block */}
          <div className="mt-8 pt-6 border-t border-neutral-800/40 space-y-3">
            <div className="w-1/3 h-3 bg-neutral-800 rounded" />
            <div className="w-full h-20 bg-neutral-950/40 border border-neutral-800/60 rounded-lg" />
          </div>
        </div>

        {/* Footer Area */}
        <div className="border-t border-neutral-800/50 px-6 py-4 flex items-center justify-between bg-neutral-950/10 rounded-b-xl">
          <div className="w-28 h-3 bg-neutral-800 rounded" />
          <div className="w-20 h-3 bg-neutral-800 rounded" />
        </div>
      </div>
    </div>
  );
}
