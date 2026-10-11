import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the signed-in area while the session and data load. */
export function AppSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true" aria-label="Loading">
      <aside className="hidden w-64 shrink-0 bg-sidebar lg:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="ml-auto size-9 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
