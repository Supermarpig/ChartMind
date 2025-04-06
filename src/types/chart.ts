export interface Point {
  x: number;
  y: number;
}

export interface Axis {
  min: number;
  max: number;
  scale: number;
  unit?: string;
}

export interface ChartData {
  xAxis: Axis;
  yAxis: Axis;
  points: Point[];
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