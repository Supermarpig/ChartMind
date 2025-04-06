export interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // 以 bytes 為單位
}

export interface ImagePreviewProps {
  imageUrl: string;
  alt?: string;
  className?: string;
}

export interface ImageData {
  file: File;
  url: string;
  width: number;
  height: number;
} 