/**
 * NotebookLM 簡報編輯器 - 主要 JavaScript V2
 * 
 * 新增功能：
 * 1. 使用 PDF.js 的 getTextContent() 獲取真實文字位置
 * 2. 左右分欄佈局
 * 3. 文字區域列表面板
 * 4. 編輯對話框
 */

// ============================================
// 全域狀態
// ============================================
/**
 * 應用狀態管理
 */
const AppState = {
    isLoggedIn: false,
    user: null,
    currentFile: null,
    pages: [],           // 儲存每一頁的資訊 (imageData, textBoxes)
    currentPageIndex: -1,
    textBoxes: [],
    activeTextBoxId: null, // 當前正在編輯的文本框 ID
    language: 'zh-TW',
    isFavorite: false,
    showTextBoxes: true,
    isNewBoxMode: false,   // 是否為新增文本框模式
    pendingNewBox: null,   // 待新增的文本框數據
    isPreviewMode: false,
    zoomLevel: 100,      // 縮放比例 (100 = 100%)
    isProcessing: false,   // 是否正在處理中
    ocrWorker: null,       // Tesseract Worker 實例

    // 歷史紀錄
    history: [],           // 撤銷堆疊
    redoStack: [],         // 重做堆疊
    maxHistorySize: 50,    // 最大紀錄步數

    // 新增模式狀態
    colorPickingMode: null // 'text', 'bg', 'new_cover'
};

