import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

type BulkImportModalProps = {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BulkImportModal({ eventId, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setProcessing(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n').filter(line => line.trim());
        const rows = lines.slice(1); // Skip header

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
          const [email, companyName, industry, website] = row.split(',').map(s => s.trim());

          if (!email || !companyName) {
            failedCount++;
            errors.push(`Missing required fields for: ${email || companyName || 'unknown'}`);
            continue;
          }

          try {
            const { error } = await supabase.rpc('quick_invite_company', {
              p_email: email,
              p_company_name: companyName,
              p_event_id: eventId,
              p_industry: industry || 'Other',
              p_website: website || undefined
            });

            if (error) throw error;
            successCount++;
          } catch (err) {
            failedCount++;
            errors.push(`${companyName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        setResults({ success: successCount, failed: failedCount, errors });
        if (successCount > 0) {
          onSuccess();
        }
      } catch (err) {
        console.error('Import error:', err);
        setResults({ success: 0, failed: 1, errors: ['Failed to read CSV file'] });
      } finally {
        setProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Bulk Import Companies</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">CSV Format Required:</h3>
            <code className="text-sm text-muted-foreground block">
              Email,Company Name,Industry,Website
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              Example: company@example.com,Acme Corp,Technology,https://acme.com
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:text-sm file:font-medium file:bg-muted hover:file:bg-muted/80 file:cursor-pointer"
            />
          </div>

          {/* Results */}
          {results && (
            <div className="mb-6 space-y-3">
              {results.success > 0 && (
                <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-success">Successfully imported {results.success} companies</p>
                  </div>
                </div>
              )}
              {results.failed > 0 && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive mb-2">Failed to import {results.failed} companies</p>
                    {results.errors.length > 0 && (
                      <div className="text-sm text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
                        {results.errors.map((error, idx) => (
                          <p key={idx}>• {error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!file || processing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import CSV</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              {results ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
