import AnimatedLoadingSkeleton from "@/components/ui/animated-loading-skeleton";

// Wird beim Laden / bei Navigationen mit Suspense angezeigt — gilt für alle Routen,
// die kein eigenes loading.tsx haben.
export default function Loading() {
  return (
    <main className="px-5 pt-32 pb-24 sm:pt-40">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 space-y-3 text-center">
          <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-surface-2" />
          <div className="mx-auto h-9 w-2/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="mx-auto h-4 w-1/2 animate-pulse rounded-full bg-surface-2" />
        </div>
        <AnimatedLoadingSkeleton />
      </div>
    </main>
  );
}
