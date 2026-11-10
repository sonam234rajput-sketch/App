import React, { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Video, Music, CheckCircle2, Layers } from 'lucide-react';

export interface FileAttachment {
  base64: string;
  mimeType: string;
  name: string;
  size?: number;
}

interface FileUploadBoxProps {
  attachment?: FileAttachment | null;
  attachments?: FileAttachment[];
  onFileSelect?: (attachment: FileAttachment | null) => void;
  onFilesChange?: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export const FileUploadBox: React.FC<FileUploadBoxProps> = ({
  attachment,
  attachments = [],
  onFileSelect,
  onFilesChange,
  maxFiles = 20,
  accept = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.md",
  label = "Upload Photos / Gallery (Up to 20), Video, PDF or Document",
  hint = "AI will analyze all uploaded files together (Vision, OCR, formulas & text)",
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize current files array
  const currentFiles: FileAttachment[] = onFilesChange
    ? attachments
    : attachment
    ? [attachment]
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const limit = Math.min(files.length, maxFiles - currentFiles.length);
    const selectedBatch = files.slice(0, limit);
    const newAttachments: FileAttachment[] = [];

    let processedCount = 0;
    selectedBatch.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;

        let mimeType = file.type;
        const lowerName = file.name.toLowerCase();

        if (!mimeType) {
          if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (lowerName.endsWith('.mp4')) mimeType = 'video/mp4';
          else if (lowerName.endsWith('.webm')) mimeType = 'video/webm';
          else if (lowerName.endsWith('.mov')) mimeType = 'video/quicktime';
          else if (lowerName.endsWith('.mp3')) mimeType = 'audio/mp3';
          else if (lowerName.endsWith('.wav')) mimeType = 'audio/wav';
          else if (lowerName.endsWith('.png')) mimeType = 'image/png';
          else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (lowerName.endsWith('.txt')) mimeType = 'text/plain';
          else if (lowerName.endsWith('.csv')) mimeType = 'text/csv';
          else mimeType = 'application/octet-stream';
        }

        newAttachments.push({
          base64,
          mimeType,
          name: file.name,
          size: file.size
        });

        processedCount++;
        if (processedCount === selectedBatch.length) {
          if (onFilesChange) {
            onFilesChange([...currentFiles, ...newAttachments]);
          } else if (onFileSelect) {
            onFileSelect(newAttachments[0] || null);
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFileAt = (index: number) => {
    if (onFilesChange) {
      const updated = currentFiles.filter((_, i) => i !== index);
      onFilesChange(updated);
    } else if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const clearAll = () => {
    if (onFilesChange) onFilesChange([]);
    if (onFileSelect) onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileBadge = (mimeType: string, name: string) => {
    const lowerName = name.toLowerCase();
    if (mimeType.startsWith('image/') || lowerName.match(/\.(jpg|jpeg|png|webp|gif|heic)$/)) {
      return { icon: ImageIcon, text: 'Photo', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
    if (mimeType.startsWith('video/') || lowerName.match(/\.(mp4|webm|mov|avi)$/)) {
      return { icon: Video, text: 'Video', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
    }
    if (mimeType.startsWith('audio/') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/)) {
      return { icon: Music, text: 'Audio', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    }
    if (mimeType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return { icon: FileText, text: 'PDF', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
    }
    return { icon: FileText, text: 'Doc', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={onFilesChange ? true : false}
        className="hidden"
      />

      {currentFiles.length > 0 ? (
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Attached Files ({currentFiles.length}/{maxFiles})
            </span>
            <div className="flex items-center gap-2">
              {currentFiles.length < maxFiles && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add More
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-red-500 hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
            {currentFiles.map((file, idx) => {
              const badge = getFileBadge(file.mimeType, file.name);
              return (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.mimeType.startsWith('image/') ? (
                      <img
                        src={`data:${file.mimeType};base64,${file.base64}`}
                        alt={file.name}
                        className="w-8 h-8 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center shrink-0">
                        {React.createElement(badge.icon, { className: "w-4 h-4 text-indigo-600 dark:text-indigo-400" })}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-1">
                        <span>{badge.text}</span>
                        {file.size && <span>• {formatFileSize(file.size)}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFileAt(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 border-t border-indigo-100 dark:border-indigo-900/60 pt-2">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>AI Multimodal Processing Active for all {currentFiles.length} uploaded files</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/30 font-semibold text-xs text-indigo-700 dark:text-indigo-300 flex flex-col items-center justify-center gap-1 transition-all group"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>{label}</span>
          </div>
          {hint && <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{hint}</span>}
        </button>
      )}
    </div>
  );
};
