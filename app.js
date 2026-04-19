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

        // Export
        btnExport: $('#btn-export'),

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

        // Toast
        toastContainer: $('#toast-container'),
    };

    // ── State ──
    let entries = [];
    let activeFilter = 'all';
    let searchQuery = '';

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
            entries = data ? JSON.parse(data) : [];
        } catch (e) {
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

        // Group by date
        const groups = {};
        entries.forEach(e => {
            if (!groups[e.date]) groups[e.date] = [];
            groups[e.date].push(e);
        });

        let text = '═══════════════════════════════════════════\n';
        text += '         📖 ENGLISH DIARY — NHẬT KÝ TIẾNG ANH\n';
        text += '═══════════════════════════════════════════\n\n';

        const sortedDates = Object.keys(groups).sort().reverse();
        sortedDates.forEach(date => {
            text += `\n📅 ${formatDate(date)}\n`;
            text += '───────────────────────────────────────────\n';
            groups[date].forEach((e, idx) => {
                text += `\n  ${idx + 1}. 🇬🇧 ${e.english}\n`;
                if (e.vietnamese) text += `     🇻🇳 ${e.vietnamese}\n`;
                text += `     📁 ${CATEGORY_LABELS[e.category] || e.category}`;
                if (e.source) text += `  |  📖 ${e.source}`;
                text += `  |  🕐 ${formatTime(e.created)}\n`;
                if (e.note) text += `     📝 ${e.note}\n`;
            });
            text += '\n';
        });

        text += `\n═══════════════════════════════════════════\n`;
        text += `Tổng: ${entries.length} câu  |  ${sortedDates.length} ngày\n`;
        text += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `english-diary-${getTodayStr()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Đã xuất file thành công! 📥');
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

        // Export
        els.btnExport.addEventListener('click', exportData);

        // Filters
        els.filterPills.forEach(pill => {
            pill.addEventListener('click', () => setFilter(pill.dataset.filter));
        });

        // Modal
        els.btnCloseModal.addEventListener('click', closeEditModal);
        els.btnCancelEdit.addEventListener('click', closeEditModal);
        els.btnSaveEdit.addEventListener('click', saveEdit);
        els.modalOverlay.addEventListener('click', (e) => {
            if (e.target === els.modalOverlay) closeEditModal();
        });

        // Keyboard
        document.addEventListener('keydown', handleKeyboard);
    }

    // ── Init ──
    function init() {
        loadEntries();
        displayCurrentDate();
        updateStats();
        renderTimeline();
        bindEvents();

        // Focus input on load
        setTimeout(() => els.inputEnglish.focus(), 300);
    }

    // Start app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
