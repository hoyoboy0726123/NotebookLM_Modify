# 📄 NotebookLM PDF Modify - 智能 PDF 簡報編輯器

這是一個輕量級、隱私優先的 PDF 編輯工器，專為解決傳統 PDF 編輯器難以處理的複雜背景與文字辨識問題而設計。透過純前端技術實現，無需將檔案上傳至伺服器，確保您的資料安全。

![Project Preview](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ 核心特點 (Key Features)

### 🎨 創新的智能遮蓋與取色與系統
許多 PDF 編輯器在處理複雜背景（如漸層、浮水印或圖片上的文字）時，常因自動識別失敗而導致修圖痕跡明顯。我們引入了創新的解決方案：
- **精準吸色 (Smart Color Picker)**：內建強大的吸管工具，支援 **Ctrl + 滾輪放大** 進行像素級取色，完美解決色差問題。
- **純背景遮蓋模式**：只需框選區域並選取背景色，**不輸入任何文字**即可產生純色遮罩。這是移除 Logo、浮水印或多餘圖標（如 NotebookLM 圖標）的最完美方式。

### ⚡ 輕量化與高效能 (Lightweight & Fast)
- **純靜態網頁架構**：無需後端伺服器，部署簡單（支援 GitHub Pages, Render 等靜態託管）。
- **按需 OCR 辨識**：不同於其他工具一次性分析整份文件，本工具僅在您**框選特定區域**時才調用 Tesseract.js 進行輕量化辨識，大幅節省記憶體與等待時間。

### 🛠️ 專業級微調控制
專為追求完美的用戶設計的細節控制：
- **鍵盤微調**：支援使用鍵盤 **方向鍵 (↑ ↓ ← →)** 對文字框位置進行像素級微調。
- **快速調整**：支援字體大小、粗體設定與邊距調整。

## 🚀 技術棧 (Tech Stack)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (無繁重框架依賴)
- **PDF Rendering**: [PDF.js](https://github.com/mozilla/pdf.js)
- **OCR Engine**: [Tesseract.js](https://github.com/naptha/tesseract.js) (WASM powered)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)

## 📖 使用指南 (User Guide)

1.  **匯入 (Import)**：點擊右上角「匯入 PDF」載入文件。
2.  **框選 (Select)**：在想修改的區域拖曳滑鼠框選，AI 會自動辨識文字。
3.  **編輯 (Edit)**：
    - 修改識別出的文字。
    - 若背景複雜，點擊「吸管」圖示吸取精確背景色。
    - **移除物件**：若要遮蓋物件，請清空文字框內容並儲存。
4.  **微調 (Fine-tune)**：使用方向鍵調整位置。
5.  **匯出 (Export)**：點擊「匯出 PDF」，系統將合成所有修改並產出完整文件。

## 🔒 隱私聲明 (Privacy)
本專案為 **純前端應用 (Client-side Application)**。所有的 PDF 解析、OCR 辨識與圖片處理皆在您的瀏覽器本地執行，您的文件**永遠不會**被上傳至任何外部伺服器。

## 🤝 貢獻
歡迎提交 Issue 或 Pull Request 來改進這個專案！

---
Built with ❤️ for efficient document editing.
