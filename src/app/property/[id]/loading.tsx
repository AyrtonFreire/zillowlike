export default function LoadingProperty() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="h-6 w-24 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-8 w-3/4 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-6 animate-pulse" />
              <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="h-6 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="h-6 w-40 bg-gray-200 rounded mb-6 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-80 bg-gray-100 animate-pulse" />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
