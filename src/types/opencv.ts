// 擴展 OpenCV Mat 類型
export interface CVMat {
  rows: number;
  cols: number;
  data32S: Int32Array;
  delete(): void;
}

// 擴展 OpenCV MatVector 類型
export interface CVMatVector {
  size(): number;
  get(index: number): CVMat;
  delete(): void;
}

// 擴展 OpenCV Size 類型
export interface CVSize {
  width: number;
  height: number;
}

// 擴展 OpenCV 接口
export interface CV {
  imread(canvas: HTMLCanvasElement): CVMat;
  Mat: new () => CVMat;
  MatVector: new () => CVMatVector;
  Size: new (width: number, height: number) => CVSize;
  cvtColor(src: CVMat, dst: CVMat, code: number): void;
  GaussianBlur(src: CVMat, dst: CVMat, ksize: CVSize, sigmaX: number): void;
  threshold(src: CVMat, dst: CVMat, thresh: number, maxval: number, type: number): void;
  HoughLinesP(
    image: CVMat,
    lines: CVMat,
    rho: number,
    theta: number,
    threshold: number,
    minLineLength: number,
    maxLineGap: number
  ): void;
  findContours(
    image: CVMat,
    contours: CVMatVector,
    hierarchy: CVMat,
    mode: number,
    method: number
  ): void;
  contourArea(contour: CVMat): number;
  arcLength(curve: CVMat, closed: boolean): number;
  
  // 常量
  COLOR_RGBA2GRAY: number;
  THRESH_BINARY: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
}

// 擴展全局 Window 接口
declare global {
  interface Window {
    cv: CV;
  }
} 