/**
 * SkeletonLoader - Reusable skeleton loading component
 * 
 * Displays animated skeleton placeholders for various content types.
 * Used to provide visual feedback during data loading.
 * 
 * @component
 * @example
 * <SkeletonLoader type="card" />
 * <SkeletonLoader type="list" count={5} />
 * <SkeletonLoader type="table" rows={10} />
 */

type SkeletonType = 'card' | 'list' | 'table' | 'text' | 'avatar' | 'button';

interface SkeletonLoaderProps {
  type?: SkeletonType;
  count?: number;
  rows?: number;
  className?: string;
  width?: string;
  height?: string;
}

export default function SkeletonLoader({
  type = 'text',
  count = 1,
  rows = 3,
  className = '',
  width,
  height,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-muted rounded';

  if (type === 'card') {
    return (
      <div className={`${baseClasses} p-6 ${className}`}>
        <div className="h-4 w-1/3 bg-muted-foreground/20 rounded mb-4" />
        <div className="h-6 w-2/3 bg-muted-foreground/20 rounded mb-2" />
        <div className="h-4 w-full bg-muted-foreground/20 rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${baseClasses} p-4 mb-3`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted-foreground/20 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-1/3 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-3 w-2/3 bg-muted-foreground/20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={className}>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className={`${baseClasses} h-10 flex-1 bg-muted-foreground/20`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div
        className={`${baseClasses} rounded-full bg-muted-foreground/20 ${className}`}
        style={{ width: width || '40px', height: height || '40px' }}
      />
    );
  }

  if (type === 'button') {
    return (
      <div
        className={`${baseClasses} h-10 bg-muted-foreground/20 ${className}`}
        style={{ width: width || '100px' }}
      />
    );
  }

  // Default: text
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} h-4 mb-2 bg-muted-foreground/20`}
          style={{
            width: width || (i === count - 1 ? '75%' : '100%'),
            height: height || '1rem',
          }}
        />
      ))}
    </div>
  );
}

