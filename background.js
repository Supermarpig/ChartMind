// background.js - 處理插件的背景任務

// 監聽來自彈出視窗或內容腳本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "exportToExcel") {
    // 從請求中獲取數據
    const data = request.data;
    const yAxisUnit = request.yAxisUnit || 'inch-H₂O';
    const xAxisUnit = request.xAxisUnit || 'CFM';
    
    // 驗證數據格式
    if (!data || !data.convertedDataPoints || !Array.isArray(data.convertedDataPoints)) {
      console.error('無效的數據格式:', data);
      sendResponse({success: false, error: '無效的數據格式'});
      return true;
    }
    
    // 生成Excel文件
    generateExcelFile(data, yAxisUnit, xAxisUnit)
      .then(function(blob) {
        // 創建下載
        chrome.downloads.download({
          url: URL.createObjectURL(blob),
          filename: 'chart_data.xlsx',
          saveAs: true
        }, function(downloadId) {
          if (chrome.runtime.lastError) {
            console.error('下載失敗:', chrome.runtime.lastError);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            sendResponse({success: true, downloadId: downloadId});
          }
        });
      })
      .catch(function(error) {
        console.error('生成Excel文件失敗:', error);
        sendResponse({success: false, error: error.message});
      });
    
    return true;
  }
});

// 生成Excel文件的函數
async function generateExcelFile(data, yAxisUnit, xAxisUnit) {
  try {
    // 檢查是否已加載SheetJS庫
    if (typeof XLSX === 'undefined') {
      // 加載SheetJS庫
      await loadSheetJS();
    }
    
    // 創建Excel數據
    const excelData = [];
    
    // 添加標題行
    excelData.push(['CFM', 'm³/min', 'inch-H₂O', 'mm-H₂O']);
    
    // 驗證數據點
    if (!data.convertedDataPoints.every(point => 
      typeof point.cfm === 'number' &&
      typeof point.cubicMeterPerMin === 'number' &&
      typeof point.inchH2O === 'number' &&
      typeof point.mmH2O === 'number'
    )) {
      throw new Error('數據格式不正確');
    }
    
    // 添加數據行
    data.convertedDataPoints.forEach(point => {
      excelData.push([
        point.cfm.toFixed(2),
        point.cubicMeterPerMin.toFixed(4),
        point.inchH2O.toFixed(2),
        point.mmH2O.toFixed(2)
      ]);
    });
    
    // 創建工作簿
    const wb = XLSX.utils.book_new();
    
    // 創建工作表
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // 設置列寬
    const colWidths = [
      { wch: 10 }, // CFM
      { wch: 12 }, // m³/min
      { wch: 12 }, // inch-H₂O
      { wch: 12 }  // mm-H₂O
    ];
    ws['!cols'] = colWidths;
    
    // 將工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '圖表數據');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // 創建Blob對象
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  } catch (error) {
    console.error('生成Excel文件失敗:', error);
    throw error;
  }
}

// 加載SheetJS庫
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('加載SheetJS庫失敗'));
    document.head.appendChild(script);
  });
}

// 生成CSV文件（作為備用方案）
function generateCSV(data) {
  // 創建CSV內容
  let csvContent = 'CFM,m³/min,inch-H₂O,mm-H₂O\n';
  
  // 添加數據行
  data.convertedDataPoints.forEach(point => {
    csvContent += `${point.cfm.toFixed(2)},${point.cubicMeterPerMin.toFixed(4)},${point.inchH2O.toFixed(2)},${point.mmH2O.toFixed(2)}\n`;
  });
  
  // 創建Blob對象
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}
