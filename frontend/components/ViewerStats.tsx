interface ViewerStatsProps {
  viewerCount: number;
  duration: string;
  isLive: boolean;
}

export default function ViewerStats({ viewerCount, duration, isLive }: ViewerStatsProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {isLive && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-500 rounded-full font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          LIVE
        </span>
      )}
      
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-750 text-white rounded-full">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        {viewerCount}
      </span>
      
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-750 text-white rounded-full">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {duration}
      </span>
    </div>
  );
}
