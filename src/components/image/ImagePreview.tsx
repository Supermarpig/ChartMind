'use client';

import { Card } from '@/components/ui/card';
import { ImagePreviewProps } from '@/types/image';
import Image from 'next/image';

export const ImagePreview = ({
  imageUrl,
  alt = '預覽圖片',
  className = '',
}: ImagePreviewProps) => {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="relative aspect-video w-full">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </Card>
  );
}; 