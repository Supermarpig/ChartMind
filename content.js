// content.js - 在網頁中執行的腳本，負責掃描和處理圖片

// 導入所需模組
// 注意：在實際部署時，需要使用適當的模組打包工具（如webpack）來處理這些導入
// 這裡為了示例，假設這些模組已經可用
// const ImageProcessor = window.ImageProcessor;
// const ChartAnalyzer = window.ChartAnalyzer;
// const CurveDetector = window.CurveDetector;
// const DataExtractor = window.DataExtractor;
// const UnitConverterIntegration = window.UnitConverterIntegration;

// 檢查擴充功能上下文是否有效
function isExtensionContextValid() {
  try {
    // 嘗試訪問 chrome.runtime
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// 安全地執行 chrome API 調用
async function safeExecuteChromeAPI(action) {
  if (!isExtensionContextValid()) {
    console.log('擴充功能上下文已失效，需要重新載入');
    showNotification('請重新載入擴充功能', 'error');
    return false;
  }
  
  try {
    return await action();
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('擴充功能上下文已失效，需要重新載入');
      showNotification('請重新載入擴充功能', 'error');
      return false;
    }
    throw error;
  }
}

// 等待 OpenCV.js 載入完成
function waitForOpenCV() {
  return new Promise((resolve) => {
    if (window.cv) {
      resolve();
    } else {
      // 監聽 OpenCV.js 載入完成事件
      window.Module = {
        onRuntimeInitialized: function() {
          resolve();
        }
      };
    }
  });
}

// 存儲頁面上找到的所有圖片
let pageImages = [];
// 當前選中的圖片
let selectedImage = null;
// 提取的數據
let extractedData = null;
// 數據提取器實例
let dataExtractor = null;

// 初始化函數
async function initialize() {
  try {
    if (!isExtensionContextValid()) {
      console.log('擴充功能上下文無效，等待重新載入');
      return;
    }
    
    // 清理舊的事件處理器
    const oldHandler = document.querySelector('#chart-extractor-event-handler');
    if (oldHandler) {
      oldHandler.remove();
    }
    
    await waitForOpenCV();
    console.log('OpenCV.js 已成功載入');
    console.log('圖表數據提取器已初始化');
    
    // 恢復之前的狀態
    await restorePreviousState();
  } catch (error) {
    console.error('初始化失敗:', error);
    showNotification('初始化失敗，請重新載入擴充功能', 'error');
  }
}

// 恢復之前的狀態
async function restorePreviousState() {
  try {
    const result = await safeExecuteChromeAPI(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get(['lastSelectedImage'], (data) => {
          resolve(data);
        });
      });
    });
    
    if (result && result.lastSelectedImage) {
      const img = document.querySelector(`[data-chart-extractor-id="${result.lastSelectedImage.id}"]`);
      if (img) {
        selectedImage = img;
        img.style.border = '3px solid #4285f4';
        img.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.8)';
      }
    }
  } catch (error) {
    console.error('恢復狀態失敗:', error);
  }
}

// 監聽來自彈出視窗的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (!isExtensionContextValid()) {
    sendResponse({success: false, error: '擴充功能上下文已失效，請重新載入'});
    return false;
  }
  
  const handleMessage = async () => {
    try {
      switch (request.action) {
        case "ping":
          return {success: true};
          
        case "scanImages":
          const images = await scanPageImages();
          pageImages = images;
          return {success: true, imageCount: images.length};
          
        case "processSelectedImage":
          if (!selectedImage) {
            return {success: false, error: '沒有選中的圖片'};
          }
          const data = await processImage(selectedImage);
          extractedData = data;
          await safeExecuteChromeAPI(() => {
            return new Promise((resolve) => {
              chrome.storage.local.set({extractedData: data}, resolve);
            });
          });
          return {success: true, data};
          
        default:
          return {success: false, error: '未知的操作'};
      }
    } catch (error) {
      console.error('處理消息時發生錯誤:', error);
      return {success: false, error: error.message};
    }
  };
  
  handleMessage().then(sendResponse);
  return true;
});

// 掃描頁面上的所有圖片
async function scanPageImages() {
  return new Promise((resolve) => {
    const images = Array.from(document.querySelectorAll('img'));
    
    // 為每個圖片添加點擊事件，用於選擇要處理的圖片
    images.forEach((img, index) => {
      // 設置唯一標識符
      const id = `chart-extractor-${Date.now()}-${index}`;
      img.setAttribute('data-chart-extractor-id', id);
      
      // 移除所有現有的點擊事件（使用事件委託）
      const oldHandler = img.getAttribute('data-click-handler');
      if (oldHandler) {
        img.removeAttribute('data-click-handler');
      }
      
      // 添加視覺提示
      img.style.cursor = 'pointer';
      img.title = '點擊選擇此圖片進行數據提取';
    });
    
    // 使用事件委託來處理點擊事件
    if (!document.querySelector('#chart-extractor-event-handler')) {
      const handler = document.createElement('div');
      handler.id = 'chart-extractor-event-handler';
      handler.style.display = 'none';
      document.body.appendChild(handler);
      
      // 使用事件委託處理所有圖片的點擊
      document.addEventListener('click', async function(event) {
        const target = event.target;
        if (target.tagName === 'IMG' && target.hasAttribute('data-chart-extractor-id')) {
          await handleImageClick(event);
        }
      }, true);
    }
    
    showNotification('請點擊要提取數據的圖表圖片', 'info');
    resolve(images);
  });
}

