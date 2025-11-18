/**
 * LoadingTable - Skeleton table for data tables
 * 
 * Displays a loading skeleton for table data.
 * 
 * @component
 * @example
 * <LoadingTable columns={5} rows={10} />
 */

interface LoadingTableProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

export default function LoadingTable({
  columns = 5,
  rows = 10,
  showHeader = true,
}: LoadingTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {showHeader && (
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                className="h-4 flex-1 bg-muted-foreground/20 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-4 flex-1 bg-muted-foreground/10 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

