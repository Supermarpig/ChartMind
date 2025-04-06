import { ChartData, ProcessedImage } from './chart';
import { ImageData } from './image';

export interface AppState {
  // 圖片相關狀態
  originalImage: ImageData | null;
  processedImage: ProcessedImage | null;
  isProcessing: boolean;
  
  // 數據相關狀態
  chartData: ChartData | null;
  isExporting: boolean;
  
  // 錯誤處理
  error: string | null;
}

export type AppAction =
  | { type: 'SET_ORIGINAL_IMAGE'; payload: ImageData }
  | { type: 'SET_PROCESSED_IMAGE'; payload: ProcessedImage }
  | { type: 'SET_CHART_DATA'; payload: ChartData }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' }; 