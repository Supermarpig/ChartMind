'use client';

import { Point, Axis, ChartData } from '@/types/chart';

export class DataProcessor {
  /**
   * 設定預設的座標軸配置
   */
  private static setupDefaultAxes(): { x: Axis; y: Axis } {
    return {
      x: {
        min: 0,
        max: 180,
        scale: 10,
        unit: 'CFM',
        label: 'Airflow Rate (CFM)',
        gridLines: Array.from({ length: 19 }, (_, i) => i * 10),
        format: (value: number) => value.toFixed(0)
      },
      y: {
        min: 0,
        max: 10,
        scale: 1,
        unit: 'inAq',
        label: 'Static Pressure (inAq)',
        gridLines: Array.from({ length: 11 }, (_, i) => i),
        isYAxis: true,
        format: (value: number) => value.toFixed(1)
      }
    };
  }

  /**
   * 將像素座標轉換為實際數值
   */
  private static pixelToValue(
    pixel: number,
    axis: Axis,
    pixelRange: { min: number; max: number }
  ): number {
    const pixelScale = (axis.max - axis.min) / (pixelRange.max - pixelRange.min);
    // 對Y軸進行特殊處理，因為圖片座標系統中Y軸是向下增加的
    if (axis.isYAxis) {
      return axis.max - (pixel - pixelRange.min) * pixelScale;
    }
    return axis.min + (pixel - pixelRange.min) * pixelScale;
  }

  /**
   * 過濾和平滑化數據點
   */
  private static smoothPoints(points: Point[], windowSize: number = 5): Point[] {
    if (points.length < windowSize) return points;

    const smoothed: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const window = points.slice(
        Math.max(0, i - Math.floor(windowSize / 2)),
        Math.min(points.length, i + Math.floor(windowSize / 2) + 1)
      );

      // 使用加權平均，中心點權重更高
      let weightedSumX = 0;
      let weightedSumY = 0;
      let totalWeight = 0;

      window.forEach((p, index) => {
        const weight = 1 / (1 + Math.abs(index - Math.floor(window.length / 2)));
        weightedSumX += p.x * weight;
        weightedSumY += p.y * weight;
        totalWeight += weight;
      });

      smoothed.push({
        x: weightedSumX / totalWeight,
        y: weightedSumY / totalWeight
      });
    }

    return smoothed;
  }

  /**
   * 移除重複和異常點
   */
  private static filterOutliers(points: Point[]): Point[] {
    if (points.length < 3) return points;

    // 按 x 座標排序
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const filtered: Point[] = [];
    
    // 計算 y 值的統計資料
    const yValues = sorted.map(p => p.y);
    const mean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
    const stdDev = Math.sqrt(
      yValues.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / yValues.length
    );

    let lastX = -Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const point = sorted[i];
      
      // 移除重複的 x 座標（考慮誤差）
      if (Math.abs(point.x - lastX) < 0.1) continue;

      // 使用 z-score 和相鄰點檢查來移除異常值
      if (i > 0 && i < sorted.length - 1) {
        const zScore = Math.abs(point.y - mean) / stdDev;
        if (zScore > 3) {
          const prevY = sorted[i - 1].y;
          const nextY = sorted[i + 1].y;
          const expectedY = (prevY + nextY) / 2;
          
          // 如果點偏離預期值太多，則跳過
          if (Math.abs(point.y - expectedY) > Math.abs(nextY - prevY)) {
            continue;
          }
        }
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
    // 使用預設座標軸配置
    const defaultAxes = this.setupDefaultAxes();
    imageAxes = {
      x: { ...defaultAxes.x, ...imageAxes.x },
      y: { ...defaultAxes.y, ...imageAxes.y }
    };

    // 過濾異常值
    const filteredPoints = this.filterOutliers(points);

    // 平滑化數據
    const smoothedPoints = this.smoothPoints(filteredPoints, 5);

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
      series: [{
        name: 'Fan Performance',
        points: convertedPoints,
      }]
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
    const isValid = data.points.every(point => 
      point.x >= data.xAxis.min && 
      point.x <= data.xAxis.max && 
      point.y >= data.yAxis.min && 
      point.y <= data.yAxis.max
    );

    // 檢查網格線
    if (data.xAxis.gridLines && !data.xAxis.gridLines.every(line => line >= data.xAxis.min && line <= data.xAxis.max)) {
      return false;
    }
    if (data.yAxis.gridLines && !data.yAxis.gridLines.every(line => line >= data.yAxis.min && line <= data.yAxis.max)) {
      return false;
    }

    return isValid;
  }
} 