// 處理圖片點擊的函數
async function handleImageClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  try {
    if (!isExtensionContextValid()) {
      showNotification('擴充功能需要重新載入', 'error');
      return;
    }
    
    // 移除之前選中圖片的高亮
    if (selectedImage) {
      selectedImage.style.border = '';
      selectedImage.style.boxShadow = '';
    }
    
    // 設置當前選中的圖片
    selectedImage = event.target;
    selectedImage.style.border = '3px solid #4285f4';
    selectedImage.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.8)';
    
    // 保存選中的圖片到 storage
    await safeExecuteChromeAPI(async () => {
      await new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({
            lastSelectedImage: {
              id: selectedImage.getAttribute('data-chart-extractor-id'),
              timestamp: Date.now()
            }
          }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
      
      // 通知 popup
      await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            action: "imageSelected",
            imageId: selectedImage.getAttribute('data-chart-extractor-id')
          }, (response) => {
            if (chrome.runtime.lastError) {
              // 忽略 popup 關閉的錯誤
              resolve();
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          // 忽略擴充功能上下文失效的錯誤
          resolve();
        }
      });
    });
    
    showNotification('已選中圖片，請重新打開插件進行下一步操作', 'success');
  } catch (error) {
    console.error('處理圖片點擊失敗:', error);
    showNotification('操作失敗，請重新載入擴充功能', 'error');
  }
}

// 處理圖片，提取數據
async function processImage(image) {
  return new Promise(async (resolve, reject) => {
    try {
      // 確保 OpenCV.js 已載入
      await waitForOpenCV();
      
      // 創建 canvas 並設置大小
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // 繪製圖片
      ctx.drawImage(image, 0, 0);

      // 使用 OpenCV.js 處理圖片
      const src = cv.imread(canvas);
      const dst = new cv.Mat();
      
      // 轉換為灰度圖
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      
      // 使用高斯模糊減少噪點
      cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
      
      // 使用 Canny 邊緣檢測
      cv.Canny(dst, dst, 50, 150, 3, false);
      
      // 檢測直線（用於找出坐標軸）
      const lines = new cv.Mat();
      cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 50, 50, 10);
      
      // 分析檢測到的線段，找出坐標軸
      const axes = analyzeAxes(lines, canvas.width, canvas.height);
      
      // 檢測曲線點
      const curvePoints = detectCurvePoints(dst, axes);
      
      // 轉換數據點
      const convertedDataPoints = curvePoints.map(point => ({
        cfm: Number(point.x.toFixed(2)),
        cubicMeterPerMin: Number((point.x * UNIT_CONVERSION.CFM_TO_M3_MIN).toFixed(4)),
        inchH2O: Number(point.y.toFixed(2)),
        mmH2O: Number((point.y * UNIT_CONVERSION.INCH_TO_MM).toFixed(2))
      }));

      // 清理 OpenCV 對象
      src.delete();
      dst.delete();
      lines.delete();

      // 構建返回數據
      const result = {
        success: true,
        rawData: {
          xAxis: {
            cfm: curvePoints.map(p => p.x),
            cubicMeterPerMin: convertedDataPoints.map(p => p.cubicMeterPerMin)
          },
          yAxis: {
            inchH2O: curvePoints.map(p => p.y),
            mmH2O: convertedDataPoints.map(p => p.mmH2O)
          },
          dataPoints: curvePoints.map(p => ({ cfm: p.x, inchH2O: p.y }))
        },
        convertedDataPoints
      };

      showNotification('圖片處理成功', 'success');
      resolve(result);
    } catch (error) {
      console.error('圖片處理失敗:', error);
      showNotification('圖片處理失敗：' + error.message, 'error');
      reject(error);
    }
  });
}

// 分析檢測到的線段，找出坐標軸
function analyzeAxes(lines, width, height) {
  const horizontalLines = [];
  const verticalLines = [];
  
  // 分類水平和垂直線段
  for (let i = 0; i < lines.rows; ++i) {
    const x1 = lines.data32S[i * 4];
    const y1 = lines.data32S[i * 4 + 1];
    const x2 = lines.data32S[i * 4 + 2];
    const y2 = lines.data32S[i * 4 + 3];
    
    const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
    
    if (angle < 10 || angle > 170) {
      horizontalLines.push({x1, y1, x2, y2});
    } else if (angle > 80 && angle < 100) {
      verticalLines.push({x1, y1, x2, y2});
    }
  }
  
  // 找出最可能的 X 軸和 Y 軸
  const xAxis = findMainAxis(horizontalLines, true, height);
  const yAxis = findMainAxis(verticalLines, false, width);
  
  return {
    x: xAxis,
    y: yAxis
  };
}

