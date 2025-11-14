import { Link } from 'react-router-dom';
import { LucideIcon, ChevronRight } from 'lucide-react';

/**
 * EventStatsCard - Individual statistics card component
 * 
 * Displays a single statistic with icon, value, label, and optional link.
 * Used in the stats grid on the admin dashboard.
 * 
 * @component
 * @param icon - Lucide icon component
 * @param value - Statistic value to display
 * @param label - Main label for the statistic
 * @param sublabel - Optional sublabel/description
 * @param iconColor - Tailwind color class for icon background
 * @param href - Optional link URL (makes card clickable)
 * 
 * @example
 * <EventStatsCard 
 *   icon={Building2} 
 *   value={10} 
 *   label="Companies" 
 *   sublabel="participating"
 *   iconColor="bg-success/10 text-success"
 *   href="/admin/events/123/companies"
 * />
 */
export default function EventStatsCard({
  icon: Icon,
  value,
  label,
  sublabel,
  iconColor = 'bg-primary/10 text-primary',
  href,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  iconColor?: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-card rounded-xl border border-border p-6 ${href ? 'hover:border-primary hover:shadow-lg transition-all cursor-pointer group' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${iconColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {href && <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
      </div>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}


