# 圖表數據提取網站

這是一個基於 Next.js 開發的網站，用於從圖片中提取圖表數據並轉換為可用的 Excel 格式。

## 功能特點

- 📊 圖表圖片上傳與預覽
- 🔍 自動識別座標軸和曲線
- 📈 數據點自動提取
- 📑 Excel 格式轉換與下載
- 📱 響應式設計，支援多種設備

## 技術棧

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Chart.js
- Tesseract.js
- OpenCV.js
- XLSX

## 開發步驟記錄

### 1. 環境設置與專案初始化

#### 1.1 建立 Next.js 專案

- [x] 使用 pnpm create next-app@latest 建立專案

```bash
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

#### 1.2 安裝 shadcn/ui

- [x] 安裝 shadcn/ui 套件
- [x] 初始化 shadcn 設置

```bash
pnpm add -D @shadcn/ui
pnpm dlx shadcn@latest init
```

#### 1.3 安裝核心依賴

- [x] 安裝 chart.js 和 react-chartjs-2
- [x] 安裝 tesseract.js
- [x] 安裝 xlsx

```bash
pnpm add chart.js react-chartjs-2 tesseract.js xlsx
```

### 2. UI 元件設置

- [x] 安裝基礎元件
  - Button
  - Card
  - Table
  - Sonner (Toast 通知)

```bash
pnpm dlx shadcn@latest add button card table sonner
```

### 3. 專案結構

- [x] 建立基本目錄結構

```jsx
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/            # shadcn 元件
│   ├── image/         # 圖片相關元件
│   ├── data/          # 數據處理元件
│   └── chart/         # 圖表元件
├── lib/
│   ├── utils.ts       # 工具函數
│   ├── image/         # 圖片處理邏輯
│   ├── data/          # 數據處理邏輯
│   └── chart/         # 圖表邏輯
└── types/             # TypeScript 類型定義
```

### 4. 功能開發計劃

#### 4.1 圖片上傳功能

- [x] 實現拖放上傳
  - 建立類型定義 (src/types/image.ts)
  - 實現上傳元件 (src/components/image/ImageUploader.tsx)
- [x] 圖片預覽
  - 實現預覽元件 (src/components/image/ImagePreview.tsx)
- [x] 格式驗證
  - 檔案類型驗證
  - 檔案大小驗證
  - 錯誤提示

#### 4.2 圖像處理功能

- [x] 邊緣檢測
  - 使用 OpenCV.js 的 Canny 邊緣檢測
  - 圖像預處理和優化
- [x] 座標軸識別
  - 使用霍夫變換檢測直線
  - 分析直線角度識別座標軸
- [x] 曲線檢測
  - 使用輪廓檢測識別曲線
  - 曲線點提取和優化
- [x] 數據點提取
  - 座標點轉換
  - 數據點過濾和平滑化

#### 4.3 數據處理功能

- [x] 座標轉換
  - 像素座標轉換為實際數值
  - 座標系映射
- [x] 數據驗證
  - 座標軸範圍檢查
  - 數據點有效性驗證
  - 異常值檢測
- [x] 數據結構化
  - 數據點過濾
  - 數據平滑化
  - 格式標準化

#### 4.4 Excel 功能

- [x] 數據轉換
  - 建立 Excel 處理工具類
  - 實現數據格式轉換
  - 添加單位和表頭資訊
- [x] 表格生成
  - 實現數據預覽元件
  - 格式化數據顯示
  - 優化表格樣式
- [x] 檔案下載
  - 實現 Excel 檔案生成
  - 添加下載功能
  - 檔案命名和類型處理

### 5. 主頁面整合

- [x] 狀態管理
  - 建立應用程式狀態類型
  - 實現狀態處理器
  - 錯誤處理機制
- [x] 頁面布局
  - 響應式設計
  - 使用者介面優化
  - 載入狀態處理
- [x] 功能整合
  - 圖片上傳和預覽
  - 數據處理和顯示
  - Excel 導出功能

## 開發指南

### 安裝

```bash
pnpm install
```

### 開發環境運行

```bash
pnpm dev
```

### 建置專案

```bash
pnpm build
```

### 運行建置後的專案

```bash
pnpm start
```

## 注意事項

- 確保 Node.js 版本 >= 18
- 使用 pnpm 作為套件管理器
- 開發時請遵循 ESLint 規則
- 提交程式碼前請執行測試

## 授權

MIT License
