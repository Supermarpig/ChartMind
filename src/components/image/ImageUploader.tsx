'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageUploadProps } from '@/types/image';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export const ImageUploader = ({
  onImageUpload,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'],
  maxFileSize = 5 * 1024 * 1024, // 5MB
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error('不支援的檔案格式');
      return false;
    }

    if (file.size > maxFileSize) {
      toast.error('檔案大小超過限制');
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onImageUpload(file);
      }
    },
    [onImageUpload, acceptedFileTypes, maxFileSize]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onImageUpload(file);
      }
    },
    [onImageUpload, acceptedFileTypes, maxFileSize]
  );

  return (
    <>
      <Card
        className={`h-full p-4 text-center border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="text-lg font-medium">
            拖放圖片到這裡
            <span className="block text-sm text-gray-500">或</span>
          </div>
          <Button
            variant="outline"
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            選擇檔案
          </Button>
          <input
            id="fileInput"
            type="file"
            className="hidden"
            accept={acceptedFileTypes.join(',')}
            onChange={handleFileSelect}
          />
          <div className="text-sm text-gray-500">
            支援的格式：{acceptedFileTypes.join(', ')}
            <br />
            最大檔案大小：{maxFileSize / 1024 / 1024}MB
          </div>
        </div>
      </Card>
      <Toaster />
    </>
  );
}; 