// popup.js - 處理彈出視窗的交互邏輯

document.addEventListener('DOMContentLoaded', function() {
  // 獲取UI元素
  const scanPageButton = document.getElementById('scanPage');
  const processImageButton = document.getElementById('processImage');
  const exportExcelButton = document.getElementById('exportExcel');
  const statusMessage = document.getElementById('statusMessage');
  const dataPreview = document.getElementById('dataPreview');
  const previewTableBody = document.getElementById('previewTableBody');
  const yAxisUnitToggle = document.getElementById('yAxisUnitToggle');
  const xAxisUnitToggle = document.getElementById('xAxisUnitToggle');
  const yAxisUnitLabel = document.getElementById('yAxisUnitLabel');
  const xAxisUnitLabel = document.getElementById('xAxisUnitLabel');
  
  // 存儲當前狀態
  let currentState = {
    imagesScanned: false,
    imageSelected: false,
    dataProcessed: false,
    selectedImageId: null,
    extractedData: null,
    yAxisUnit: 'inch-H₂O',
    xAxisUnit: 'CFM'
  };
  
  // 更新UI狀態
  function updateUIState() {
    processImageButton.disabled = !currentState.imageSelected;
    exportExcelButton.disabled = !currentState.dataProcessed;
    yAxisUnitLabel.textContent = currentState.yAxisUnit;
    xAxisUnitLabel.textContent = currentState.xAxisUnit;
    
    if (currentState.dataProcessed && currentState.extractedData) {
      updateDataPreview();
      dataPreview.style.display = 'block';
    } else {
      dataPreview.style.display = 'none';
    }
  }
  
  // 更新數據預覽表格
  function updateDataPreview() {
    previewTableBody.innerHTML = '';
    const previewData = currentState.extractedData.convertedDataPoints?.slice(0, 5) || [];
    
    previewData.forEach(point => {
      const row = document.createElement('tr');
      const cfmValue = point.cfm?.toFixed(2) || '0.00';
      const cubicMeterValue = point.cubicMeterPerMin?.toFixed(4) || '0.0000';
      const inchValue = point.inchH2O?.toFixed(2) || '0.00';
      const mmValue = point.mmH2O?.toFixed(2) || '0.00';
      
      row.innerHTML = `
        <td>${cfmValue}</td>
        <td>${cubicMeterValue}</td>
        <td>${inchValue}</td>
        <td>${mmValue}</td>
      `;
      
      previewTableBody.appendChild(row);
    });
  }
  
  // 注入內容腳本
  async function injectContentScript() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab?.id) {
        throw new Error('無法獲取當前標籤頁');
      }
      
      // 檢查腳本是否已經注入
      try {
        await chrome.tabs.sendMessage(tab.id, {action: "ping"});
        console.log('內容腳本已存在');
        return true;
      } catch (error) {
        console.log('注入內容腳本...');
      }
      
      // 注入內容腳本
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content.js']
      });
      
      return true;
    } catch (error) {
      console.error('注入腳本失敗:', error);
      throw error;
    }
  }
  
  // 向內容腳本發送消息的通用函數
  async function sendMessageToContentScript(message) {
    try {
      // 確保內容腳本已注入
      await injectContentScript();
      
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab?.id) {
        throw new Error('無法獲取當前標籤頁');
      }
      
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, message, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('發送消息失敗:', error);
      throw error;
    }
  }
  
  // 掃描頁面圖片按鈕點擊事件
  scanPageButton.addEventListener('click', async function() {
    try {
      updateStatus('正在掃描頁面圖片...', 'info');
      
      const response = await sendMessageToContentScript({action: "scanImages"});
      if (response?.success) {
        currentState.imagesScanned = true;
        updateStatus(`找到 ${response.imageCount} 張圖片，請點擊頁面上的圖片進行選擇`, 'success');
      } else {
        throw new Error('掃描失敗');
      }
    } catch (error) {
      updateStatus(`掃描失敗：${error.message}`, 'error');
    }
    updateUIState();
  });
  
  // 處理選中圖片按鈕點擊事件
  processImageButton.addEventListener('click', async function() {
    try {
      updateStatus('正在處理選中圖片...', 'info');
      
      const response = await sendMessageToContentScript({action: "processSelectedImage"});
      if (response?.success) {
        currentState.dataProcessed = true;
        currentState.extractedData = response.data;
        updateStatus('圖片處理完成，可以導出數據', 'success');
      } else {
        throw new Error('處理失敗');
      }
    } catch (error) {
      updateStatus(`處理失敗：${error.message}`, 'error');
    }
    updateUIState();
  });
  
  // 導出Excel按鈕點擊事件
  exportExcelButton.addEventListener('click', async function() {
    try {
      updateStatus('正在生成Excel文件...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        action: "exportToExcel",
        data: currentState.extractedData,
        yAxisUnit: currentState.yAxisUnit,
        xAxisUnit: currentState.xAxisUnit
      });
      
      if (response?.success) {
        updateStatus('Excel文件已下載', 'success');
      } else {
        throw new Error('導出失敗');
      }
    } catch (error) {
      updateStatus(`導出失敗：${error.message}`, 'error');
    }
  });
  
  // Y軸單位切換事件
  yAxisUnitToggle.addEventListener('change', function() {
    currentState.yAxisUnit = this.checked ? 'mm-H₂O' : 'inch-H₂O';
    updateUIState();
  });
  
  // X軸單位切換事件
  xAxisUnitToggle.addEventListener('change', function() {
    currentState.xAxisUnit = this.checked ? 'm³/min' : 'CFM';
    updateUIState();
  });
  
  // 監聽來自內容腳本的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "imageSelected") {
      currentState.imageSelected = true;
      currentState.selectedImageId = request.imageId;
      updateStatus('已選中圖片，可以進行處理', 'success');
      updateUIState();
      sendResponse({success: true});
    }
    return true;
  });
  
  // 更新狀態消息
  function updateStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
  }
  
  // 檢查是否有之前選中的圖片
  async function checkLastSelectedImage() {
    try {
      const result = await chrome.storage.local.get('lastSelectedImage');
      if (result.lastSelectedImage) {
        // 如果選中時間在 5 分鐘內，則恢復選中狀態
        if (Date.now() - result.lastSelectedImage.timestamp < 5 * 60 * 1000) {
          currentState.imageSelected = true;
          currentState.selectedImageId = result.lastSelectedImage.id;
          updateStatus('已恢復之前選中的圖片，可以繼續處理', 'success');
          updateUIState();
        }
        // 清除存儲的選中狀態
        chrome.storage.local.remove('lastSelectedImage');
      }
    } catch (error) {
      console.error('檢查之前選中的圖片失敗:', error);
    }
  }
  
  // 初始化UI狀態
  updateUIState();
  checkLastSelectedImage();
});
