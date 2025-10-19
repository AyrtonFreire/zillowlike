export function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-soft animate-pulse">
      <div 
        className="h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite'
        }}
      />
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-4">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function PropertyListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="min-h-[90vh] bg-gray-200 animate-pulse flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-16 bg-gray-300 rounded w-96 mx-auto" />
        <div className="h-8 bg-gray-300 rounded w-64 mx-auto" />
        <div className="h-12 bg-gray-300 rounded-xl w-[600px] mx-auto" />
      </div>
    </div>
  );
}

export function NavbarSkeleton() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="hidden md:flex gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
