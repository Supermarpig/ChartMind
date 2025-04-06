'use client';

import { Point, Axis, ChartData } from '@/types/chart';

export class DataProcessor {
  /**
   * 將像素座標轉換為實際數值
   */
  private static pixelToValue(
    pixel: number,
    axis: Axis,
    pixelRange: { min: number; max: number }
  ): number {
    const pixelScale = (axis.max - axis.min) / (pixelRange.max - pixelRange.min);
    return axis.min + (pixel - pixelRange.min) * pixelScale;
  }

  /**
   * 過濾和平滑化數據點
   */
  private static smoothPoints(points: Point[], windowSize: number = 3): Point[] {
    if (points.length < windowSize) return points;

    const smoothed: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const window = points.slice(
        Math.max(0, i - Math.floor(windowSize / 2)),
        Math.min(points.length, i + Math.floor(windowSize / 2) + 1)
      );

      const x = window.reduce((sum, p) => sum + p.x, 0) / window.length;
      const y = window.reduce((sum, p) => sum + p.y, 0) / window.length;
      smoothed.push({ x, y });
    }

    return smoothed;
  }

  /**
   * 移除重複和異常點
   */
  private static filterOutliers(points: Point[]): Point[] {
    // 按 x 座標排序
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const filtered: Point[] = [];
    let lastX = -Infinity;

    for (let i = 0; i < sorted.length; i++) {
      const point = sorted[i];
      
      // 移除重複的 x 座標
      if (point.x === lastX) continue;

      // 移除異常值（使用簡單的 IQR 方法）
      if (i > 0 && i < sorted.length - 1) {
        const prevY = sorted[i - 1].y;
        const nextY = sorted[i + 1].y;
        const q1 = Math.min(prevY, nextY);
        const q3 = Math.max(prevY, nextY);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        if (point.y < lowerBound || point.y > upperBound) continue;
      }

      filtered.push(point);
      lastX = point.x;
    }

    return filtered;
  }

  /**
   * 處理圖像數據點
   */
  public static processPoints(
    points: Point[],
    imageAxes: { x: Axis; y: Axis },
    pixelRanges: { x: { min: number; max: number }; y: { min: number; max: number } }
  ): ChartData {
    // 過濾異常值
    const filteredPoints = this.filterOutliers(points);

    // 平滑化數據
    const smoothedPoints = this.smoothPoints(filteredPoints);

    // 轉換座標
    const convertedPoints = smoothedPoints.map(point => ({
      x: this.pixelToValue(point.x, imageAxes.x, pixelRanges.x),
      y: this.pixelToValue(point.y, imageAxes.y, pixelRanges.y),
    }));

    // 生成圖表數據
    return {
      xAxis: imageAxes.x,
      yAxis: imageAxes.y,
      points: convertedPoints,
    };
  }

  /**
   * 驗證數據點
   */
  public static validateData(data: ChartData): boolean {
    // 檢查座標軸
    if (!data.xAxis || !data.yAxis) return false;
    if (data.xAxis.min >= data.xAxis.max || data.yAxis.min >= data.yAxis.max) return false;

    // 檢查數據點
    if (!data.points.length) return false;
    
    // 檢查數據點是否在座標範圍內
    return data.points.every(point => 
      point.x >= data.xAxis.min && 
      point.x <= data.xAxis.max && 
      point.y >= data.yAxis.min && 
      point.y <= data.yAxis.max
    );
  }
} 