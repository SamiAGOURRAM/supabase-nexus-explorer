/**
 * PermissionDenied - Permission denied component
 * 
 * Displays a message when user doesn't have permission to access a resource.
 * 
 * @component
 * @example
 * <PermissionDenied />
 */

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PermissionDeniedProps {
  message?: string;
  backTo?: string;
}

export default function PermissionDenied({
  message = "You don't have permission to access this resource.",
  backTo = '/',
}: PermissionDeniedProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md">
        <ShieldAlert className="w-16 h-16 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </Link>
      </div>
    </div>
  );
}