// ============================================
// DOM 元素
// ============================================
const DOM = {
    // Header
    headerActions: document.getElementById('headerActions'),
    importPdfBtn: document.getElementById('importPdfBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    helpBtn: document.getElementById('helpBtn'),

    // Add Buttons (New)
    addCoverBtn: document.getElementById('addCoverBtn'),
    addHTextBtn: document.getElementById('addHTextBtn'),
    addVTextBtn: document.getElementById('addVTextBtn'),

    // Help Modal
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    closeHelpBtnBottom: document.getElementById('closeHelpBtnBottom'),

    // Editor Section
    editorSection: document.getElementById('editorSection'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),

    // Processing
    processingArea: document.getElementById('processingArea'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),

    // Thumbnails
    thumbnailsArea: document.getElementById('thumbnailsArea'),
    thumbnailsGrid: document.getElementById('thumbnailsGrid'),

    // Editor Layout (新版)
    editorLayout: document.getElementById('editorLayout'),
    backToThumbnails: document.getElementById('backToThumbnails'),
    editorCanvas: document.getElementById('editorCanvas'),
    textOverlays: document.getElementById('textOverlays'),
    pdfPreviewContainer: document.getElementById('pdfPreviewContainer'),
    pdfViewport: document.getElementById('pdfViewport'),

    // Page Navigator
    pageNavigator: document.getElementById('pageNavigator'),
    pageThumbnailsList: document.getElementById('pageThumbnailsList'),

    // Zoom Controls
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    zoomReset: document.getElementById('zoomReset'),
    zoomLevel: document.getElementById('zoomLevel'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),

    // Result Panel
    textBoxCount: document.getElementById('textBoxCount'),
    toggleVisibility: document.getElementById('toggleVisibility'),
    previewToggle: document.getElementById('previewToggle'),
    textList: document.getElementById('textList'),

    // Download
    downloadBtn: document.getElementById('downloadBtn'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),

    // Language
    langBtns: document.querySelectorAll('.lang-btn'),

    // Edit Modal
    editModal: document.getElementById('editModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    originalText: document.getElementById('originalText'),
    editTextarea: document.getElementById('editTextarea'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    textColorPicker: document.getElementById('textColorPicker'),
    bgColorPicker: document.getElementById('bgColorPicker'),
    pickTextColorBtn: document.getElementById('pickTextColorBtn'),
    pickBgColorBtn: document.getElementById('pickBgColorBtn'),
    boldCheckbox: document.getElementById('boldCheckbox')
};

// ============================================
// 工具函數
// ============================================

/**
 * 顯示 Toast 通知
 */
function showToast(message, duration = 3000) {
    DOM.toastMessage.textContent = message;
    DOM.toast.classList.remove('hidden');

    setTimeout(() => {
        DOM.toast.classList.add('hidden');
    }, duration);
}

/**
 * 顯示/隱藏元素
 */
function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

/**
 * 將 RGB 顏色轉換為 Hex 格式
 */
function rgbToHex(color) {
    if (!color) return '#000000';

    // 如果是物件 {r, g, b}
    if (typeof color === 'object' && color !== null) {
        const r = color.r !== undefined ? color.r : 0;
        const g = color.g !== undefined ? color.g : 0;
        const b = color.b !== undefined ? color.b : 0;
        return '#' + [r, g, b].map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // 如果是字串
    if (typeof color === 'string') {
        // 如果已經是 hex 格式，直接返回
        if (color.startsWith('#')) {
            return color;
        }

        // 解析 rgb(r, g, b) 格式
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }
    }

    return '#000000';
}

/**
 * 模擬延遲（用於模擬 API 請求）
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一 ID
 */
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// 認證功能
// ============================================

/**
 * 初始化應用（無需登入，直接進入）
 */
function initApp() {
    // 直接顯示編輯介面
    showElement(DOM.editorSection);
    showElement(DOM.headerActions);
}

/**
 * 處理登出（重置應用）
 */
function handleLogout() {
    AppState.pages = [];
    AppState.currentPageIndex = -1;

    // 重置上傳區域
    showElement(DOM.uploadArea);
    hideElement(DOM.processingArea);
    hideElement(DOM.thumbnailsArea);
    hideElement(DOM.editorLayout);

    showToast('已重置');
}

// ============================================
// 檔案上傳功能
// ============================================

/**
 * 初始化上傳區域
 */
function initUploadArea() {
    // 點擊上傳
    DOM.uploadArea.addEventListener('click', () => {
        DOM.fileInput.click();
    });

    // 檔案選擇
    DOM.fileInput.addEventListener('change', handleFileSelect);

    // 拖曳上傳
    DOM.uploadArea.addEventListener('dragover', handleDragOver);
    DOM.uploadArea.addEventListener('dragleave', handleDragLeave);
    DOM.uploadArea.addEventListener('drop', handleDrop);

    // 字體大小滑桿事件
    if (DOM.fontSizeSlider) {
        DOM.fontSizeSlider.addEventListener('input', () => {
            DOM.fontSizeValue.textContent = DOM.fontSizeSlider.value + 'px';
        });
    }
}

function handleDragOver(e) {
    e.preventDefault();
    DOM.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    DOM.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    DOM.uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * 處理上傳的檔案
 */
async function processFile(file) {
    // 驗證檔案類型
    if (file.type !== 'application/pdf') {
        showToast('請上傳 PDF 格式的檔案');
        return;
    }

    // 驗證檔案大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
        showToast('檔案大小不能超過 50MB');
        return;
    }

    // 重置應用狀態（清空舊 PDF）
    AppState.pages = [];
    AppState.currentPageIndex = -1;
    DOM.thumbnailsGrid.innerHTML = '';

    // 顯示處理中狀態
    hideElement(DOM.uploadArea);
    hideElement(DOM.editorLayout);        // 確保編輯器隱藏
    hideElement(DOM.thumbnailsArea);      // 確保縮圖隱藏
    showElement(DOM.processingArea);

    try {
        // 使用 PDF.js 載入 PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const totalPages = pdf.numPages; // 無頁數限制（原限制：Math.min(pdf.numPages, 20)）
        DOM.totalPages.textContent = totalPages;

        AppState.pages = [];

        // 渲染每一頁
        for (let i = 1; i <= totalPages; i++) {
            DOM.currentPage.textContent = i;

            const page = await pdf.getPage(i);
            const scale = 2; // 高解析度
            const viewport = page.getViewport({ scale });

            // 建立離屏 Canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // 渲染頁面
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // 儲存頁面資訊
            AppState.pages.push({
                id: generateId(),
                pageNumber: i,
                pdfPage: page,
                imageData: canvas.toDataURL('image/png'),
                width: viewport.width,
                height: viewport.height,
                scale: scale,
                textBoxes: [],
                isAnalyzed: false
            });
        }

        // 處理完成
        hideElement(DOM.processingArea);

        // 重置 fileInput value，這樣如果再次選擇同一個檔案也能觸發 change 事件
        DOM.fileInput.value = '';

        if (AppState.pages.length > 0) {
            // 生成縮圖（雖然不顯示，但為了"返回縮圖"功能正常運作）
            renderThumbnails();

            // 直接進入第一頁編輯
            analyzePage(0);
        } else {
            showToast('PDF 沒有頁面');
            showElement(DOM.uploadArea);
        }

        showToast(`成功載入 ${totalPages} 頁`);

    } catch (error) {
        console.error('PDF 處理錯誤:', error);
        showToast('PDF 處理失敗，請重試');
        hideElement(DOM.processingArea);
        showElement(DOM.uploadArea);
    }
}

// ============================================
// 縮圖功能
// ============================================

/**
 * 渲染頁面縮圖
 */
function renderThumbnails() {
    DOM.thumbnailsGrid.innerHTML = '';

    AppState.pages.forEach((page, index) => {
        const card = document.createElement('div');
        card.className = 'thumbnail-card' + (page.isAnalyzed ? ' analyzed' : '');

        const btnText = page.isAnalyzed ? '繼續編輯' : '開始編輯';

        card.innerHTML = `
            <img src="${page.imageData}" alt="頁面 ${page.pageNumber}">
            <div class="thumbnail-overlay">第 ${page.pageNumber} 頁</div>
            <button class="analyze-btn">${btnText}</button>
        `;

        // 點擊編輯按鈕
        const analyzeBtn = card.querySelector('.analyze-btn');
        analyzeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (page.isAnalyzed) {
                openEditor(index);
            } else {
                analyzePage(index);
            }
        });

        // 點擊整個卡片也可以
        card.addEventListener('click', () => {
            if (page.isAnalyzed) {
                openEditor(index);
            } else {
                analyzePage(index);
            }
        });

        DOM.thumbnailsGrid.appendChild(card);
    });
}

// ============================================
// 頁面編輯功能 - 用戶手動框選修改區域
// ============================================

/**
 * 開始編輯頁面 - 直接進入編輯模式
 */
async function analyzePage(pageIndex) {
    const page = AppState.pages[pageIndex];

    // 初始化空的文字框陣列（用戶會自己框選）
    if (!page.textBoxes) {
        page.textBoxes = [];
    }

    page.isAnalyzed = true;

    // 更新縮圖
    renderThumbnails();

    // 打開編輯器
    openEditor(pageIndex);

    showToast('請在圖片上框選要修改的區域');
}

/**
 * 合併相鄰的文字框
 */
function mergeNearbyTextBoxes(textBoxes) {
    if (textBoxes.length === 0) return [];

    console.log('開始合併文字框，總數:', textBoxes.length);

    // 按照 Y 座標分組（同一行的文字）
    const lines = [];
    // 擴大 Y 閾值：對於 scale=2 的高解析度，需要更大的容差
    const yThreshold = 30; // 30px 容差

    textBoxes.forEach(box => {
        let foundLine = false;
        for (const line of lines) {
            // 檢查 Y 座標是否接近（同一行）
            const yDiff = Math.abs(line.avgY - box.y);
            if (yDiff < yThreshold) {
                line.boxes.push(box);
                // 更新平均 Y
                line.avgY = (line.avgY * (line.boxes.length - 1) + box.y) / line.boxes.length;
                foundLine = true;
                break;
            }
        }
        if (!foundLine) {
            lines.push({
                avgY: box.y,
                boxes: [box]
            });
        }
    });

    console.log('分組後行數:', lines.length);

    // 對每一行，合併相鄰的文字
    const mergedBoxes = [];
    let globalIndex = 1;

    lines.forEach((line, lineIndex) => {
        // 按 X 座標排序
        line.boxes.sort((a, b) => a.x - b.x);

        let currentMerged = null;

        line.boxes.forEach((box, boxIndex) => {
            if (!currentMerged) {
                currentMerged = { ...box, index: globalIndex++ };
            } else {
                // 計算當前框與已合併框之間的間距
                const rightEdge = currentMerged.x + currentMerged.width;
                const gap = box.x - rightEdge;

                // 使用多種閾值判斷是否合併：
                // 1. 絕對閾值：間距小於 50 像素
                // 2. 相對閾值：間距小於 2 倍字體高度
                // 3. 重疊或接觸：gap <= 0
                const absoluteThreshold = 50;
                const relativeThreshold = Math.max(currentMerged.height, box.height) * 2;

                const shouldMerge = gap < absoluteThreshold || gap < relativeThreshold;

                if (shouldMerge) {
                    // 合併文字
                    currentMerged.text += box.text;
                    // 更新寬度到合併後的右邊界
                    currentMerged.width = (box.x + box.width) - currentMerged.x;
                    // 更新高度為最大值
                    currentMerged.height = Math.max(currentMerged.height, box.height);
                    // 更新 Y 為最小值（最上面）
                    currentMerged.y = Math.min(currentMerged.y, box.y);
                } else {
                    // 間距太大，開始新的合併組
                    console.log(`行${lineIndex}: 不合併 "${currentMerged.text}" 和 "${box.text}", gap=${gap.toFixed(1)}`);
                    mergedBoxes.push(currentMerged);
                    currentMerged = { ...box, index: globalIndex++ };
                }
            }
        });

        if (currentMerged) {
            mergedBoxes.push(currentMerged);
        }
    });

    console.log('合併後文字框數:', mergedBoxes.length);
    return mergedBoxes;
}

/**
 * 使用 Tesseract.js 進行 OCR 辨識
 * 優先使用行級別 (lines) 結果，以保持文字合併
 */
async function performTesseractOCR(page) {
    const width = page.width;
    const height = page.height;

    try {
        // 檢查 Tesseract.js 是否可用
        if (typeof Tesseract === 'undefined') {
            console.error('Tesseract.js not loaded');
            showToast('OCR 引擎未載入，請檢查網路連線');
            return getFallbackTextBoxes(width, height);
        }

        console.log('開始 Tesseract OCR 辨識...');

        // 使用 Tesseract.js 進行 OCR
        const result = await Tesseract.recognize(
            page.imageData,
            'chi_tra+eng', // 繁體中文 + 英文
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        DOM.toastMessage.textContent = `OCR 辨識中... ${progress}%`;
                    } else if (m.status === 'loading tesseract core') {
                        DOM.toastMessage.textContent = '載入 OCR 引擎...';
                    } else if (m.status === 'loading language traineddata') {
                        DOM.toastMessage.textContent = '載入語言包...';
                    }
                }
            }
        );

        console.log('OCR 結果:', result.data);

        // 解析 OCR 結果
        const textBoxes = [];
        let index = 1;

        // 優先使用行級別 (lines) 結果，這樣文字會保持合併
        if (result.data && result.data.lines && result.data.lines.length > 0) {
            console.log('使用行級別結果，共', result.data.lines.length, '行');

            result.data.lines.forEach(line => {
                // 提高信心度閾值，過濾低品質結果
                if (line.text && line.text.trim() && line.confidence > 40) {
                    const bbox = line.bbox;

                    // 座標邊界檢查：確保座標在頁面範圍內
                    const x0 = Math.max(0, bbox.x0);
                    const y0 = Math.max(0, bbox.y0);
                    const x1 = Math.min(width, bbox.x1);
                    const y1 = Math.min(height, bbox.y1);

                    const boxWidth = x1 - x0;
                    const boxHeight = y1 - y0;

                    // 過濾掉太小的區域或無效區域
                    if (boxWidth > 20 && boxHeight > 12 && x0 < x1 && y0 < y1) {
                        textBoxes.push({
                            id: generateId(),
                            index: index++,
                            text: line.text.trim(),
                            originalText: line.text.trim(),
                            x: x0,
                            y: y0,
                            width: boxWidth,
                            height: boxHeight,
                            fontSize: boxHeight * 0.8,
                            fontFamily: 'Noto Sans TC, sans-serif',
                            color: '#1e293b',
                            isEdited: false,
                            confidence: line.confidence
                        });
                    }
                }
            });
        }

        // 如果行級別沒結果，嘗試使用段落級別
        if (textBoxes.length === 0 && result.data && result.data.paragraphs) {
            console.log('嘗試使用段落級別結果');

            result.data.paragraphs.forEach(para => {
                if (para.text && para.text.trim()) {
                    const bbox = para.bbox;
                    const boxWidth = bbox.x1 - bbox.x0;
                    const boxHeight = bbox.y1 - bbox.y0;

                    textBoxes.push({
                        id: generateId(),
                        index: index++,
                        text: para.text.trim(),
                        originalText: para.text.trim(),
                        x: bbox.x0,
                        y: bbox.y0,
                        width: boxWidth,
                        height: boxHeight,
                        fontSize: boxHeight * 0.5,
                        fontFamily: 'Noto Sans TC, sans-serif',
                        color: '#1e293b',
                        isEdited: false,
                        confidence: para.confidence
                    });
                }
            });
        }

        if (textBoxes.length > 0) {
            console.log('OCR 完成，找到', textBoxes.length, '個文字區域');
            return textBoxes;
        } else {
            showToast('OCR 未找到文字');
            return getFallbackTextBoxes(width, height);
        }

    } catch (error) {
        console.error('OCR 錯誤:', error);
        showToast('OCR 辨識失敗: ' + error.message);
        return getFallbackTextBoxes(width, height);
    }
}

