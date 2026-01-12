# 🚀 NotebookLM 簡報修改神器 (Presentation Modifier)

> 專為 PDF 簡報設計的智能修改工具，無需專業軟體，瀏覽器即開即用。支援直排文字、智能背景還原與浮水印移除。

[![Status](https://img.shields.io/badge/Status-Active-success)](https://github.com/Start-Hero/Briefing_Editor)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

這是一個基於純前端技術構建的 PDF 修改工具，致力於解決傳統編輯器在處理「複雜背景」與「中文直排」時的痛點。所有處理皆在本地端完成，確保最高等級的資料隱私。

## ✨ 獨家特色 (Key Features)

### 1. 🖌️ 智能背景還原 (Smart Inpainting)
- **自動遮罩產生**：修改文字時，系統會自動分析周圍背景色並產生遮罩覆蓋舊內容，讓修改痕跡降至最低。
- **背景跟隨技術**：新增的文字或遮罩色塊，其背景與內容緊密結合，拖曳移動時完美同步。

### 2. 📝 完整的中文排版支援 (Vertical Text Support)
- **直排文字模式**：專為亞洲語系設計，支援標準的垂直書寫格式（由上而下，由右至左）。
- **智能縮放邏輯**：
    - **橫排**：拉高外框 → 放大字體。
    - **直排**：拉寬外框 → 放大字體；拉高外框 → 增加排版長度。

### 3. 🎯 自由物件編輯 (Free-Floating Objects)
- **新增文字 (T)**：一鍵新增透明背景的文字框，隨處拖曳擺放，不僅限於修改既有內容。
- **新增遮罩 ([ ])**：快速建立純色遮罩，配合吸管工具，可輕鬆遮蓋頁面上的 Logo、機密資訊或多餘圖示。

### 4. 🔒 極致隱私 (Privacy First)
- **Local-First 架構**：無需上傳檔案。PDF 解析、OCR 辨識與合成皆在瀏覽器內透過 WASM 技術完成。
- **安全無憂**：您的機密簡報絕不會離開您的電腦。

## 🛠️ 操作指南 (User Guide)

### 🖱️ 核心操作
| 功能 | 操作方式 | 用途 |
| :--- | :--- | :--- |
| **修改舊文字** | 直接在圖片上**框選**文字區域 | 修正錯字、更新數據（自動背景遮蓋） |
| **新增文字** | 點擊上方工具列 **[ T ]** 按鈕 | 補充說明、新增標題（預設透明背景） |
| **新增遮罩** | 點擊上方工具列 **[ ]** 按鈕 | 遮蓋浮水印、Logo 或敏感個資 |

### 💡 進階技巧
- **精準吸色**：點擊編輯框內的 **[+] 吸管**，按住 `Ctrl + 滾輪` 放大圖片，可吸取單一像素顏色，解決漸層背景色差。
- **微調位置**：使用鍵盤 `方向鍵` 可進行 1px 的精確移動；按住 `Shift` 可加速移動。
- **預覽模式**：點擊右側列表上方的 **隱藏編輯框** 按鈕，即可預覽最終輸出效果。

## 🚀 技術棧 (Tech Stack)
- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **PDF Handling**: [PDF.js](https://github.com/mozilla/pdf.js) (Rendering) / [jsPDF](https://github.com/parallax/jsPDF) (Generation)
- **OCR Engine**: [Tesseract.js](https://github.com/naptha/tesseract.js) (On-demand recognition)

## 🤝 貢獻 (Contribution)
歡迎提交 Issues 或 Pull Requests。我們特別歡迎對於 PDF 渲染效能優化與更多字型支援的貢獻。

---
*Built for efficiency, designed for privacy.*
