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

    // 轉換數據點
    const rows = data.points.map(point => [point.x, point.y]);

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
    
    // 將工作表添加到工作簿
    utils.book_append_sheet(wb, ws, '圖表數據');

    // 生成 Excel 檔案
    return write(wb, { type: 'array', bookType: 'xlsx' });
  }

  /**
   * 下載 Excel 檔案
   */
  public static downloadExcel(data: ChartData, filename: string = 'chart_data.xlsx') {
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
    const rows = data.points.slice(0, 5).map(point => [
      point.x.toFixed(2),
      point.y.toFixed(2)
    ]);
    
    return [...headers, ...rows];
  }
} 