// 保留舊函數名稱的兼容性
async function performMockOCR(page) {
    return performTesseractOCR(page);
}

/**
 * 備用文字框（當 OCR 失敗時使用）
 */
function getFallbackTextBoxes(width, height) {
    return [{
        id: generateId(),
        index: 1,
        text: '（無法自動辨識文字，請手動編輯）',
        originalText: '（無法自動辨識文字，請手動編輯）',
        x: width * 0.1,
        y: height * 0.05,
        width: width * 0.8,
        height: height * 0.05,
        fontSize: 20,
        fontFamily: 'Noto Sans TC, sans-serif',
        color: '#1e293b',
        isEdited: false
    }];
}

// ============================================
// 編輯器功能
// ============================================

/**
 * 開啟編輯器
 */
function openEditor(pageIndex) {
    AppState.currentPageIndex = pageIndex;
    const page = AppState.pages[pageIndex];

    hideElement(DOM.thumbnailsArea);
    showElement(DOM.editorLayout);

    // 渲染頁面到 Canvas
    renderPageToCanvas(page);

    // 渲染文字覆蓋層
    renderTextOverlays(page);

    // 渲染文字列表
    renderTextList(page);

    // 更新計數
    DOM.textBoxCount.textContent = page.textBoxes.length;

    // 設定拖曳框選功能
    setupCanvasDrawing(page);

    // 渲染左側頁面導航區
    renderPageNavigator();

    // 重置縮放
    setZoom(1);
}

/**
 * 設定 Canvas 拖曳框選功能
 */
