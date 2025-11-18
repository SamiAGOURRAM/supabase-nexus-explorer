/**
 * NotFound - Resource not found component
 * 
 * Displays a message when a requested resource is not found.
 * 
 * @component
 * @example
 * <NotFound resource="Student" />
 */

import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NotFoundProps {
  resource?: string;
  backTo?: string;
  backLabel?: string;
}

export default function NotFound({
  resource = 'Resource',
  backTo = '/',
  backLabel = 'Go Home',
}: NotFoundProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {resource} Not Found
        </h2>
        <p className="text-muted-foreground mb-6">
          The {resource.toLowerCase()} you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

