// ===== English Diary — Main Application =====

(function () {
    'use strict';

    // ── Storage Key ──
    const STORAGE_KEY = 'english_diary_entries';

    // ── Category Labels ──
    const CATEGORY_LABELS = {
        general: 'Tổng hợp',
        idiom: 'Thành ngữ',
        grammar: 'Ngữ pháp',
        vocabulary: 'Từ vựng',
        conversation: 'Hội thoại',
        business: 'Kinh doanh',
        academic: 'Học thuật',
        slang: 'Tiếng lóng',
    };

    // ── DOM Elements ──
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        // Stats
        statTotal: $('#stat-total'),
        statToday: $('#stat-today'),
        statStreak: $('#stat-streak'),
        statDays: $('#stat-days'),

        // Form
        inputEnglish: $('#input-english'),
        inputVietnamese: $('#input-vietnamese'),
        inputCategory: $('#input-category'),
        inputSource: $('#input-source'),
        inputNote: $('#input-note'),
        btnSave: $('#btn-save'),
        btnClearForm: $('#btn-clear-form'),
        currentDateDisplay: $('#current-date-display'),

        // Timeline
        timeline: $('#timeline'),
        emptyState: $('#empty-state'),

        // Filters
        filterPills: $$('.pill[data-filter]'),

        // Search
        searchWrapper: $('#search-wrapper'),
        btnSearchToggle: $('#btn-search-toggle'),
        searchInput: $('#search-input'),

        // Export/Import
        btnExport: $('#btn-export'),
        btnImportTrigger: $('#btn-import-trigger'),
        importInput: $('#import-input'),

        // Modal
        modalOverlay: $('#modal-overlay'),
        editModal: $('#edit-modal'),
        editId: $('#edit-id'),
        editEnglish: $('#edit-english'),
        editVietnamese: $('#edit-vietnamese'),
        editCategory: $('#edit-category'),
        editSource: $('#edit-source'),
        editNote: $('#edit-note'),
        btnCloseModal: $('#btn-close-modal'),
        btnCancelEdit: $('#btn-cancel-edit'),
        btnSaveEdit: $('#btn-save-edit'),

        // Image Support
        inputImage: $('#input-image'),
        imagePreviewContainer: $('#image-preview-container'),
        editImage: $('#edit-image'),
        editImagePreviewContainer: $('#edit-image-preview-container'),



        // Toast
        toastContainer: $('#toast-container'),
    };

    // ── State ──
    let entries = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let tempImageData = null; 
    let editTempImageData = null;


    // ── Helpers ──
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const todayStr = getTodayStr();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateStr === todayStr) return 'Hôm nay';
        if (dateStr === yesterdayStr) return 'Hôm qua';

        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function formatTime(isoStr) {
        const d = new Date(isoStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    async function processImage(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Vui lòng chọn tệp hình ảnh!'));
                return;
            }

            const MAX_WIDTH = 800; // Max width to save storage
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Reduced quality to save even more space (0.7)
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function renderImagePreview(dataUrl, container, type = 'add') {
        container.innerHTML = `
            <div class="image-preview">
                <img src="${dataUrl}" alt="Preview">
                <button class="btn-remove-image" title="Xóa ảnh">×</button>
            </div>
        `;

        container.querySelector('.btn-remove-image').addEventListener('click', () => {
            if (type === 'add') tempImageData = null;
            else editTempImageData = null;
            container.innerHTML = '';
        });
    }



    // ── Storage ──
    function saveEntries() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch (e) {
            showToast('Lỗi lưu dữ liệu!', 'error');
        }
    }

    function loadEntries() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const parsed = data ? JSON.parse(data) : [];
            entries = Array.isArray(parsed) ? parsed : [];
            console.log("Đã tải " + entries.length + " câu từ bộ nhớ.");
        } catch (e) {
            console.error("Lỗi khi tải dữ liệu từ localStorage:", e);
            entries = [];
        }
    }

    // ── Toast ──
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
        };
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ── Stats ──
    function updateStats() {
        const total = entries.length;
        const todayStr = getTodayStr();
        const todayCount = entries.filter(e => e.date === todayStr).length;

        // Unique days
        const uniqueDays = [...new Set(entries.map(e => e.date))].sort().reverse();
        const daysCount = uniqueDays.length;

        // Streak calculation
        let streak = 0;
        const today = new Date();
        let checkDate = new Date(today);
        
        // If no entries today, start checking from yesterday
        if (!uniqueDays.includes(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        const daySet = new Set(uniqueDays);
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (daySet.has(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        animateValue(els.statTotal, total);
        animateValue(els.statToday, todayCount);
        animateValue(els.statStreak, streak);
        animateValue(els.statDays, daysCount);
    }

    function animateValue(element, target) {
        const current = parseInt(element.textContent) || 0;
        if (current === target) return;

        const duration = 400;
        const steps = 20;
        const increment = (target - current) / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const val = Math.round(current + increment * step);
            element.textContent = val;
            if (step >= steps) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, duration / steps);
    }

    // ── Render Timeline ──
    function renderTimeline() {
        // Filter entries
        let filtered = [...entries];

        if (activeFilter !== 'all') {
            filtered = filtered.filter(e => e.category === activeFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.english.toLowerCase().includes(q) ||
                e.vietnamese.toLowerCase().includes(q) ||
                (e.note && e.note.toLowerCase().includes(q)) ||
                (e.source && e.source.toLowerCase().includes(q))
            );
        }

        // Group by date
        const groups = {};
        filtered.forEach(entry => {
            if (!groups[entry.date]) groups[entry.date] = [];
            groups[entry.date].push(entry);
        });

        // Sort dates descending
        const sortedDates = Object.keys(groups).sort().reverse();

        // Sort entries within each day by timestamp descending
        sortedDates.forEach(date => {
            groups[date].sort((a, b) => new Date(b.created) - new Date(a.created));
        });

        // Show/Hide empty state
        if (sortedDates.length === 0) {
            els.timeline.innerHTML = '';
            els.emptyState.classList.add('visible');
            return;
        }

        els.emptyState.classList.remove('visible');

        const todayStr = getTodayStr();
        let html = '';

        sortedDates.forEach(date => {
            const isToday = date === todayStr;
            const dayEntries = groups[date];

            html += `
                <div class="day-group">
                    <div class="day-header">
                        <div class="day-dot ${isToday ? 'today' : ''}">
                            <div class="day-dot-inner"></div>
                        </div>
                        <span class="day-label">
                            ${formatDate(date)}
                            <span class="day-count">— ${dayEntries.length} câu</span>
                        </span>
                    </div>
                    <div class="entry-list">
            `;

            dayEntries.forEach(entry => {
                const englishText = highlightText(entry.english, searchQuery);
                const vietnameseText = highlightText(entry.vietnamese, searchQuery);

                html += `
                    <div class="entry-card" data-cat="${entry.category}" data-id="${entry.id}">
                        <div class="entry-actions">
                            <button class="btn-icon btn-edit-entry" data-id="${entry.id}" title="Chỉnh sửa">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="btn-icon btn-delete-entry" data-id="${entry.id}" title="Xóa">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                    <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                        <div class="entry-english">${englishText}</div>
                        <div class="entry-vietnamese">${vietnameseText}</div>
                        <div class="entry-meta">
                            <span class="entry-badge" data-cat="${entry.category}">${CATEGORY_LABELS[entry.category] || entry.category}</span>
                            ${entry.source ? `<span class="entry-source">📖 ${escapeHtml(entry.source)}</span>` : ''}
                            <span class="entry-time">🕐 ${formatTime(entry.created)}</span>
                        </div>
                        ${entry.note ? `<div class="entry-note">${highlightText(entry.note, searchQuery)}</div>` : ''}
                        ${entry.image ? `
                            <div class="entry-image-container">
                                <img src="${entry.image}" class="entry-image" alt="Entry image" loading="lazy">
                            </div>
                        ` : ''}

                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        els.timeline.innerHTML = html;

        // Attach event listeners
        els.timeline.querySelectorAll('.btn-edit-entry').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });

        els.timeline.querySelectorAll('.btn-delete-entry').forEach(btn => {
            btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
        });
    }

    // ── Add Entry ──
    function addEntry() {
        const english = els.inputEnglish.value.trim();
        const vietnamese = els.inputVietnamese.value.trim();

        if (!english) {
            showToast('Vui lòng nhập câu tiếng Anh!', 'error');
            els.inputEnglish.focus();
            return;
        }

        const entry = {
            id: generateId(),
            english,
            vietnamese,
            category: els.inputCategory.value,
            source: els.inputSource.value.trim(),
            note: els.inputNote.value.trim(),
            image: tempImageData,
            date: getTodayStr(),
            created: new Date().toISOString(),
        };

        entries.push(entry);
        saveEntries();
        updateStats();
        renderTimeline();
        clearForm();

        showToast('Đã lưu thành công! 🎉');

        // Scroll to entry
        setTimeout(() => {
            const card = els.timeline.querySelector(`[data-id="${entry.id}"]`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    function clearForm() {
        els.inputEnglish.value = '';
        els.inputVietnamese.value = '';
        els.inputCategory.value = 'general';
        els.inputSource.value = '';
        els.inputNote.value = '';
        tempImageData = null;
        els.imagePreviewContainer.innerHTML = '';
        els.inputImage.value = '';

        els.inputEnglish.focus();
    }

    // ── Delete Entry ──
    function deleteEntry(id) {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        if (!confirm(`Xóa câu "${entry.english.substring(0, 40)}..."?`)) return;

        const card = els.timeline.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.style.transition = '0.3s ease-out';
            card.style.transform = 'translateX(100px)';
            card.style.opacity = '0';
        }

        setTimeout(() => {
            entries = entries.filter(e => e.id !== id);
            saveEntries();
            updateStats();
            renderTimeline();
            showToast('Đã xóa!', 'info');
        }, 300);
    }

    // ── Edit Entry ──
    function openEditModal(id) {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        els.editId.value = entry.id;
        els.editEnglish.value = entry.english;
        els.editVietnamese.value = entry.vietnamese;
        els.editCategory.value = entry.category;
        els.editSource.value = entry.source || '';
        els.editNote.value = entry.note || '';
        
        editTempImageData = entry.image || null;
        if (editTempImageData) {
            renderImagePreview(editTempImageData, els.editImagePreviewContainer, 'edit');
        } else {
            els.editImagePreviewContainer.innerHTML = '';
        }



        els.modalOverlay.classList.add('active');
        setTimeout(() => els.editEnglish.focus(), 200);
    }

    function closeEditModal() {
        els.modalOverlay.classList.remove('active');
    }

    function saveEdit() {
        const id = els.editId.value;
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        const english = els.editEnglish.value.trim();
        if (!english) {
            showToast('Câu tiếng Anh không được để trống!', 'error');
            return;
        }

        entry.english = english;
        entry.vietnamese = els.editVietnamese.value.trim();
        entry.category = els.editCategory.value;
        entry.source = els.editSource.value.trim();
        entry.note = els.editNote.value.trim();
        entry.image = editTempImageData;
        entry.image = editTempImageData;

        saveEntries();
        renderTimeline();
        closeEditModal();
        showToast('Đã cập nhật! ✨');
    }

    // ── Search ──
    function toggleSearch() {
        els.searchWrapper.classList.toggle('active');
        if (els.searchWrapper.classList.contains('active')) {
            els.searchInput.focus();
        } else {
            els.searchInput.value = '';
            searchQuery = '';
            renderTimeline();
        }
    }

    // ── Filter ──
    function setFilter(filter) {
        activeFilter = filter;
        els.filterPills.forEach(pill => {
            pill.classList.toggle('pill-active', pill.dataset.filter === filter);
        });
        renderTimeline();
    }

    // ── Export ──
    function exportData() {
        if (entries.length === 0) {
            showToast('Chưa có dữ liệu để xuất!', 'error');
            return;
        }

        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `english-diary-backup-${getTodayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Đã xuất file dự phòng thành công! 📥');
    }

    // ── Import ──
    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedEntries = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedEntries)) {
                    throw new Error('Định dạng file không hợp lệ');
                }

                // Simple merge logic: keep existing and add new ones (based on ID)
                const existingIds = new Set(entries.map(e => e.id));
                const newEntries = importedEntries.filter(e => !existingIds.has(e.id));
                
                if (newEntries.length === 0) {
                    showToast('Không có câu mới nào để thêm!', 'info');
                } else {
                    entries = [...entries, ...newEntries];
                    saveEntries();
                    updateStats();
                    renderTimeline();
                    showToast(`Đã nhập thành công ${newEntries.length} câu! 🚀`);
                }
            } catch (err) {
                showToast('Lỗi: File không đúng định dạng!', 'error');
                console.error(err);
            }
            // Clear input
            els.importInput.value = '';
        };
        reader.readAsText(file);
    }

    // ── Display current date ──
    function displayCurrentDate() {
        const now = new Date();
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        els.currentDateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    // ── Keyboard Shortcut ──
    function handleKeyboard(e) {
        // Ctrl+Enter to save
        if (e.ctrlKey && e.key === 'Enter') {
            const isInForm = [els.inputEnglish, els.inputVietnamese, els.inputSource, els.inputNote].some(
                el => el === document.activeElement
            );
            if (isInForm) {
                e.preventDefault();
                addEntry();
            }
        }

        // Escape to close modal
        if (e.key === 'Escape') {
            if (els.modalOverlay.classList.contains('active')) {
                closeEditModal();
            }
            if (els.searchWrapper.classList.contains('active')) {
                toggleSearch();
            }
        }

        // Ctrl+K to search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            toggleSearch();
        }
    }

    // ── Event Listeners ──
    function bindEvents() {
        // Save
        els.btnSave.addEventListener('click', addEntry);
        els.btnClearForm.addEventListener('click', clearForm);

        // Search
        els.btnSearchToggle.addEventListener('click', toggleSearch);
        let searchTimeout;
        els.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = els.searchInput.value.trim();
                renderTimeline();
            }, 250);
        });

        // Export/Import
        els.btnExport.addEventListener('click', exportData);
        els.btnImportTrigger.addEventListener('click', () => els.importInput.click());
        els.importInput.addEventListener('change', importData);

        // Filters
        els.filterPills.forEach(pill => {
            pill.addEventListener('click', () => setFilter(pill.dataset.filter));
        });

        // Modal
        els.btnCloseModal.addEventListener('click', closeEditModal);
        els.btnCancelEdit.addEventListener('click', closeEditModal);
        els.btnSaveEdit.addEventListener('click', saveEdit);

        // Image Handling
        els.inputImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                tempImageData = await processImage(file);
                renderImagePreview(tempImageData, els.imagePreviewContainer, 'add');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        els.editImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                editTempImageData = await processImage(file);
                renderImagePreview(editTempImageData, els.editImagePreviewContainer, 'edit');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        els.modalOverlay.addEventListener('click', (e) => {
            if (e.target === els.modalOverlay) closeEditModal();
        });



        // Keyboard
        document.addEventListener('keydown', handleKeyboard);
    }

    // ── Init ──
    function init() {
        console.log("Đang khởi tạo ứng dụng...");
        
        // Bind events FIRST so buttons are responsive even if data loading fails
        bindEvents();
        
        try {
            loadEntries();
            displayCurrentDate();
            updateStats();
            renderTimeline();
        } catch (err) {
            console.error("Lỗi trong quá trình khởi tạo dữ liệu:", err);
            showToast("Có lỗi xảy ra khi tải dữ liệu, nhưng bạn vẫn có thể nhập câu mới.", "info");
        }

        // Focus input on load
        setTimeout(() => {
            if (els.inputEnglish) els.inputEnglish.focus();
        }, 300);
        console.log("Ứng dụng đã sẵn sàng!");
    }

    // Start app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