function setupCanvasDrawing(page) {
    const canvas = DOM.editorCanvas;
    const container = DOM.pdfPreviewContainer;

    // 用於追蹤拖曳狀態
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    // 創建選擇框元素（如果不存在）
    let selectionBox = document.getElementById('selection-box');
    if (!selectionBox) {
        selectionBox = document.createElement('div');
        selectionBox.id = 'selection-box';
        selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #ea580c;
            background: rgba(234, 88, 12, 0.1);
            pointer-events: none;
            display: none;
            z-index: 100;
        `;
        container.appendChild(selectionBox);
    }

    // 移除舊的事件監聽器（如果有）
    canvas.onmousedown = null;
    canvas.onmousemove = null;
    canvas.onmouseup = null;
    canvas.onmouseleave = null;

    // 滑鼠按下：開始框選（只有左鍵）
    canvas.onmousedown = (e) => {
        // 只有左鍵（button === 0）才開始框選，右鍵用於拖動
        if (e.button !== 0) return;

        // 如果在放大模式下，且"非"吸色模式，自動跳回 100%
        // 吸色模式允許放大操作
        if (AppState.zoomLevel !== 1 && !document.body.classList.contains('color-picking')) {
            setZoom(1);
            showToast('已切換回 100% 以便精確框選');
            // 這裡直接返回，讓用戶重新點擊進行框選，避免座標跳動導致的誤操作
            return;
        }

        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isDrawing = true;

        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
    };

    // 滑鼠移動：更新框選範圍
    canvas.onmousemove = (e) => {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const width = currentX - startX;
        const height = currentY - startY;

        // 處理負值（向左上拖曳）
        selectionBox.style.left = (width < 0 ? currentX : startX) + 'px';
        selectionBox.style.top = (height < 0 ? currentY : startY) + 'px';
        selectionBox.style.width = Math.abs(width) + 'px';
        selectionBox.style.height = Math.abs(height) + 'px';
    };

    // 滑鼠放開：完成框選
    canvas.onmouseup = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        selectionBox.style.display = 'none';

        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        // 計算框選區域（轉換到頁面座標）
        const displayScale = page.displayScale || 1;
        const x = Math.min(startX, endX) / displayScale;
        const y = Math.min(startY, endY) / displayScale;
        const width = Math.abs(endX - startX) / displayScale;
        const height = Math.abs(endY - startY) / displayScale;

        // 過濾太小的選擇（可能是誤點）
        if (width > 20 && height > 15) {
            // 對框選區域進行顏色取樣（異步）
            (async () => {
                const colors = await sampleColors(page, x, y, width, height);

                // 創建新的文字框
                const newBox = {
                    id: generateId(),
                    index: page.textBoxes.length + 1,
                    text: '',
                    originalText: '',
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fontSize: Math.round(height * 0.7),
                    fontFamily: 'Noto Sans TC, sans-serif',
                    color: colors.textColor,
                    bgColor: colors.bgColor,
                    isEdited: true,
                    // 初始化不可移動的背景遮罩座標
                    maskX: x,
                    maskY: y,
                    maskWidth: width,
                    maskHeight: height
                };

                // 打開編輯對話框讓用戶輸入文字
                openEditModalForNewBox(newBox);
            })();
        }
    };

    // 滑鼠離開：取消框選
    canvas.onmouseleave = () => {
        if (isDrawing) {
            isDrawing = false;
            selectionBox.style.display = 'none';
        }
    };
}

/**
 * 為新框選區域打開編輯對話框
 */
async function openEditModalForNewBox(newBox) {
    const page = AppState.pages[AppState.currentPageIndex];

    // 暫存新框
    AppState.pendingNewBox = newBox;

    // 顯示編輯對話框
    showElement(DOM.editModal);
    DOM.originalText.textContent = '辨識中（可直接輸入跳過）...';
    DOM.editTextarea.value = '';
    DOM.editTextarea.placeholder = '請輸入要顯示的文字...';

    // 設定字體大小滑桿
    const fontSize = Math.round(newBox.fontSize);
    DOM.fontSizeSlider.value = fontSize;
    DOM.fontSizeValue.textContent = fontSize + 'px';

    // 設定顏色選擇器（使用取樣的文字色）
    const textColor = newBox.color || '#000000';
    DOM.textColorPicker.value = rgbToHex(textColor);

    // 設定背景色選擇器（使用取樣的背景色）
    const bgColor = newBox.bgColor || '#f0f0f0';
    if (DOM.bgColorPicker) {
        DOM.bgColorPicker.value = rgbToHex(bgColor);
    }

    // 設定粗體勾選框（預設勾選）
    if (DOM.boldCheckbox) {
        DOM.boldCheckbox.checked = true;
    }

    DOM.editTextarea.focus();

    // 修改儲存按鈕行為
    AppState.isNewBoxMode = true;

    // 即時 OCR 辨識該區域
    try {
        const ocrText = await performRegionOCR(page, newBox);
        if (ocrText) {
            DOM.originalText.textContent = ocrText;
            DOM.editTextarea.value = ocrText;
            DOM.editTextarea.placeholder = '修改上方辨識的文字...';
        } else {
            DOM.originalText.textContent = '（無法辨識）';
        }
    } catch (error) {
        console.log('OCR 辨識失敗:', error);
        DOM.originalText.textContent = '（無法辨識）';
    }
}

/**
 * 對指定區域進行 OCR 辨識
 */
async function performRegionOCR(page, box) {
    try {
        // 創建臨時 Canvas 來擷取選定區域
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 設定擷取區域大小
        tempCanvas.width = box.width;
        tempCanvas.height = box.height;

        // 載入原始圖片
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = page.imageData;
        });

        // 擷取選定區域
        tempCtx.drawImage(
            img,
            box.x, box.y, box.width, box.height,  // 來源區域
            0, 0, box.width, box.height            // 目標區域
        );

        const imageData = tempCanvas.toDataURL();

        // 優先使用預載入的 Worker
        if (AppState.ocrWorker) {
            const result = await AppState.ocrWorker.recognize(imageData);
            if (result.data && result.data.text) {
                return removeChineseSpaces(result.data.text.trim());
            }
        } else if (typeof Tesseract !== 'undefined') {
            // 備用：使用 Tesseract.recognize（會較慢）
            const result = await Tesseract.recognize(
                imageData,
                'chi_tra+eng',
                { logger: () => { } }
            );
            if (result.data && result.data.text) {
                return removeChineseSpaces(result.data.text.trim());
            }
        }

        return null;
    } catch (error) {
        console.error('區域 OCR 錯誤:', error);
        return null;
    }
}

/**
 * 移除中文字符之間的空格
 * Tesseract.js 辨識中文時會在每個字之間加空格
 */
function removeChineseSpaces(text) {
    if (!text) return text;

    // 移除中文字符之間的空格
    // 正則表達式：匹配中文字符後面跟著空格再跟著中文字符的情況
    return text.replace(/([一-龥])\s+([一-龥])/g, '$1$2')
        .replace(/([一-龥])\s+([一-龥])/g, '$1$2'); // 執行兩次確保全部處理
}

/**
 * 從圖片取樣背景顏色和文字顏色（異步版本）
 * 策略：頻率統計法 - 出現最多的顏色是背景色
 */
async function sampleColors(page, x, y, width, height) {
    const result = {
        bgColor: '#f0f0f0',
        textColor: '#000000'
    };

    try {
        // 創建臨時 Canvas 來讀取像素
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // 載入原始圖片（等待載入完成）
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = page.imageData;
        });

        // 設定 Canvas 大小
        tempCanvas.width = page.width;
        tempCanvas.height = page.height;

        // 繪製圖片
        tempCtx.drawImage(img, 0, 0);

        // === 對框選區域進行網格取樣 ===
        const sampleStep = Math.max(2, Math.floor(Math.min(width, height) / 25));
        const colorCounts = {};

        for (let sy = y + 1; sy < y + height - 1; sy += sampleStep) {
            for (let sx = x + 1; sx < x + width - 1; sx += sampleStep) {
                try {
                    const p = tempCtx.getImageData(Math.floor(sx), Math.floor(sy), 1, 1).data;
                    // 簡化顏色（每 24 為一組，進一步減少顏色種類以提高統計準確度）
                    const r = Math.round(p[0] / 24) * 24;
                    const g = Math.round(p[1] / 24) * 24;
                    const b = Math.round(p[2] / 24) * 24;
                    const key = `${r},${g},${b}`;
                    colorCounts[key] = (colorCounts[key] || 0) + 1;
                } catch (e) { }
            }
        }

        // 找出出現最多的顏色（主要背景色）
        let maxCount = 0;
        let dominantColor = '240,240,240';
        for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantColor = color;
            }
        }

        const [bgR, bgG, bgB] = dominantColor.split(',').map(Number);
        result.bgColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

        // === 根據背景亮度決定文字色（黑或白）===
        const bgBrightness = (bgR * 299 + bgG * 587 + bgB * 114) / 1000;
        result.textColor = bgBrightness > 128 ? '#000000' : '#ffffff';

        return result;
    } catch (error) {
        console.error('取樣顏色失敗:', error);
        return result;
    }
}

// 保留舊函數名稱的兼容性
function sampleBackgroundColor(page, x, y, width, height) {
    return sampleColors(page, x, y, width, height).bgColor;
}

/**
 * 渲染頁面到 Canvas
 */
function renderPageToCanvas(page) {
    const canvas = DOM.editorCanvas;
    const ctx = canvas.getContext('2d');
    const container = DOM.pdfPreviewContainer;

    // 計算顯示尺寸（適應容器寬度）
    const maxWidth = container.parentElement.clientWidth - 60;
    const scale = Math.min(maxWidth / page.width, 1);

    canvas.width = page.width * scale;
    canvas.height = page.height * scale;

    // 設定容器大小
    container.style.width = canvas.width + 'px';
    container.style.height = canvas.height + 'px';

    // 繪製背景圖片
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 繪製編輯過的文字和遮蓋區域
        if (page.textBoxes) {
            page.textBoxes.forEach(box => {
                if (box.isEdited) {
                    // 1. 使用背景色覆蓋原有內容 (使用 maskX/Y 固定遮罩位置)
                    // 如果有 maskX 則使用它，否則回退到 box.x (相容舊資料或尚未初始化的情況)
                    const maskX = box.maskX !== undefined ? box.maskX : box.x;
                    const maskY = box.maskY !== undefined ? box.maskY : box.y;
                    const maskW = box.maskWidth !== undefined ? box.maskWidth : box.width;
                    const maskH = box.maskHeight !== undefined ? box.maskHeight : box.height;

                    // 僅當有背景色或為舊有遮罩時才繪製背景
                    const isLegacyMask = box.maskX !== undefined;
                    if (box.bgColor || isLegacyMask) {
                        ctx.fillStyle = box.bgColor || '#ffffff';
                        ctx.fillRect(
                            maskX * scale,
                            maskY * scale,
                            maskW * scale,
                            maskH * scale
                        );
                    }

                    // 2. 如果有文字，繪製文字（垂直置中）
                    // 文字跟隨 box.x/y 移動 (UI 框框的位置)
                    if (box.text && !box.isCoverOnly) {
                        ctx.fillStyle = box.color || '#000000';
                        const fontWeight = box.isBold !== false ? 'bold' : 'normal';
                        ctx.font = `${fontWeight} ${box.fontSize * scale}px ${box.fontFamily || 'Noto Sans TC, sans-serif'}`;

                        // 直排文字繪製邏輯
                        if (box.isVertical) {
                            ctx.textBaseline = 'top';
                            ctx.textAlign = 'center';
                            const fontSize = box.fontSize * scale;
                            const lineHeight = fontSize; // 行高
                            const lines = box.text.split('\n');

                            // 直排從右到左繪製
                            // 起始 X = 框框右邊界 - 半個字寬 - padding
                            let startX = (box.x + box.width) * scale - (fontSize / 2) - 4;

                            lines.forEach(line => {
                                let startY = box.y * scale + 4; // 起始 Y
                                for (let char of line) {
                                    // 檢查是否為全形標點 (簡單處理，不旋轉)
                                    ctx.fillText(char, startX, startY);
                                    startY += lineHeight;
                                }
                                startX -= lineHeight * 1.2; // 下一行往左移
                            });
                        } else {
                            // 橫排文字繪製邏輯 (維持原樣)
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'left';
                            ctx.fillText(
                                box.text,
                                box.x * scale + 4,
                                (box.y + box.height / 2) * scale
                            );
                        }
                    }
                }
            });
        }
    };
    img.src = page.imageData;

    // 儲存顯示縮放比例
    page.displayScale = scale;
}

/**
 * 渲染文字覆蓋層
 */
function renderTextOverlays(page) {
    DOM.textOverlays.innerHTML = '';

    if (!AppState.showTextBoxes) return;

    const displayScale = page.displayScale || 1;
    const pageScale = page.scale || 2;

    page.textBoxes.forEach((box) => {
        const overlay = createTextOverlay(box, displayScale, pageScale);
        DOM.textOverlays.appendChild(overlay);
    });
}

/**
 * 建立文字覆蓋元素
 */
function createTextOverlay(box, displayScale, pageScale) {
    const div = document.createElement('div');
    div.className = 'text-box' + (box.isEdited ? ' edited' : '') + (box.isVertical ? ' vertical' : '');
    div.dataset.id = box.id;

    // 座標已經是按 pageScale 縮放的（在頁面圖片座標系中）
    // 顯示時只需要縮放到顯示尺寸
    const ratio = displayScale;

    // 計算位置和大小
    div.style.left = `${box.x * ratio}px`;
    div.style.top = `${box.y * ratio}px`;
    div.style.width = `${box.width * ratio}px`;
    div.style.height = `${box.height * ratio}px`;

    // 添加縮放手柄
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    div.appendChild(resizeHandle);

    // 雙擊開啟編輯對話框
    div.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openEditModal(box);
    });

    // 單擊選中框框（獲得焦點以使用方向鍵）
    div.addEventListener('click', (e) => {
        e.stopPropagation();
        // 移除其他框框的選中狀態
        document.querySelectorAll('.text-box.selected').forEach(el => {
            el.classList.remove('selected');
        });
        // 添加選中狀態
        div.classList.add('selected');
        div.focus();
    });

    // 拖動移動功能
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startLeft, startTop, startWidth, startHeight;

    div.addEventListener('mousedown', (e) => {
        if (e.target === resizeHandle) return; // 縮放手柄另外處理

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(div.style.left);
        startTop = parseFloat(div.style.top);
        div.style.cursor = 'grabbing';

        // 懶加載初始化 Mask 座標 (如果尚未設定，例如載入舊存檔)
        // 鎖定當前位置為 Mask 位置


        // 確保框框獲得焦點
        div.focus();

        e.preventDefault();
        e.stopPropagation();
    });

    // 縮放功能
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseFloat(div.style.width);
        startHeight = parseFloat(div.style.height);
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            div.style.left = `${startLeft + dx}px`;
            div.style.top = `${startTop + dy}px`;
        }
        if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newWidth = Math.max(30, startWidth + dx);
            const newHeight = Math.max(20, startHeight + dy);
            div.style.width = `${newWidth}px`;
            div.style.height = `${newHeight}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            div.style.cursor = 'move';

            // 檢查是否真的移動了 (避免無意義的點擊觸發歷史紀錄)
            // 這裡簡單檢查一下 style 與 box 原始值
            // 不過既然 isDragging 為 true，通常表示mousemove觸發了

            // 在更新 box 屬性前儲存歷史紀錄
            saveHistory();

            // 更新 box 座標
            const page = AppState.pages[AppState.currentPageIndex];
            box.x = parseFloat(div.style.left) / ratio;
            box.y = parseFloat(div.style.top) / ratio;

            // 重新繪製 Canvas
            renderPageToCanvas(page);
        }
        if (isResizing) {
            isResizing = false;

            // 在更新 box 屬性前儲存歷史紀錄
            saveHistory();

            // 更新 box 尺寸和字體大小
            const page = AppState.pages[AppState.currentPageIndex];
            box.width = parseFloat(div.style.width) / ratio;
            box.height = parseFloat(div.style.height) / ratio;

            // 依據方向自動調整字體大小
            if (box.isVertical) {
                // 直排：依據寬度調整字級 (因為直排的高度是用來排版長度的)
                box.fontSize = Math.round(box.width * 0.7);
            } else {
                // 橫排：依據高度調整字級
                box.fontSize = Math.round(box.height * 0.7);
            }


            // 重新繪製 Canvas
            renderPageToCanvas(page);
        }
    });

    // 滑鼠進入時高亮列表項目
    div.addEventListener('mouseenter', () => highlightListItem(box.id, true));
    div.addEventListener('mouseleave', () => highlightListItem(box.id, false));

    // 讓 div 可以接收鍵盤事件
    div.setAttribute('tabindex', '0');

    // 方向鍵微調位置
    div.addEventListener('keydown', (e) => {
        // 計算位移量（像素）
        const step = e.shiftKey ? 10 : 1;
        let moved = false;

        // 懶加載初始化 Mask 座標 (如果尚未設定)
        if (box.maskX === undefined && !box.isFreeFloating) {
            box.maskX = box.x;
            box.maskY = box.y;
            box.maskWidth = box.width;
            box.maskHeight = box.height;
        }

        switch (e.key) {
            case 'ArrowUp':
                div.style.top = `${parseFloat(div.style.top) - step}px`;
                moved = true;
                break;
            case 'ArrowDown':
                div.style.top = `${parseFloat(div.style.top) + step}px`;
                moved = true;
                break;
            case 'ArrowLeft':
                div.style.left = `${parseFloat(div.style.left) - step}px`;
                moved = true;
                break;
            case 'ArrowRight':
                div.style.left = `${parseFloat(div.style.left) + step}px`;
                moved = true;
                break;
        }

        if (moved) {
            e.preventDefault();

            // 更新 box 座標（文字與 UI 框框移動）
            // 注意：maskX/maskY 沒有更新，所以背景遮罩會留在原地
            const page = AppState.pages[AppState.currentPageIndex];
            box.x = parseFloat(div.style.left) / ratio;
            box.y = parseFloat(div.style.top) / ratio;

            renderPageToCanvas(page);
            showToast('已微調文字位置（背景保持固定）');
        }
    });

    return div;
}

