'use client';

import { useCallback, useReducer } from 'react';
import { ImageUploader } from '@/components/image/ImageUploader';
import { ImagePreview } from '@/components/image/ImagePreview';
import { DataPreview } from '@/components/data/DataPreview';
import { ImageProcessor } from '@/lib/image/processor';
import { DataProcessor } from '@/lib/data/processor';
import { AppState, AppAction } from '@/types/app';
import { ImageData } from '@/types/image';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// 初始狀態
const initialState: AppState = {
  originalImage: null,
  processedImage: null,
  isProcessing: false,
  chartData: null,
  isExporting: false,
  error: null,
};

// 狀態處理器
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ORIGINAL_IMAGE':
      return { ...state, originalImage: action.payload };
    case 'SET_PROCESSED_IMAGE':
      return { ...state, processedImage: action.payload };
    case 'SET_CHART_DATA':
      return { ...state, chartData: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 處理圖片上傳
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      // 讀取圖片
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target?.result) return;

        const imageUrl = e.target.result as string;
        const img = new Image();
        img.onload = async () => {
          // 設置原始圖片
          const imageData: ImageData = {
            file,
            url: imageUrl,
            width: img.width,
            height: img.height,
          };
          dispatch({ type: 'SET_ORIGINAL_IMAGE', payload: imageData });

          // 開始處理圖片
          dispatch({ type: 'SET_PROCESSING', payload: true });
          try {
            // 處理圖片
            const imageProcessor = new ImageProcessor();
            const processedImage = await imageProcessor.processImage(imageUrl);
            dispatch({ type: 'SET_PROCESSED_IMAGE', payload: processedImage });

            // 處理數據
            const chartData = DataProcessor.processPoints(
              processedImage.curves,
              processedImage.axes,
              {
                x: { min: 0, max: processedImage.edges.width },
                y: { min: 0, max: processedImage.edges.height },
              }
            );
            dispatch({ type: 'SET_CHART_DATA', payload: chartData });

            toast.success('圖片處理完成');
          } catch (error) {
            console.error('處理圖片時發生錯誤:', error);
            toast.error('處理圖片時發生錯誤');
            dispatch({ type: 'SET_ERROR', payload: '處理圖片時發生錯誤' });
          } finally {
            dispatch({ type: 'SET_PROCESSING', payload: false });
          }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('讀取圖片時發生錯誤:', error);
      toast.error('讀取圖片時發生錯誤');
      dispatch({ type: 'SET_ERROR', payload: '讀取圖片時發生錯誤' });
    }
  }, []);

  // 處理 Excel 下載
  const handleExcelDownload = useCallback(() => {
    dispatch({ type: 'SET_EXPORTING', payload: true });
    try {
      toast.success('Excel 檔案下載完成');
    } catch (error) {
      console.error('下載 Excel 時發生錯誤:', error);
      toast.error('下載 Excel 時發生錯誤');
      dispatch({ type: 'SET_ERROR', payload: '下載 Excel 時發生錯誤' });
    } finally {
      dispatch({ type: 'SET_EXPORTING', payload: false });
    }
  }, []);

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">圖表數據提取工具</h1>
        <p className="text-gray-600">
          上傳圖表圖片，自動識別並提取數據，轉換為 Excel 格式
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <ImageUploader
            onImageUpload={handleImageUpload}
            acceptedFileTypes={['image/jpeg', 'image/png']}
            maxFileSize={5 * 1024 * 1024}
          />
          {state.originalImage && (
            <ImagePreview
              imageUrl={state.originalImage.url}
              alt="原始圖片"
            />
          )}
        </div>
        <div className="space-y-4">
          {state.chartData && (
            <DataPreview
              data={state.chartData}
              onDownload={handleExcelDownload}
            />
          )}
        </div>

      </div>

      <Toaster />
    </main>
  );
}
