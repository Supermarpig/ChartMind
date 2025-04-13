export interface Point {
  x: number;
  y: number;
}

export interface Axis {
  min: number;
  max: number;
  scale: number;
  unit: string;
  label: string;
  gridLines?: number[];    // 網格線位置
  isYAxis?: boolean;
  format?: (value: number) => string;  // 數值格式化函數
}

export interface ChartData {
  xAxis: Axis;
  yAxis: Axis;
  points: Point[];
  series?: {              // 支援多條曲線
    name: string;
    points: Point[];
    color?: string;
  }[];
}

export interface ProcessedImage {
  edges: ImageData;
  axes: {
    x: Axis;
    y: Axis;
  };
  curves: Point[];
}

export interface ChartProcessingOptions {
  threshold?: number;        // 邊緣檢測閾值
  smoothing?: number;        // 曲線平滑度
  sampleRate?: number;       // 取樣率
  axisDetectionMode?: 'auto' | 'manual';
} 