// 找出主要坐標軸
function findMainAxis(lines, isHorizontal, maxValue) {
  // 按位置排序
  lines.sort((a, b) => {
    const aPos = isHorizontal ? a.y1 : a.x1;
    const bPos = isHorizontal ? b.y1 : b.x1;
    return aPos - bPos;
  });
  
  // 找出最長的線段
  let mainLine = lines[0];
  let maxLength = 0;
  
  for (const line of lines) {
    const length = Math.sqrt(
      Math.pow(line.x2 - line.x1, 2) + 
      Math.pow(line.y2 - line.y1, 2)
    );
    
    if (length > maxLength) {
      maxLength = length;
      mainLine = line;
    }
  }
  
  return mainLine;
}

// 檢測曲線點
function detectCurvePoints(img, axes) {
  const points = [];
  const step = 5; // 每隔5個像素採樣一次
  
  // 在 X 軸範圍內掃描
  for (let x = axes.y.x1; x < axes.x.x2; x += step) {
    let minY = null;
    let maxIntensity = 0;
    
    // 在 Y 軸範圍內掃描
    for (let y = axes.x.y1; y > axes.y.y1; y--) {
      const intensity = img.ucharPtr(y, x)[0];
      
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        minY = y;
      }
    }
    
    if (minY !== null) {
      // 將像素坐標轉換為實際值
      const xValue = normalizeCoordinate(x, axes.y.x1, axes.x.x2, 0, 40);
      const yValue = normalizeCoordinate(minY, axes.x.y1, axes.y.y1, 0, 10);
      
      points.push({
        x: Number(xValue.toFixed(2)),
        y: Number(yValue.toFixed(2))
      });
    }
  }
  
  // 對數據點進行平滑處理
  return smoothPoints(points);
}

// 將像素坐標歸一化到實際值範圍
function normalizeCoordinate(value, min, max, targetMin, targetMax) {
  return targetMin + (value - min) * (targetMax - targetMin) / (max - min);
}

// 平滑數據點
function smoothPoints(points) {
  const smoothedPoints = [];
  const targetPoints = [0, 10, 20, 30, 40]; // 我們想要的 X 軸值
  
  // 對每個目標 X 值進行插值
  for (const targetX of targetPoints) {
    // 找到最接近的兩個點
    const leftPoint = points.find(p => p.x <= targetX);
    const rightPoint = points.find(p => p.x > targetX);
    
    if (leftPoint && rightPoint) {
      // 線性插值
      const ratio = (targetX - leftPoint.x) / (rightPoint.x - leftPoint.x);
      const y = leftPoint.y + (rightPoint.y - leftPoint.y) * ratio;
      smoothedPoints.push({x: targetX, y: Number(y.toFixed(2))});
    } else if (leftPoint) {
      smoothedPoints.push({x: targetX, y: Number(leftPoint.y.toFixed(2))});
    } else if (rightPoint) {
      smoothedPoints.push({x: targetX, y: Number(rightPoint.y.toFixed(2))});
    }
  }
  
  return smoothedPoints;
}

// 單位轉換常數
const UNIT_CONVERSION = {
  CFM_TO_M3_MIN: 0.028316847,  // 1 CFM = 0.028316847 m³/min
  INCH_TO_MM: 25.4             // 1 inch = 25.4 mm
};

// 檢測圖表邊界
function detectChartBounds(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;

  // 掃描圖片尋找邊界（黑色或深色像素）
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // 檢查是否為深色像素（可能是邊框或軸線）
      if (r < 100 && g < 100 && b < 100) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  // 添加一些邊距
  const margin = 5;
  return {
    left: Math.max(0, left - margin),
    right: Math.min(width, right + margin),
    top: Math.max(0, top - margin),
    bottom: Math.min(height, bottom + margin)
  };
}

// 顯示通知
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '10px';
  notification.style.right = '10px';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.fontSize = '14px';
  notification.textContent = message;
  
  switch (type) {
    case 'success':
      notification.style.backgroundColor = 'rgba(52, 168, 83, 0.9)';
      notification.style.color = 'white';
      break;
    case 'error':
      notification.style.backgroundColor = 'rgba(234, 67, 53, 0.9)';
      notification.style.color = 'white';
      break;
    default:
      notification.style.backgroundColor = 'rgba(66, 133, 244, 0.9)';
      notification.style.color = 'white';
  }
  
  const closeButton = document.createElement('span');
  closeButton.textContent = '×';
  closeButton.style.marginLeft = '10px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontWeight = 'bold';
  closeButton.onclick = function() {
    document.body.removeChild(notification);
  };
  notification.appendChild(closeButton);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
  
  document.body.appendChild(notification);
}

// 立即初始化
initialize();
