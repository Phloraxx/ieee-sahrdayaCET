// Next.js route-level loading UI — shown while ExecomClient mounts
export default function ExecomLoading() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
            {/* Sidebar skeleton */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-gray-100 flex-col z-50">
                <div className="h-16 border-b border-gray-100" />
                <div className="flex-1 py-4 px-2 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-xl bg-gray-100" />
                    ))}
                </div>
            </aside>
            {/* Mobile header skeleton */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100" />
                    <div className="w-32 h-5 rounded bg-gray-100" />
                    <div className="w-8 h-8 rounded-lg bg-gray-100" />
                </div>
            </div>
            {/* Content skeleton */}
            <main className="lg:ml-20 pt-16 lg:pt-0">
                <header className="sticky top-0 z-30 bg-white/80 border-b border-gray-100">
                    <div className="max-w-6xl mx-auto px-6 py-6 lg:py-8 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100" />
                        <div>
                            <div className="w-44 h-7 rounded bg-gray-100 mb-2" />
                            <div className="w-20 h-4 rounded bg-gray-100" />
                        </div>
                    </div>
                </header>
                <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                                <div className="aspect-[3/4] bg-gray-100" />
                                <div className="p-4 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-4 bg-gray-100 rounded w-4/5" />
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
