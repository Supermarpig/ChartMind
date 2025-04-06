'use client';

import { ProcessedImage, ChartProcessingOptions, Point } from '@/types/chart';
import { CVMat, CV } from '@/types/opencv';

declare global {
  interface Window {
    cv: CV;
  }
}

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<ChartProcessingOptions>;

  constructor(options?: ChartProcessingOptions) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.options = {
      threshold: options?.threshold ?? 128,
      smoothing: options?.smoothing ?? 0.5,
      sampleRate: options?.sampleRate ?? 1,
      axisDetectionMode: options?.axisDetectionMode ?? 'auto',
    };
  }

  /**
   * 等待 OpenCV 載入完成
   */
  private waitForOpenCV(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.cv) {
        resolve();
        return;
      }

      // 檢查是否已經有 script 標籤
      const script = document.getElementById('opencv-script');
      if (!script) {
        reject(new Error('OpenCV script not found'));
        return;
      }

      // 等待 OpenCV.js 載入完成
      const checkInterval = setInterval(() => {
        if (window.cv) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // 設置超時
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('OpenCV load timeout'));
      }, 30000); // 30 秒超時
    });
  }

  /**
   * 載入圖片到 Canvas
   */
  private async loadImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * 預處理圖像
   */
  private preprocess(src: CVMat): CVMat {
    const processed = new window.cv.Mat();
    
    // 轉換為灰度圖
    window.cv.cvtColor(src, processed, window.cv.COLOR_RGBA2GRAY);
    
    // 高斯模糊去噪
    window.cv.GaussianBlur(processed, processed, new window.cv.Size(5, 5), 0);
    
    // 二值化
    window.cv.threshold(processed, processed, this.options.threshold, 255, window.cv.THRESH_BINARY);
    
    return processed;
  }

  /**
   * 檢測座標軸
   */
  private detectAxes(src: CVMat): { x: Point[]; y: Point[] } {
    const processed = this.preprocess(src);
    const lines = new window.cv.Mat();
    
    // 使用霍夫變換檢測直線
    window.cv.HoughLinesP(
      processed,
      lines,
      1,                // rho
      Math.PI / 180,    // theta
      100,             // threshold
      100,             // minLineLength
      10               // maxLineGap
    );

    const xAxisPoints: Point[] = [];
    const yAxisPoints: Point[] = [];
    const height = processed.rows;
    const width = processed.cols;

    // 分析直線，找出最可能的座標軸
    for (let i = 0; i < lines.rows; i++) {
      const [x1, y1, x2, y2] = lines.data32S.slice(i * 4, (i + 1) * 4);
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

      // 水平線（X軸）- 在圖像下半部且較長的線
      if (Math.abs(angle) < 5 && y1 > height * 0.5 && length > width * 0.3) {
        xAxisPoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
      }
      // 垂直線（Y軸）- 在圖像左側且較長的線
      else if (Math.abs(angle - 90) < 5 && x1 < width * 0.2 && length > height * 0.3) {
        yAxisPoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
      }
    }

    processed.delete();
    lines.delete();

    // 如果沒有找到足夠的點，使用圖像邊界
    if (xAxisPoints.length < 2) {
      xAxisPoints.push(
        { x: 0, y: height - 20 },
        { x: width, y: height - 20 }
      );
    }
    if (yAxisPoints.length < 2) {
      yAxisPoints.push(
        { x: 20, y: 0 },
        { x: 20, y: height }
      );
    }

    return { x: xAxisPoints, y: yAxisPoints };
  }

  /**
   * 檢測曲線
   */
  private detectCurve(src: CVMat): Point[] {
    const processed = this.preprocess(src);
    const contours = new window.cv.MatVector();
    const hierarchy = new window.cv.Mat();
    
    // 找出所有輪廓
    window.cv.findContours(
      processed,
      contours,
      hierarchy,
      window.cv.RETR_LIST,
      window.cv.CHAIN_APPROX_SIMPLE
    );

    const points: Point[] = [];
    let maxArea = 0;
    let maxContourIdx = -1;

    // 找出最大的非矩形輪廓（可能是曲線）
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = window.cv.contourArea(contour);
      const perimeter = window.cv.arcLength(contour, true);
      
      // 計算形狀因子（圓形度）
      const circularity = 4 * Math.PI * area / (perimeter * perimeter);
      
      // 排除接近矩形的輪廓（可能是圖表邊框）
      if (area > maxArea && circularity < 0.8) {
        maxArea = area;
        maxContourIdx = i;
      }
    }

    // 提取曲線點
    if (maxContourIdx !== -1) {
      const contour = contours.get(maxContourIdx);
      const step = Math.max(1, Math.floor(contour.data32S.length / (2 * this.options.sampleRate)));
      
      for (let i = 0; i < contour.data32S.length; i += step * 2) {
        points.push({
          x: contour.data32S[i],
          y: contour.data32S[i + 1]
        });
      }

      // 按 x 座標排序
      points.sort((a, b) => a.x - b.x);
    }

    processed.delete();
    contours.delete();
    hierarchy.delete();

    return points;
  }

  /**
   * 處理圖片
   */
  public async processImage(imageUrl: string): Promise<ProcessedImage> {
    try {
      // 等待 OpenCV 載入
      await this.waitForOpenCV();
      
      // 載入圖片
      await this.loadImage(imageUrl);

      // 將 Canvas 圖像轉換為 OpenCV 格式
      const src = window.cv.imread(this.canvas);
      
      // 檢測座標軸
      const { x: xAxisPoints, y: yAxisPoints } = this.detectAxes(src);
      
      // 檢測曲線
      const curvePoints = this.detectCurve(src);

      // 清理記憶體
      src.delete();

      // 計算座標軸範圍
      const xAxis = {
        min: Math.min(...xAxisPoints.map(p => p.x)),
        max: Math.max(...xAxisPoints.map(p => p.x)),
        scale: 1
      };

      const yAxis = {
        min: Math.min(...yAxisPoints.map(p => p.y)),
        max: Math.max(...yAxisPoints.map(p => p.y)),
        scale: 1
      };

      // 返回處理結果
      return {
        edges: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
        axes: {
          x: xAxis,
          y: yAxis
        },
        curves: curvePoints
      };
    } catch (error) {
      console.error('圖片處理錯誤:', error);
      throw error;
    }
  }
} 