'use client';

import { utils, write } from 'xlsx';
import { ChartData } from '@/types/chart';

export class ExcelProcessor {
  /**
   * 將圖表數據轉換為 Excel 工作表數據
   */
  private static convertToWorksheet(data: ChartData) {
    // 建立表頭
    const headers = [
      ['X軸', data.xAxis.unit || ''],
      ['Y軸', data.yAxis.unit || ''],
      ['', ''],
      ['X', 'Y']
    ];

    // 轉換數據點（確保只有兩位小數）
    const rows = data.points.map(point => [
      Math.round(point.x * 100) / 100,
      Math.round(point.y * 100) / 100
    ]);

    // 合併所有數據
    const wsData = [...headers, ...rows];

    // 創建工作表
    const ws = utils.aoa_to_sheet(wsData);

    // 設置列寬
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }];

    return ws;
  }

  /**
   * 生成 Excel 檔案
   */
  public static generateExcel(data: ChartData): Uint8Array {
    // 創建工作簿
    const wb = utils.book_new();
    
    // 創建工作表
    const ws = this.convertToWorksheet(data);
    
    // 設置數字格式（限制小數點後兩位）
    const range = utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 4; R <= range.e.r; R++) { // 從第4行開始（跳過標題）
      for (let C = 0; C <= range.e.c; C++) {
        const cell_address = utils.encode_cell({r: R, c: C});
        const cell = ws[cell_address];
        if (cell && typeof cell.v === 'number') {
          cell.z = '0.00'; // 設置為保留兩位小數的格式
          cell.v = Math.round(cell.v * 100) / 100; // 四捨五入到兩位小數
        }
      }
    }
    
    // 將工作表添加到工作簿
    utils.book_append_sheet(wb, ws, '圖表數據');

    // 生成 Excel 檔案
    return write(wb, { type: 'array', bookType: 'xlsx' });
  }

  /**
   * 下載 Excel 檔案
   */
  public static downloadExcel(data: ChartData, filename?: string) {
    // 如果沒有指定檔名，使用預設檔名（包含日期時間）
    if (!filename) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-TW').replace(/\//g, '');
      const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false }).replace(/:/g, '');
      filename = `chart_${dateStr}_${timeStr}.xlsx`;
    }

    // 生成 Excel 檔案
    const excelData = this.generateExcel(data);

    // 創建 Blob
    const blob = new Blob([excelData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 創建下載連結
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // 觸發下載
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 生成預覽數據
   */
  public static generatePreview(data: ChartData): string[][] {
    const headers = [['X', 'Y']];
    const rows = data.points.slice(0, 10).map(point => [
      point.x.toFixed(2),
      point.y.toFixed(2)
    ]);
    
    return [...headers, ...rows];
  }
} 