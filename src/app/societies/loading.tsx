// Next.js route-level loading UI — shown while SocietiesClient mounts
export default function SocietiesLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse pt-32 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Title skeleton */}
                <div className="text-center mb-16">
                    <div className="h-12 w-72 bg-gray-100 rounded mx-auto mb-6" />
                    <div className="h-4 w-48 bg-gray-100 rounded mx-auto" />
                </div>
                {/* Grid skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
                            <div className="aspect-square p-6">
                                <div className="w-full h-full bg-gray-100 rounded-lg" />
                            </div>
                            <div className="p-4 pt-2">
                                <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