/**
 * 渲染文字區域列表
 */
function renderTextList(page) {
    DOM.textList.innerHTML = '';

    page.textBoxes.forEach((box, idx) => {
        const item = document.createElement('div');
        item.className = 'text-list-item' + (box.isEdited ? ' edited' : '');
        item.dataset.id = box.id;

        item.innerHTML = `
            <div class="item-content">
                <span class="item-number">${box.index || '自訂'}</span>
                <span class="item-text">${escapeHtml(box.text || '(無內容)')}</span>
                ${box.isEdited ? '<span class="item-status">已修改</span>' : ''}
            </div>
            <button class="delete-item-btn" title="刪除此修改">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        // 點擊內容區域開啟編輯對話框
        const content = item.querySelector('.item-content');
        content.addEventListener('click', () => openEditModal(box));

        // 點擊刪除按鈕
        const deleteBtn = item.querySelector('.delete-item-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTextBox(box.id);
        });

        // 滑鼠進入時高亮文字框
        item.addEventListener('mouseenter', () => highlightTextBox(box.id, true));
        item.addEventListener('mouseleave', () => highlightTextBox(box.id, false));

        DOM.textList.appendChild(item);
    });
}

/**
 * 刪除文字框
 */
function deleteTextBox(boxId) {
    saveHistory();
    const page = AppState.pages[AppState.currentPageIndex];
    const index = page.textBoxes.findIndex(b => b.id === boxId);

    if (index > -1) {
        page.textBoxes.splice(index, 1);

        // 重新編號
        page.textBoxes.forEach((box, i) => {
            box.index = i + 1;
        });

        // 更新顯示
        renderPageToCanvas(page);
        renderTextOverlays(page);
        renderTextList(page);
        DOM.textBoxCount.textContent = page.textBoxes.length;

        showToast('已刪除');
    }
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 高亮列表項目
 */
function highlightListItem(boxId, active) {
    const item = DOM.textList.querySelector(`[data-id="${boxId}"]`);
    if (item) {
        item.classList.toggle('active', active);
    }
}

/**
 * 高亮文字框
 */
function highlightTextBox(boxId, active) {
    const box = DOM.textOverlays.querySelector(`[data-id="${boxId}"]`);
    if (box) {
        box.classList.toggle('active', active);
    }
}

/**
 * 開啟編輯對話框
 */
function openEditModal(box) {
    AppState.activeTextBoxId = box.id;
    AppState.isNewBoxMode = false;

    DOM.originalText.textContent = box.originalText;
    DOM.editTextarea.value = box.text;

    // 設定字體大小
    if (DOM.fontSizeSlider && box.fontSize) {
        DOM.fontSizeSlider.value = box.fontSize;
        DOM.fontSizeValue.textContent = box.fontSize + 'px';
    }

    // 設定文字顏色
    if (DOM.textColorPicker && box.color) {
        DOM.textColorPicker.value = rgbToHex(box.color);
    }

    // 設定背景顏色
    if (DOM.bgColorPicker && box.bgColor) {
        DOM.bgColorPicker.value = rgbToHex(box.bgColor);
    }

    // 設定粗體
    if (DOM.boldCheckbox) {
        DOM.boldCheckbox.checked = box.isBold !== false;
    }

    showElement(DOM.editModal);
    DOM.editTextarea.focus();
    DOM.editTextarea.select();
}

/**
 * 關閉編輯對話框
 */
function closeEditModal() {
    hideElement(DOM.editModal);
    AppState.activeTextBoxId = null;
    AppState.isNewBoxMode = false;
    AppState.pendingNewBox = null;
}

/**
 * 儲存編輯
 */
function saveEdit() {
    // 在修改前儲存歷史紀錄
    saveHistory();

    const page = AppState.pages[AppState.currentPageIndex];
    const newText = DOM.editTextarea.value;
    const fontSize = parseInt(DOM.fontSizeSlider.value) || 24;
    const textColor = DOM.textColorPicker.value || '#000000';
    const bgColor = DOM.bgColorPicker ? DOM.bgColorPicker.value : '#f0f0f0';
    const isBold = DOM.boldCheckbox ? DOM.boldCheckbox.checked : true;

    // 新增框選模式
    if (AppState.isNewBoxMode && AppState.pendingNewBox) {
        const newBox = AppState.pendingNewBox;
        newBox.fontSize = fontSize;
        newBox.color = textColor;
        newBox.bgColor = bgColor;
        newBox.isBold = isBold;
        newBox.isEdited = true;



        if (newText.trim()) {
            // 有文字：正常文字框
            newBox.text = newText;
            newBox.isCoverOnly = false;
            showToast('已新增文字區域');
        } else {
            // 無文字：純背景遮蓋
            newBox.text = '';
            newBox.isCoverOnly = true;
            showToast('已新增遮蓋區域');
        }

        // 添加到頁面的文字框陣列
        page.textBoxes.push(newBox);

        // 更新顯示
        renderPageToCanvas(page);
        renderTextOverlays(page);
        renderTextList(page);
        DOM.textBoxCount.textContent = page.textBoxes.length;
    } else {
        // 編輯現有文字框模式
        const box = page.textBoxes.find(b => b.id === AppState.activeTextBoxId);

        if (box) {
            box.text = newText;
            box.fontSize = fontSize;
            box.color = textColor;
            box.bgColor = bgColor;  // 保存背景色
            box.isBold = isBold;  // 保存粗體設定
            box.isEdited = true;

            // 如果遮罩座標尚未初始化 (例如舊資料)，則初始化為當前位置
            // 新增的物件 (isFreeFloating) 不應產生 Mask
            if (box.maskX === undefined && !box.isFreeFloating) {
                box.maskX = box.x;
                box.maskY = box.y;
                box.maskWidth = box.width;
                box.maskHeight = box.height;
            }

            // 更新顯示
            renderPageToCanvas(page);
            renderTextOverlays(page);
            renderTextList(page);

            showToast('已儲存修改');
        }
    }

    closeEditModal();
}

/**
 * 返回縮圖頁面
 */
function backToThumbnails() {
    hideElement(DOM.editorLayout);
    showElement(DOM.thumbnailsArea);
    AppState.currentPageIndex = -1;
}

/**
 * 切換文字框顯示/隱藏
 */
function toggleTextBoxVisibility() {
    AppState.showTextBoxes = !AppState.showTextBoxes;

    if (AppState.currentPageIndex >= 0) {
        const page = AppState.pages[AppState.currentPageIndex];
        renderTextOverlays(page);
    }

    showToast(AppState.showTextBoxes ? '顯示文字框' : '隱藏文字框');
}

/**
 * 切換預覽模式
 */
function togglePreviewMode() {
    AppState.isPreviewMode = !AppState.isPreviewMode;

    // 切換按鈕狀態
    if (DOM.previewToggle) {
        DOM.previewToggle.classList.toggle('active', AppState.isPreviewMode);
    }

    // 切換 text-overlays 的預覽模式 class
    if (DOM.textOverlays) {
        DOM.textOverlays.classList.toggle('preview-mode', AppState.isPreviewMode);
    }

    showToast(AppState.isPreviewMode ? '預覽模式：隱藏邊框' : '編輯模式：顯示邊框');
}

/**
 * 設置縮放比例
 */
function setZoom(level) {
    // 限制縮放範圍 (25% - 300%)
    AppState.zoomLevel = Math.max(0.25, Math.min(3, level));

    // 更新顯示
    if (DOM.zoomLevel) {
        DOM.zoomLevel.textContent = Math.round(AppState.zoomLevel * 100) + '%';
    }

    // 應用縮放
    if (DOM.pdfPreviewContainer) {
        DOM.pdfPreviewContainer.style.transform = `scale(${AppState.zoomLevel})`;

        // 設定容器最小尺寸，確保 viewport 可以滾動到所有區域
        const page = AppState.pages[AppState.currentPageIndex];
        if (page) {
            const scaledWidth = page.width * (page.displayScale || 1) * AppState.zoomLevel;
            const scaledHeight = page.height * (page.displayScale || 1) * AppState.zoomLevel;
            DOM.pdfPreviewContainer.style.minWidth = scaledWidth + 'px';
            DOM.pdfPreviewContainer.style.minHeight = scaledHeight + 'px';
        }
    }
}

/**
 * 渲染頁面導航區（縮圖列表）
 */
function renderPageNavigator() {
    if (!DOM.pageThumbnailsList) return;

    DOM.pageThumbnailsList.innerHTML = '';

    AppState.pages.forEach((page, index) => {
        const item = document.createElement('div');
        item.className = 'page-nav-item' + (index === AppState.currentPageIndex ? ' active' : '');
        item.dataset.index = index;

        item.innerHTML = `
            <img src="${page.imageData}" alt="頁面 ${page.pageNumber}">
            <span class="page-nav-number">${page.pageNumber}</span>
        `;

        item.addEventListener('click', () => {
            switchToPage(index);
        });

        DOM.pageThumbnailsList.appendChild(item);
    });
}

/**
 * 切換到指定頁面
 */
function switchToPage(index) {
    if (index < 0 || index >= AppState.pages.length) return;

    AppState.currentPageIndex = index;
    const page = AppState.pages[index];

    // 更新導航區的選中狀態
    document.querySelectorAll('.page-nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // 重新渲染
    renderPageToCanvas(page);
    renderTextOverlays(page);
    renderTextList(page);
    DOM.textBoxCount.textContent = page.textBoxes.length;

    // 重置縮放
    setZoom(1);
}


// ============================================
// 下載功能
// ============================================

/**
 * 下載編輯後的 PDF
 */
async function downloadEditedPDF() {
    if (AppState.pages.length === 0) {
        showToast('請先上傳 PDF');
        return;
    }

    showToast('正在生成 PDF，請稍候...');

    try {
        // 使用 jsPDF 創建 PDF
        const { jsPDF } = window.jspdf;

        // 取得第一頁的尺寸作為 PDF 尺寸
        const firstPage = AppState.pages[0];
        const pdfWidth = firstPage.width;
        const pdfHeight = firstPage.height;

        // 創建 PDF（使用毫米作為單位，需要轉換）
        const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [pdfWidth, pdfHeight]
        });

        // 處理每一頁
        for (let i = 0; i < AppState.pages.length; i++) {
            const page = AppState.pages[i];

            // 如果不是第一頁，添加新頁面
            if (i > 0) {
                pdf.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
            }

            // 建立 Canvas 來繪製頁面
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = page.width;
            canvas.height = page.height;

            // 繪製原始圖片
            const img = new Image();
            await new Promise(resolve => {
                img.onload = resolve;
                img.src = page.imageData;
            });
            ctx.drawImage(img, 0, 0);

            // 繪製編輯後的文字框和遮蓋區域
            if (page.textBoxes) {
                page.textBoxes.forEach(box => {
                    if (box.isEdited) {
                        // 使用背景色覆蓋原有內容 (使用 maskX/Y 固定遮罩位置)
                        const maskX = box.maskX !== undefined ? box.maskX : box.x;
                        const maskY = box.maskY !== undefined ? box.maskY : box.y;
                        const maskW = box.maskWidth !== undefined ? box.maskWidth : box.width;
                        const maskH = box.maskHeight !== undefined ? box.maskHeight : box.height;

                        // 僅當有背景色或為舊有遮罩時才繪製背景
                        const isLegacyMask = box.maskX !== undefined;
                        if (box.bgColor || isLegacyMask) {
                            ctx.fillStyle = box.bgColor || '#ffffff';
                            ctx.fillRect(maskX, maskY, maskW, maskH);
                        }

                        // 如果有文字（非純遮蓋），繪製文字
                        if (box.text && !box.isCoverOnly) {
                            ctx.fillStyle = box.color || '#000000';
                            const fontWeight = box.isBold !== false ? 'bold' : 'normal';
                            ctx.font = `${fontWeight} ${box.fontSize}px ${box.fontFamily || 'Noto Sans TC, sans-serif'}`;

                            if (box.isVertical) {
                                ctx.textBaseline = 'top';
                                ctx.textAlign = 'center';
                                const fontSize = box.fontSize;
                                const lineHeight = fontSize;
                                const lines = box.text.split('\n');

                                let startX = (box.x + box.width) - (fontSize / 2) - 4;

                                lines.forEach(line => {
                                    let startY = box.y + 4;
                                    for (let char of line) {
                                        ctx.fillText(char, startX, startY);
                                        startY += lineHeight;
                                    }
                                    startX -= lineHeight * 1.2;
                                });
                            } else {
                                ctx.textBaseline = 'middle';
                                ctx.textAlign = 'left';
                                ctx.fillText(box.text, box.x + 4, box.y + box.height / 2);
                            }
                        }
                    }
                });
            }

            // 將 Canvas 轉換為圖片並添加到 PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, page.width, page.height);

            // 更新進度
            showToast(`正在處理頁面 ${i + 1}/${AppState.pages.length}...`);
        }

        // 下載 PDF
        pdf.save('edited_document.pdf');
        showToast('PDF 已下載！');

    } catch (error) {
        console.error('匯出 PDF 錯誤:', error);
        showToast('匯出失敗，請重試');
    }
}

// ============================================
// 其他功能
// ============================================

/**
 * 切換最愛狀態
 */
function toggleFavorite() {
    AppState.isFavorite = !AppState.isFavorite;
    DOM.favoriteBtn.classList.toggle('active', AppState.isFavorite);

    if (AppState.isFavorite) {
        showToast('已加入最愛');
    } else {
        showToast('已移除最愛');
    }
}

/**
 * 切換語言
 */
function switchLanguage(lang) {
    AppState.language = lang;

    DOM.langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    showToast(lang === 'zh-TW' ? '已切換至繁體中文' : '已切换至简体中文');
}

/**
 * 初始化滾動動畫
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.problem-card, .feature-card, .step-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-scroll', 'visible');
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });
}

/**
 * 平滑滾動到錨點
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// 初始化
// ============================================

/**
 * 應用程式初始化
 */
function init() {
    // 設定 PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // 初始化應用（無需登入）
    initApp();

    // 綁定事件
    if (DOM.helpBtn) {
        DOM.helpBtn.addEventListener('click', () => showElement(DOM.helpModal));
    }
    if (DOM.closeHelpBtn) {
        DOM.closeHelpBtn.addEventListener('click', () => hideElement(DOM.helpModal));
    }
    if (DOM.closeHelpBtnBottom) {
        DOM.closeHelpBtnBottom.addEventListener('click', () => hideElement(DOM.helpModal));
    }
    if (DOM.helpModal) {
        DOM.helpModal.addEventListener('click', (e) => {
            if (e.target === DOM.helpModal) hideElement(DOM.helpModal);
        });
    }

    DOM.downloadBtn.addEventListener('click', downloadEditedPDF);

    // 匯入 PDF 按鈕（觸發文件選擇器）
    if (DOM.importPdfBtn) {
        DOM.importPdfBtn.addEventListener('click', () => {
            DOM.fileInput.click();
        });
    }

    // 匯出 PDF 按鈕
    if (DOM.exportPdfBtn) {
        DOM.exportPdfBtn.addEventListener('click', downloadEditedPDF);
    }

    // 切換文字框顯示
    if (DOM.toggleVisibility) {
        DOM.toggleVisibility.addEventListener('click', toggleTextBoxVisibility);
    }

    // 預覽模式切換
    if (DOM.previewToggle) {
        DOM.previewToggle.addEventListener('click', togglePreviewMode);
    }

    // 縮放控制
    if (DOM.zoomIn) {
        DOM.zoomIn.addEventListener('click', () => setZoom(AppState.zoomLevel + 0.1));
    }
    if (DOM.zoomOut) {
        DOM.zoomOut.addEventListener('click', () => setZoom(AppState.zoomLevel - 0.1));
    }
    if (DOM.zoomReset) {
        DOM.zoomReset.addEventListener('click', () => setZoom(1));
    }
    // Undo / Redo 按鈕
    if (DOM.undoBtn) DOM.undoBtn.addEventListener('click', undo);
    if (DOM.redoBtn) DOM.redoBtn.addEventListener('click', redo);

    // 滾輪縮放
    if (DOM.pdfViewport) {
        DOM.pdfViewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom(AppState.zoomLevel + delta);
            }
        }, { passive: false });

        // 右鍵拖動功能
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        // 禁用右鍵選單
        DOM.pdfViewport.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        DOM.pdfViewport.addEventListener('mousedown', (e) => {
            // 右鍵（button === 2）開始拖動
            if (e.button === 2) {
                isDragging = true;
                startX = e.pageX - DOM.pdfViewport.offsetLeft;
                startY = e.pageY - DOM.pdfViewport.offsetTop;
                scrollLeft = DOM.pdfViewport.scrollLeft;
                scrollTop = DOM.pdfViewport.scrollTop;
                DOM.pdfViewport.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        DOM.pdfViewport.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - DOM.pdfViewport.offsetLeft;
            const y = e.pageY - DOM.pdfViewport.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            DOM.pdfViewport.scrollLeft = scrollLeft - walkX;
            DOM.pdfViewport.scrollTop = scrollTop - walkY;
        });

        DOM.pdfViewport.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                isDragging = false;
                DOM.pdfViewport.style.cursor = '';
            }
        });

        DOM.pdfViewport.addEventListener('mouseleave', () => {
            isDragging = false;
            DOM.pdfViewport.style.cursor = '';
        });
    }

    // 編輯對話框事件
    DOM.closeModalBtn.addEventListener('click', closeEditModal);
    DOM.cancelEditBtn.addEventListener('click', closeEditModal);
    DOM.saveEditBtn.addEventListener('click', saveEdit);

    // 吸取顏色功能 & 新增物件功能
    // let colorPickMode = null; // 已移至 AppState.colorPickingMode

    // 綁定吸取按鈕
    if (DOM.pickTextColorBtn) {
        DOM.pickTextColorBtn.addEventListener('click', () => startColorPicking('text'));
    }
    if (DOM.pickBgColorBtn) {
        DOM.pickBgColorBtn.addEventListener('click', () => startColorPicking('bg'));
    }

    // 綁定新增按鈕
    if (DOM.addCoverBtn) {
        DOM.addCoverBtn.addEventListener('click', () => {
            startColorPicking('new_cover');
            showToast('請點擊圖片吸取背景顏色，將自動產生遮罩');
        });
    }
    if (DOM.addHTextBtn) {
        DOM.addHTextBtn.addEventListener('click', () => startAddText(false));
    }
    if (DOM.addVTextBtn) {
        DOM.addVTextBtn.addEventListener('click', () => startAddText(true));
    }



    // ESC 取消吸取模式
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && AppState.colorPickingMode) {
            cancelColorPicking();
            showToast('已取消吸取顏色');
        }
    });

    // 在 Canvas 上點擊吸取顏色
    if (DOM.editorCanvas) {
        DOM.editorCanvas.addEventListener('click', async (e) => {
            if (!AppState.colorPickingMode) return;

            const page = AppState.pages[AppState.currentPageIndex];
            if (!page) return;

            const rect = DOM.editorCanvas.getBoundingClientRect();
            const displayScale = page.displayScale || 1;
            const zoomLevel = AppState.zoomLevel || 1;

            // 計算座標時考慮縮放：點擊位置 / (顯示縮放 * 放大倍率)
            const x = (e.clientX - rect.left) / (displayScale * zoomLevel);
            const y = (e.clientY - rect.top) / (displayScale * zoomLevel);

            // 計算 Canvas 上的像素座標 (用於 getImageData)
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;

            // 取得 Canvas Context
            const ctx = DOM.editorCanvas.getContext('2d', { willReadFrequently: true });

            // 取得像素顏色
            const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
            const color = { r: pixel[0], g: pixel[1], b: pixel[2] };
            const hexColor = rgbToHex(color);

            // 根據模式處理
            if (AppState.colorPickingMode === 'new_cover') {
                // 產生新的遮蓋框
                createCoverBox(hexColor, x, y); //使用 PDF 座標
                showToast('已產生覆蓋遮罩，請調整位置');
            } else if (AppState.colorPickingMode === 'text') {
                if (DOM.textColorPicker) DOM.textColorPicker.value = hexColor;
                showToast(`已吸取文字顏色: ${hexColor}`);
            } else if (AppState.colorPickingMode === 'bg') {
                if (DOM.bgColorPicker) DOM.bgColorPicker.value = hexColor;
                showToast(`已吸取背景顏色: ${hexColor}`);
            }

            // 重置吸取模式並返回對話框 (new_cover 模式下可能不需要返回對話框，但取消吸管狀態是必須的)
            cancelColorPicking();
        });
    }

    // 點擊背景關閉對話框
    DOM.editModal.addEventListener('click', (e) => {
        if (e.target === DOM.editModal) {
            closeEditModal();
        }
    });





    // 鍵盤事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
        }
        if (e.key === 'Enter' && e.ctrlKey && !DOM.editModal.classList.contains('hidden')) {
            saveEdit();
        }

        // Undo (Ctrl+Z)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        // Redo (Ctrl+Y 或 Ctrl+Shift+Z)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            redo();
        }
    });

    // 語言切換
    DOM.langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
    });

    // 初始化上傳區域
    initUploadArea();

    // 初始化動畫
    initScrollAnimations();
    initSmoothScroll();

    // 預載入 OCR 語言包（繁體中文）
    preloadOCRLanguage();

    console.log('NotebookLM 簡報編輯器 V2 已初始化');
}

/**
 * 預載入 Tesseract.js OCR 語言包
 */
async function preloadOCRLanguage() {
    if (typeof Tesseract === 'undefined') {
        console.log('Tesseract.js 未載入，跳過預載入');
        return;
    }

    try {
        console.log('開始預載入 OCR 語言包（繁體中文 + 英文）...');

        // 創建 Worker 並預載入語言包
        const worker = await Tesseract.createWorker({
            logger: m => {
                if (m.status === 'loading language traineddata') {
                    console.log(`載入語言包: ${m.progress ? Math.round(m.progress * 100) + '%' : '...'}`);
                }
            }
        });

        // 載入繁體中文和英文語言包
        await worker.loadLanguage('chi_tra+eng');
        await worker.initialize('chi_tra+eng');

        // 存儲 Worker 以便後續使用
        AppState.ocrWorker = worker;

        console.log('OCR 語言包預載入完成！');
    } catch (error) {
        console.error('預載入 OCR 語言包失敗:', error);
    }
}


// ============================================
// Helper Functions (Moved from init)
// ============================================

/**
 * 開始吸取顏色
 */
function startColorPicking(mode) {
    AppState.colorPickingMode = mode;
    // 暫時隱藏對話框 (只有在編輯模式下才隱藏，如果是 new_cover 則不用)
    if (mode !== 'new_cover' && DOM.editModal) {
        DOM.editModal.style.opacity = '0';
        DOM.editModal.style.pointerEvents = 'none';
    }
    if (DOM.editorCanvas) DOM.editorCanvas.style.cursor = 'crosshair';
    document.body.classList.add('color-picking');

    let msg = '點擊圖片吸取顏色｜Ctrl+滾輪縮放｜ESC 取消';
    if (mode === 'text') msg = '點擊圖片吸取文字顏色｜Ctrl+滾輪縮放｜ESC 取消';
    if (mode === 'bg') msg = '點擊圖片吸取背景顏色｜Ctrl+滾輪縮放｜ESC 取消';
    if (mode === 'new_cover') msg = '點擊圖片吸取背景色以產生遮罩｜ESC 取消';

    showToast(msg);
}

/**
 * 取消吸取模式的函數
 */
function cancelColorPicking() {
    AppState.colorPickingMode = null;
    if (DOM.editModal) {
        DOM.editModal.style.opacity = '';
        DOM.editModal.style.pointerEvents = '';
    }
    if (DOM.editorCanvas) DOM.editorCanvas.style.cursor = '';
    document.body.classList.remove('color-picking');
    if (DOM.pickTextColorBtn) DOM.pickTextColorBtn.classList.remove('active');
    if (DOM.pickBgColorBtn) DOM.pickBgColorBtn.classList.remove('active');

    // 回到 100% 縮放
    setZoom(1);
}

/**
 * 開始新增文字框 (Helper)
 */
function startAddText(isVertical = false) {
    AppState.isNewBoxMode = true;
    AppState.activeTextBoxId = null;

    // 預設位置
    const page = AppState.pages[AppState.currentPageIndex];
    if (!page) { showToast('請先選擇頁面'); return; }

    AppState.pendingNewBox = {
        id: Date.now().toString(),
        x: 100,
        y: 100,
        width: isVertical ? 60 : 300,
        height: isVertical ? 200 : 60,
        isVertical: isVertical,
        fontSize: 24,
        isBold: true,
        color: '#000000',
        bgColor: null,
        text: '',
        originalText: '',
        isFreeFloating: true // 標記為自由浮動物件，不產生固定 Mask
    };

    if (DOM.originalText) DOM.originalText.textContent = '(新增文字)';
    if (DOM.editTextarea) DOM.editTextarea.value = '';

    // 重置選項
    if (DOM.fontSizeSlider) { DOM.fontSizeSlider.value = 24; if (DOM.fontSizeValue) DOM.fontSizeValue.textContent = '24px'; }
    if (DOM.textColorPicker) DOM.textColorPicker.value = '#000000';
    if (DOM.bgColorPicker) DOM.bgColorPicker.value = '#ffffff';
    if (DOM.boldCheckbox) DOM.boldCheckbox.checked = true;

    if (DOM.editModal) {
        showElement(DOM.editModal);
        if (DOM.editTextarea) DOM.editTextarea.focus();
    }
}

/**
 * 創建覆蓋遮罩 (Helper)
 */
function createCoverBox(color, x, y) {
    saveHistory();

    const page = AppState.pages[AppState.currentPageIndex];
    if (!page) return;

    const newBox = {
        id: Date.now().toString(),
        x: x,
        y: y,
        width: 150,
        height: 60,
        text: '',
        isCoverOnly: true,
        isEdited: true,
        bgColor: color,
        isFreeFloating: true // 標記為自由浮動物件
    };

    if (!page.textBoxes) page.textBoxes = [];
    page.textBoxes.push(newBox);

    renderPageToCanvas(page);
    renderTextOverlays(page);
    renderTextList(page);
    if (DOM.textBoxCount) DOM.textBoxCount.textContent = page.textBoxes.length;
}


// ============================================
// 歷史紀錄管理 (History Manager) - 純前端實作
// ============================================

/**
 * 儲存當前狀態到歷史紀錄
 * 觸發時機：新增、修改、刪除、移動結束
 */
function saveHistory() {
    // 如果沒有載入頁面，不動作
    if (AppState.currentPageIndex === -1 || !AppState.pages[AppState.currentPageIndex]) return;

    // 深拷貝當前頁面的文字框狀態
    const currentPage = AppState.pages[AppState.currentPageIndex];
    // 使用 JSON 序列化進行深拷貝 (確保斷開引用)
    // 注意：因為我們是純前端，且物件結構簡單，JSON 方法是最高效安全的
    const currentState = JSON.parse(JSON.stringify(currentPage.textBoxes || []));

    // 如果歷史堆疊已滿，移除最舊的紀錄
    if (AppState.history.length >= AppState.maxHistorySize) {
        AppState.history.shift();
    }

    // 推入新狀態
    AppState.history.push(currentState);

    // 每次有新操作時，清空 Redo 堆疊（因為時間線分叉了）
    AppState.redoStack = [];

    updateHistoryButtons();
    // console.log('History Saved. Stack:', AppState.history.length);
}

/**
 * 執行上一步 (Undo)
 */
function undo() {
    if (AppState.history.length === 0) return;

    const page = AppState.pages[AppState.currentPageIndex];
    if (!page) return;

    // 1. 將當前狀態推入 Redo 堆疊 (以便可以 Redo 回來)
    const currentState = JSON.parse(JSON.stringify(page.textBoxes || []));
    AppState.redoStack.push(currentState);

    // 2. 從 History 取出上一個狀態
    const prevState = AppState.history.pop();

    // 3. 恢復狀態
    page.textBoxes = prevState;

    // 4. 更新畫面
    renderPageToCanvas(page);
    renderTextOverlays(page);
    renderTextList(page);
    DOM.textBoxCount.textContent = page.textBoxes.length;

    updateHistoryButtons();
    showToast('已復原 (Undo)');
}

/**
 * 執行下一步 (Redo)
 */
function redo() {
    if (AppState.redoStack.length === 0) return;

    const page = AppState.pages[AppState.currentPageIndex];
    if (!page) return;

    // 1. 將當前狀態推入 History (以便再 Undo)
    const currentState = JSON.parse(JSON.stringify(page.textBoxes || []));
    AppState.history.push(currentState);

    // 2. 從 Redo Stack 取出下一個狀態
    const nextState = AppState.redoStack.pop();

    // 3. 恢復狀態
    page.textBoxes = nextState;

    // 4. 更新畫面
    renderPageToCanvas(page);
    renderTextOverlays(page);
    renderTextList(page);
    DOM.textBoxCount.textContent = page.textBoxes.length;

    updateHistoryButtons();
    showToast('已重做 (Redo)');
}

/**
 * 更新按鈕狀態
 */
function updateHistoryButtons() {
    if (DOM.undoBtn) {
        DOM.undoBtn.disabled = AppState.history.length === 0;
        DOM.undoBtn.style.opacity = AppState.history.length === 0 ? '0.5' : '1';
        DOM.undoBtn.style.cursor = AppState.history.length === 0 ? 'not-allowed' : 'pointer';
    }

    if (DOM.redoBtn) {
        DOM.redoBtn.disabled = AppState.redoStack.length === 0;
        DOM.redoBtn.style.opacity = AppState.redoStack.length === 0 ? '0.5' : '1';
        DOM.redoBtn.style.cursor = AppState.redoStack.length === 0 ? 'not-allowed' : 'pointer';
    }
}

// 當 DOM 載入完成時初始化
document.addEventListener('DOMContentLoaded', init);
