// src/components/diagnostics/InvestigationImportExport.tsx
import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDiagnostics } from '@/hooks/useDiagnostics';

// ─── Types ─────────────────────────────────────────────────────────────────

type ImportStep = 'idle' | 'preview' | 'importing' | 'done';

interface PreviewData {
  session_key: string;
  file_format: string;
  columns: string[];
  sample_rows: Record<string, any>[];
  mapping_suggestions: Record<string, string>;
  importable_fields: Record<string, { label: string; description: string }>;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  total_rows: number;
  errors: string[];
}

interface ExportState {
  open: boolean;
  format: 'xlsx' | 'csv';
  category: string;
  isExporting: boolean;
  progress: number;
}

// ─── Export Dialog ──────────────────────────────────────────────────────────

const EXPORT_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'haematology', label: 'Haematology' },
  { value: 'clinical_chemistry', label: 'Clinical Chemistry' },
  { value: 'biochemistry', label: 'Biochemistry' },
  { value: 'microbiology', label: 'Microbiology' },
  { value: 'serology', label: 'Serology' },
  { value: 'immunology', label: 'Immunology' },
  { value: 'histopathology', label: 'Histopathology' },
  { value: 'cytology', label: 'Cytology' },
  { value: 'genetics', label: 'Genetics' },
  { value: 'molecular_biology', label: 'Molecular Biology' },
  { value: 'blood_bank', label: 'Blood Bank' },
  { value: 'toxicology', label: 'Toxicology' },
  { value: 'endocrinology', label: 'Endocrinology' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'mri', label: 'MRI' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'ecg', label: 'ECG' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'other', label: 'Other' },
];

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const { exportInvestigations, getImportStatus, downloadExport } = useDiagnostics();
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [category, setCategory] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    try {
      const params: any = { format };
      if (category) params.category = category;

      const data = await exportInvestigations(params);
      const taskId = data.task_id;

      // Poll status
      while (true) {
        const status = await getImportStatus(taskId);
        setProgress(status.progress ?? 0);
        if (status.status === 'completed') break;
        if (status.status === 'failed') throw new Error(status.error || 'Export failed');
        await new Promise((r) => setTimeout(r, 2500));
      }

      // Download file
      const blob = await downloadExport(taskId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigations_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export downloaded successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Investigations</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as 'xlsx' | 'csv')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category (optional)</Label>
            <Select value={category || '__all__'} onValueChange={(v) => setCategory(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value || '__all__'} value={c.value || '__all__'}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isExporting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exporting…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Import Dialog ──────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onDone }) => {
  const { previewImport, startImport, getImportStatus, downloadImportTemplate } = useDiagnostics();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('idle');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const reset = () => {
    setStep('idle');
    setPreview(null);
    setMapping({});
    setProgress(0);
    setResult(null);
    setImportError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const data: PreviewData = await previewImport(file, format);
      setPreview(data);
      // Pre-fill mapping from suggestions
      const initial: Record<string, string> = {};
      Object.keys(data.importable_fields).forEach((field) => {
        initial[field] = data.mapping_suggestions[field] || '';
      });
      setMapping(initial);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to read file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartImport = async () => {
    if (!preview) return;
    // Validate at least name or code is mapped
    if (!mapping.name && !mapping.code) {
      toast.error('You must map at least "Test Name" or "Code"');
      return;
    }
    // Build field_mapping (only filled entries)
    const field_mapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([k, v]) => {
      if (v) field_mapping[k] = v;
    });

    setStep('importing');
    setProgress(0);
    setImportError(null);
    try {
      const data = await startImport({
        session_key: preview.session_key,
        file_format: preview.file_format,
        field_mapping,
        skip_duplicates: skipDuplicates,
        update_existing: updateExisting,
      });
      const taskId = data.task_id;

      // Poll
      while (true) {
        const status = await getImportStatus(taskId);
        setProgress(status.progress ?? 0);
        if (status.status === 'completed') {
          setResult(status.result);
          setStep('done');
          onDone();
          break;
        }
        if (status.status === 'failed') {
          setImportError(status.error || 'Import failed');
          setStep('done');
          break;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    } catch (err: any) {
      setImportError(err?.response?.data?.error || err.message || 'Import failed');
      setStep('done');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Investigations</DialogTitle>
        </DialogHeader>

        {/* ── Step 1: File selection ── */}
        {step === 'idle' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">File Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'xlsx' | 'csv')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <input
                ref={fileRef}
                type="file"
                accept={format === 'xlsx' ? '.xlsx' : '.csv'}
                onChange={handleFileChange}
                disabled={isLoading}
                className="block w-full text-sm text-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer"
              />
            </div>
            {isLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">Reading file…</p>
            )}
            <div className="flex justify-between items-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={downloadImportTemplate}
              >
                <FileText className="h-3 w-3 mr-1" />
                Download Template
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping ── */}
        {step === 'preview' && preview && (
          <div className="space-y-4 pt-2">
            {/* Sample rows */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                File Preview ({preview.columns.length} columns detected)
              </p>
              <div className="overflow-x-auto rounded border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      {preview.columns.map((col) => (
                        <th key={col} className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t">
                        {preview.columns.map((col) => (
                          <td key={col} className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{String(row[col] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping table */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Column Mapping</p>
              <div className="rounded border divide-y text-sm">
                {Object.entries(preview.importable_fields).map(([field, meta]) => (
                  <div key={field} className="grid grid-cols-2 gap-3 px-3 py-2 items-center">
                    <div>
                      <span className="font-medium text-xs">{meta.label}</span>
                      {(field === 'name' || field === 'code') && (
                        <span className="text-destructive ml-0.5 text-xs">*</span>
                      )}
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{meta.description}</p>
                    </div>
                    <select
                      value={mapping[field] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                      className="w-full h-8 px-2 text-xs border border-input bg-background rounded-md"
                    >
                      <option value="">— not mapped —</option>
                      {preview.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Skip duplicates
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Update existing
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { reset(); }}>
                Back
              </Button>
              <Button size="sm" onClick={handleStartImport}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Progress ── */}
        {step === 'importing' && (
          <div className="space-y-4 pt-4 pb-2">
            <p className="text-sm text-center text-muted-foreground">
              Import running in background — you can leave this open or close it.
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === 'done' && (
          <div className="space-y-4 pt-2">
            {importError ? (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{importError}</p>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Import completed
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="text-lg font-bold text-green-600">{result.imported}</div>
                    <div className="text-xs text-muted-foreground">Imported</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="text-lg font-bold text-yellow-600">{result.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="text-lg font-bold">{result.total_rows}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Warnings / Errors</p>
                    <div className="rounded border bg-muted/30 p-2 max-h-32 overflow-y-auto space-y-0.5">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { reset(); }}>
                Import Another
              </Button>
              <Button size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main exported component ────────────────────────────────────────────────

interface InvestigationImportExportProps {
  onImportDone: () => void;
}

export const InvestigationImportExport: React.FC<InvestigationImportExportProps> = ({ onImportDone }) => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setImportOpen(true)}>
        <Upload className="h-3.5 w-3.5 mr-1" />
        Import
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setExportOpen(true)}>
        <Download className="h-3.5 w-3.5 mr-1" />
        Export
      </Button>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={onImportDone}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </>
  );
};

export default InvestigationImportExport;
