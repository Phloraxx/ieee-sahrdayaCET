// Next.js route-level loading UI — shown while the server fetches events data
export default function EventsLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            {/* Navbar placeholder */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50" />

            {/* Hero skeleton */}
            <div className="pt-16">
                <div className="relative h-[60vh] bg-gray-100" />
            </div>

            {/* Grid skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="h-8 w-48 bg-gray-100 rounded mb-8" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                            <div className="aspect-[9/16] bg-gray-100" />
                            <div className="p-5 space-y-3">
                                <div className="h-3 bg-gray-100 rounded w-1/3" />
                                <div className="h-5 bg-gray-100 rounded w-4/5" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
