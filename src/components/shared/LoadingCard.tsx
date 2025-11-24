/**
 * LoadingCard - Skeleton card for dashboard stats
 * 
 * Displays a loading skeleton for dashboard stat cards.
 * 
 * @component
 * @example
 * <LoadingCard />
 */

export default function LoadingCard() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
      <div className="h-8 w-8 bg-muted rounded-lg mb-4" />
      <div className="h-8 w-20 bg-muted rounded mb-2" />
      <div className="h-4 w-32 bg-muted rounded" />
    </div>
  );
}

