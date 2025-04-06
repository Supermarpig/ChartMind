'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChartData } from '@/types/chart';
import { ExcelProcessor } from '@/lib/data/excel';

interface DataPreviewProps {
  data: ChartData;
  onDownload?: () => void;
}

export const DataPreview = ({ data, onDownload }: DataPreviewProps) => {
  const previewData = ExcelProcessor.generatePreview(data);

  const handleDownload = () => {
    ExcelProcessor.downloadExcel(data);
    onDownload?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">數據預覽</h3>
        <Button onClick={handleDownload}>
          下載 Excel
        </Button>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {previewData[0].map((header, index) => (
                <TableHead key={index}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.slice(1).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <p className="text-sm text-gray-500">
        顯示前 5 筆數據，完整數據請下載 Excel 檔案查看
      </p>
    </div>
  );
}; 