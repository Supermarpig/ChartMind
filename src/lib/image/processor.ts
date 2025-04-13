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
    let bestContour: CVMat | null = null;
    let maxArea = 0;

    // 找出最可能是曲線的輪廓
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = window.cv.contourArea(contour);
      const perimeter = window.cv.arcLength(contour, false);
      
      // 優化曲線選擇條件
      // 1. 面積要在合理範圍內
      // 2. 周長與面積比要合理（避免雜訊）
      // 3. 輪廓必須足夠長（避免小段曲線）
      // 4. 選擇最大的合格輪廓
      if (area > 100 && 
          area < src.rows * src.cols * 0.5 && // 增加面積上限
          perimeter / area < 1.5 && // 放寬周長比例限制
          perimeter > src.cols * 0.3 && // 確保輪廓夠長
          area > maxArea) {
        if (bestContour) {
          bestContour.delete();
        }
        bestContour = contour;
        maxArea = area;
      } else {
        contour.delete();
      }
    }

    // 提取曲線點
    if (bestContour) {
      // 增加採樣點數以獲得更平滑的曲線
      const totalPoints = 200;
      const step = Math.max(1, Math.floor(bestContour.data32S.length / (2 * totalPoints)));
      
      for (let i = 0; i < bestContour.data32S.length; i += step * 2) {
        points.push({
          x: bestContour.data32S[i],
          y: bestContour.data32S[i + 1]
        });
      }

      bestContour.delete();
      processed.delete();
      contours.delete();
      hierarchy.delete();

      // 移除明顯的異常值
      const sortedPoints = points.sort((a, b) => a.x - b.x);
      const filteredPoints = sortedPoints.filter((point, index, array) => {
        if (index === 0 || index === array.length - 1) return true;
        
        const prev = array[index - 1];
        const next = array[index + 1];
        
        // 檢查點的y值是否與相鄰點差異過大
        const avgY = (prev.y + next.y) / 2;
        return Math.abs(point.y - avgY) < Math.abs(next.y - prev.y);
      });

      return filteredPoints;
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
      await this.waitForOpenCV();
      await this.loadImage(imageUrl);
      const src = window.cv.imread(this.canvas);
      const { x: xAxisPoints, y: yAxisPoints } = this.detectAxes(src);
      const curvePoints = this.detectCurve(src);
      src.delete();

      // 計算實際的圖表範圍
      const xMin = Math.min(...xAxisPoints.map(p => p.x));
      const xMax = Math.max(...xAxisPoints.map(p => p.x));
      const yMin = Math.min(...yAxisPoints.map(p => p.y));
      const yMax = Math.max(...yAxisPoints.map(p => p.y));

      // 設定圖表的實際刻度範圍（根據圖片上的實際刻度）
      const xAxis = {
        min: 0,
        max: 50, // CFM 的實際範圍
        scale: 1,
        unit: 'CFM',
        label: 'Airflow Rate (CFM)'
      };

      const yAxis = {
        min: 0,
        max: 10, // inAq 的實際範圍
        scale: 1,
        unit: 'inAq',
        label: 'Static Pressure (inAq)'
      };

      // 轉換座標（修正座標系統）
      const transformedPoints = curvePoints
        .map(point => {
          // 計算相對位置（0-1之間）
          const xRatio = (point.x - xMin) / (xMax - xMin);
          const yRatio = (point.y - yMin) / (yMax - yMin);
          
          // 將相對位置轉換為實際刻度值
          const x = xRatio * xAxis.max;
          const y = (1 - yRatio) * yAxis.max; // 反轉 Y 軸方向

          // 四捨五入到小數點後2位
          return {
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
          };
        })
        .filter(point => 
          point.x >= 0 && 
          point.x <= xAxis.max && 
          point.y >= 0 && 
          point.y <= yAxis.max
        )
        .sort((a, b) => a.x - b.x)
        // 移除重複或太接近的點，但使用更小的間隔
        .filter((point, index, self) => 
          index === 0 || 
          Math.abs(point.x - self[index - 1].x) >= 0.1 // 減少最小間隔
        );

      // 使用插值法增加數據點
      const interpolatedPoints: Point[] = [];
      const desiredPoints = 50; // 期望的數據點數量
      
      if (transformedPoints.length >= 2) {
        for (let i = 0; i < transformedPoints.length - 1; i++) {
          const current = transformedPoints[i];
          const next = transformedPoints[i + 1];
          
          interpolatedPoints.push(current);
          
          // 在兩點之間插入額外的點
          const gap = next.x - current.x;
          const pointsToAdd = Math.floor(gap / (xAxis.max / desiredPoints));
          
          if (pointsToAdd > 1) {
            for (let j = 1; j < pointsToAdd; j++) {
              const ratio = j / pointsToAdd;
              const x = current.x + gap * ratio;
              const y = current.y + (next.y - current.y) * ratio;
              
              interpolatedPoints.push({
                x: Math.round(x * 100) / 100,
                y: Math.round(y * 100) / 100
              });
            }
          }
        }
        
        // 添加最後一個點
        interpolatedPoints.push(transformedPoints[transformedPoints.length - 1]);
      }

      // 確保起點和終點的值正確
      if (interpolatedPoints.length > 0) {
        // 確保起點接近 Y 軸最大值
        if (interpolatedPoints[0].x < 5) {
          interpolatedPoints[0].y = yAxis.max;
        }
        
        // 確保終點接近 0
        const lastPoint = interpolatedPoints[interpolatedPoints.length - 1];
        if (lastPoint.x > xAxis.max - 5) {
          lastPoint.y = 0;
        }
      }

      return {
        edges: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
        axes: {
          x: xAxis,
          y: yAxis
        },
        curves: interpolatedPoints
      };
    } catch (error) {
      console.error('圖片處理錯誤:', error);
      throw error;
    }
  }
} 