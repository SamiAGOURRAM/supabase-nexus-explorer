/**
 * File Upload Component
 * 
 * Provides a drag-and-drop interface for uploading files (resumes, etc.)
 */

import { useState, useRef } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  currentFileUrl?: string | null;
  currentFileName?: string | null;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  label?: string;
  error?: string;
  accept?: string;
}

export default function FileUpload({
  currentFileUrl,
  currentFileName,
  onFileSelect,
  onFileRemove,
  maxSizeMB = 10,
  acceptedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  label = 'Resume',
  error,
  accept = '.pdf,.doc,.docx'
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`);
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const displayName = selectedFile?.name || currentFileName || 'No file selected';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
          ${error ? 'border-destructive' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {(selectedFile || currentFileUrl) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="font-medium">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-destructive hover:underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p>Drag and drop a file here, or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline font-medium"
              >
                browse
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Max size: {maxSizeMB}MB. Accepted: {acceptedTypes.map(t => {
                if (t.includes('pdf')) return 'PDF';
                if (t.includes('msword')) return 'DOC';
                if (t.includes('wordprocessingml')) return 'DOCX';
                return t.split('/')[1];
              }).join(', ')}
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

