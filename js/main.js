// 主要邏輯模組
class TokyoMetroApp {
    constructor() {
        this.map = null;
        this.init();
    }

    // 初始化應用程式
    init() {
        // 直接初始化（外部已於 DOMContentLoaded 後建立實例）
        this.initializeMap();
        this.bindEvents();
        this.setupInitialState();
    }

    // 初始化地圖
    initializeMap() {
        try {
            this.map = new TokyoMetroMap();
            console.log('地圖初始化成功');
        } catch (error) {
            console.error('地圖初始化失敗:', error);
            this.showError('地圖初始化失敗，請檢查網路連接');
        }
    }

    // 綁定事件
    bindEvents() {
        // 隨機選取按鈕
        const randomSelectBtn = document.getElementById('random-select');
        if (randomSelectBtn) {
            randomSelectBtn.addEventListener('click', () => {
                this.handleRandomSelect();
            });
        }

        // 清除選取按鈕
        const clearSelectionBtn = document.getElementById('clear-selection');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                this.handleClearSelection();
            });
        }

        // 數量輸入框
        const countInput = document.getElementById('count');
        if (countInput) {
            countInput.addEventListener('input', (e) => {
                this.validateCountInput(e.target);
            });
        }

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // 設置初始狀態
    setupInitialState() {
        // 設置默認數量
        const countInput = document.getElementById('count');
        if (countInput) {
            countInput.value = '5';
        }

        // 更新統計信息
        this.updateStats();
    }

    // 處理隨機選取
    handleRandomSelect() {
        if (!this.map) {
            this.showError('地圖未初始化');
            return;
        }

        const countInput = document.getElementById('count');
        const count = parseInt(countInput.value) || 5;

        if (count < 1) {
            this.showError('請輸入有效的選取數量（至少1個）');
            return;
        }

        if (count > 50) {
            this.showError('選取數量不能超過50個');
            return;
        }

        try {
            this.map.randomSelect(count);
            this.showSuccess(`已隨機選取 ${count} 個區域`);
        } catch (error) {
            console.error('隨機選取失敗:', error);
            this.showError('隨機選取失敗，請重試');
        }
    }

    // 處理清除選取
    handleClearSelection() {
        if (!this.map) {
            this.showError('地圖未初始化');
            return;
        }

        try {
            this.map.clearSelection();
            this.showSuccess('已清除所有選取');
        } catch (error) {
            console.error('清除選取失敗:', error);
            this.showError('清除選取失敗，請重試');
        }
    }

    // 驗證數量輸入
    validateCountInput(input) {
        const value = parseInt(input.value);
        if (isNaN(value) || value < 1) {
            input.value = '1';
        } else if (value > 50) {
            input.value = '50';
        }
    }

    // 處理鍵盤快捷鍵
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: 隨機選取
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.handleRandomSelect();
        }
        
        // Ctrl/Cmd + C: 清除選取
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            this.handleClearSelection();
        }
    }

    // 更新統計信息
    updateStats() {
        if (this.map) {
            this.map.updateStats();
        }
    }

    // 顯示成功消息
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // 顯示錯誤消息
    showError(message) {
        this.showNotification(message, 'error');
    }

    // 顯示通知
    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加樣式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // 根據類型設置背景色
        const colors = {
            success: '#00b894',
            error: '#d63031',
            info: '#74b9ff'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // 添加到頁面
        document.body.appendChild(notification);

        // 3秒後自動移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 獲取應用程式狀態
    getAppState() {
        if (!this.map) return null;
        
        return {
            selectedAreas: this.map.getSelectedAreas(),
            totalAreas: this.map.getAllAreas().length,
            selectedCount: this.map.selectedAreas.size
        };
    }

    // 導出選取結果
    exportResults() {
        if (!this.map) return null;
        
        const selectedAreas = this.map.getSelectedAreas();
        const results = selectedAreas.map(areaName => {
            const layer = this.map.areaLayers.get(areaName);
            if (layer && layer.feature) {
                return layer.feature.properties;
            }
            return { name: areaName };
        });

        return {
            timestamp: new Date().toISOString(),
            selectedAreas: results,
            totalSelected: results.length
        };
    }
}

// 添加CSS動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化應用程式
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TokyoMetroApp();
});

// 導出應用程式實例供調試使用
if (typeof window !== 'undefined') {
    window.TokyoMetroApp = TokyoMetroApp;
    window.app = app;
}
