'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface SvgUploadDialogProps {
  buildingId: string;
  buildingName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function SvgUploadDialog({
  buildingId,
  buildingName,
  open,
  onOpenChange,
  onUploadSuccess,
}: SvgUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
      setError('Please select a valid SVG file');
      setSelectedFile(null);
      setSvgPreview(null);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      setSelectedFile(null);
      setSvgPreview(null);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Read and preview SVG
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Basic SVG validation
      if (!content.includes('<svg') || !content.includes('</svg>')) {
        setError('Invalid SVG file format');
        setSelectedFile(null);
        setSvgPreview(null);
        return;
      }

      setSvgPreview(content);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !svgPreview) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/buildings/${buildingId}/svg-map`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ svgMapData: svgPreview }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload SVG');
      }

      toast({
        title: 'Success',
        description: 'Floor plan uploaded successfully',
      });

      onUploadSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      toast({
        title: 'Error',
        description: 'Failed to upload floor plan',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSvgPreview(null);
    setError(null);
    onOpenChange(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const syntheticEvent = {
        target: { files: [file] },
      } as any;
      handleFileSelect(syntheticEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Floor Plan</DialogTitle>
          <DialogDescription>
            Upload an SVG floor plan for {buildingName}. Make sure apartment elements have{' '}
            <code className="text-xs bg-muted px-1 rounded">data-apartment-id</code> or{' '}
            <code className="text-xs bg-muted px-1 rounded">id</code> attributes matching your
            apartment records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          {!svgPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-dashed rounded-lg p-8 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              
              <h3 className="font-medium mb-2">Choose SVG file or drag & drop</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Maximum file size: 2MB
              </p>
              
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </motion.div>
          )}

          {/* SVG Preview */}
          <AnimatePresence>
            {svgPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{selectedFile?.name}</span>
                    <span className="text-muted-foreground">
                      ({(selectedFile?.size || 0 / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setSvgPreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-muted/20 max-h-[400px] overflow-auto">
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Tip:</strong> Ensure SVG elements have{' '}
                    <code className="bg-background px-1 rounded">data-apartment-id="apt-101"</code>{' '}
                    attributes to link them with apartment data. The ID should match the{' '}
                    <code className="bg-background px-1 rounded">svgElementId</code> field in your
                    apartment records.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!svgPreview || isUploading}>
            {isUploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mr-2"
                >
                  <Upload className="h-4 w-4" />
                </motion.div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Floor Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
