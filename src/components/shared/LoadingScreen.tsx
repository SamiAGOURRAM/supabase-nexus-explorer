/**
 * LoadingScreen - Reusable loading component
 * 
 * Displays a centered loading spinner with optional message.
 * Used throughout the application for async operations.
 * 
 * @component
 * @example
 * <LoadingScreen />
 * <LoadingScreen message="Loading dashboard..." />
 */
export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}



