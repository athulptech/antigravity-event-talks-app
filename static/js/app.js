// Global state
let state = {
    releases: [],
    selectedIds: new Set(),
    activeFilter: 'all',
    searchQuery: ''
};

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const iconRefresh = document.getElementById('icon-refresh');
const inputSearch = document.getElementById('input-search');
const btnClearSearch = document.getElementById('btn-clear-search');
const filterPills = document.querySelectorAll('.filter-pill');
const sectionLoading = document.getElementById('section-loading');
const sectionError = document.getElementById('section-error');
const sectionEmpty = document.getElementById('section-empty');
const notesFeed = document.getElementById('notes-feed');
const btnRetry = document.getElementById('btn-retry');
const btnResetFilters = document.getElementById('btn-reset-filters');
const txtStats = document.getElementById('txt-stats');
const statsBar = document.querySelector('.stats-bar');

// Selection Bar
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnTweetSelected = document.getElementById('btn-tweet-selected');

// Modal
const modalTweet = document.getElementById('modal-tweet');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelTweet = document.getElementById('btn-cancel-tweet');
const btnPostTweet = document.getElementById('btn-post-tweet');
const textareaTweet = document.getElementById('textarea-tweet');
const charProgressCircle = document.getElementById('char-progress-circle');
const txtCharCount = document.getElementById('txt-char-count');
const tweetRecBox = document.getElementById('tweet-rec-box');
const previewSection = document.getElementById('modal-preview-section');
const previewBadge = document.getElementById('modal-preview-badge');
const previewDate = document.getElementById('modal-preview-date');
const previewHtml = document.getElementById('modal-preview-html');
const toastContainer = document.getElementById('toast-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();

    btnRefresh.addEventListener('click', () => fetchReleases(true));
    btnRetry.addEventListener('click', () => fetchReleases(true));
    
    // Search
    inputSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
        renderFeed();
    });

    btnClearSearch.addEventListener('click', () => {
        inputSearch.value = '';
        state.searchQuery = '';
        btnClearSearch.style.display = 'none';
        renderFeed();
        inputSearch.focus();
    });

    // Reset buttons
    btnResetFilters.addEventListener('click', resetFilters);

    // Filters
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.activeFilter = pill.getAttribute('data-type');
            renderFeed();
        });
    });

    // Selection controls
    btnClearSelection.addEventListener('click', clearSelection);
    btnTweetSelected.addEventListener('click', openMultiTweetModal);

    // Modal controls
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelTweet.addEventListener('click', closeModal);
    btnPostTweet.addEventListener('click', postTweet);
    textareaTweet.addEventListener('input', updateCharCount);
});

// Toast System
function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Slide out and remove
    setTimeout(() => {
        toast.style.animation = 'slideInLeft 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Fetch from API
async function fetchReleases(refresh = false) {
    // Show spinner & loading state
    iconRefresh.classList.add('spinning');
    btnRefresh.disabled = true;
    
    if (state.releases.length === 0) {
        sectionLoading.style.display = 'flex';
        sectionError.style.display = 'none';
        sectionEmpty.style.display = 'none';
        notesFeed.style.display = 'none';
        statsBar.style.display = 'none';
    }

    try {
        const url = refresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        const resData = await response.json();

        if (resData.success) {
            state.releases = resData.data;
            if (refresh) {
                showToast("Feed Refreshed", resData.refreshed ? "Fetched latest data from Google Cloud feed." : "Loaded from local cache.", "success");
            }
            clearSelection();
            renderFeed();
        } else {
            throw new Error(resData.error || "Unknown server error");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        showToast("Error Fetching Data", err.message, "error");
        
        if (state.releases.length === 0) {
            sectionLoading.style.display = 'none';
            sectionError.style.display = 'flex';
            document.getElementById('error-message').textContent = err.message || "Could not fetch release notes.";
        }
    } finally {
        iconRefresh.classList.remove('spinning');
        btnRefresh.disabled = false;
        sectionLoading.style.display = 'none';
    }
}

// Reset Search & Filters
function resetFilters() {
    inputSearch.value = '';
    state.searchQuery = '';
    btnClearSearch.style.display = 'none';
    
    filterPills.forEach(p => p.classList.remove('active'));
    document.querySelector('.filter-pill[data-type="all"]').classList.add('active');
    state.activeFilter = 'all';
    
    renderFeed();
}

// Filter and render logic
function renderFeed() {
    if (state.releases.length === 0) return;

    // Filter items
    const filtered = state.releases.filter(item => {
        // Filter by category
        const matchesCategory = state.activeFilter === 'all' || item.type.toLowerCase() === state.activeFilter.toLowerCase();
        
        // Filter by search query
        const textContent = `${item.date} ${item.type} ${item.text}`.toLowerCase();
        const matchesSearch = !state.searchQuery || textContent.includes(state.searchQuery);
        
        return matchesCategory && matchesSearch;
    });

    // Update Filter Pill Counts
    updateFilterCounts();

    // Show/Hide States
    if (filtered.length === 0) {
        notesFeed.style.display = 'none';
        sectionEmpty.style.display = 'flex';
        statsBar.style.display = 'block';
        txtStats.textContent = `Found 0 matching updates.`;
    } else {
        sectionEmpty.style.display = 'none';
        notesFeed.style.display = 'flex';
        statsBar.style.display = 'block';
        
        const activeName = state.activeFilter === 'all' ? 'total' : state.activeFilter + 's';
        txtStats.textContent = `Showing ${filtered.length} of ${state.releases.length} ${activeName}.`;

        // Render Cards
        notesFeed.innerHTML = '';
        filtered.forEach(item => {
            const isSelected = state.selectedIds.has(item.id);
            const card = document.createElement('div');
            card.className = `release-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-id', item.id);
            
            // Map type badge class
            let badgeClass = 'badge-general';
            const normType = item.type.toLowerCase();
            if (normType.includes('feature')) badgeClass = 'badge-feature';
            else if (normType.includes('announcement')) badgeClass = 'badge-announcement';
            else if (normType.includes('issue')) badgeClass = 'badge-issue';
            else if (normType.includes('deprecation')) badgeClass = 'badge-deprecation';

            card.innerHTML = `
                <div class="card-selector">
                    <div class="custom-checkbox">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-meta">
                        <div class="meta-left">
                            <span class="update-date">${item.date}</span>
                            <span class="badge-type ${badgeClass}">${item.type}</span>
                        </div>
                    </div>
                    <div class="update-details">
                        ${item.html}
                    </div>
                    <div class="card-actions">
                        <button class="btn-card-action btn-copy-card" title="Copy update description to clipboard">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                        <button class="btn-card-action btn-tweet-card" title="Compose a Tweet about this update">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                </div>
            `;

            // Event Listeners on Card
            // Click checkbox or card base (excluding links/actions) to select
            card.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.card-actions')) {
                    return; // Don't select when clicking details links or actions
                }
                toggleSelect(item.id);
            });

            // Action Buttons
            card.querySelector('.btn-copy-card').addEventListener('click', () => {
                const plainText = `${item.date} - ${item.type}\n${item.text}\n\nRead more: ${item.link}`;
                navigator.clipboard.writeText(plainText)
                    .then(() => showToast("Copied!", "Update details copied to clipboard.", "success"))
                    .catch(err => showToast("Copy Failed", err.message, "error"));
            });

            card.querySelector('.btn-tweet-card').addEventListener('click', () => {
                openTweetModal(item);
            });

            notesFeed.appendChild(card);
        });
    }

    updateSelectionBar();
}

// Update badges counts in pills
function updateFilterCounts() {
    const counts = {
        all: state.releases.length,
        feature: 0,
        announcement: 0,
        issue: 0,
        deprecation: 0
    };

    state.releases.forEach(item => {
        const normType = item.type.toLowerCase();
        if (normType.includes('feature')) counts.feature++;
        else if (normType.includes('announcement')) counts.announcement++;
        else if (normType.includes('issue')) counts.issue++;
        else if (normType.includes('deprecation')) counts.deprecation++;
    });

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.feature;
    document.getElementById('count-announcement').textContent = counts.announcement;
    document.getElementById('count-issue').textContent = counts.issue;
    document.getElementById('count-deprecation').textContent = counts.deprecation;
}

// Selection Handlers
function toggleSelect(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
    }
    
    // Toggle active class visually
    const cardEl = document.querySelector(`.release-card[data-id="${id}"]`);
    if (cardEl) {
        cardEl.classList.toggle('selected', state.selectedIds.has(id));
    }
    
    updateSelectionBar();
}

function clearSelection() {
    state.selectedIds.clear();
    document.querySelectorAll('.release-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateSelectionBar();
}

function updateSelectionBar() {
    const count = state.selectedIds.size;
    selectionCount.textContent = count;
    
    if (count > 0) {
        selectionBar.classList.add('visible');
        selectionBar.style.display = 'flex';
    } else {
        selectionBar.classList.remove('visible');
        setTimeout(() => {
            if (state.selectedIds.size === 0) {
                selectionBar.style.display = 'none';
            }
        }, 300);
    }
}

// Tweet Generation Helper
// Evaluates URL characters according to Twitter rule: any URL = 23 characters
function getTwitterCharacterCount(text) {
    // Regex to match URLs
    const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/g;
    const urls = text.match(urlRegex) || [];
    
    // Remove URLs from text to check length of text nodes
    let textWithoutUrls = text;
    urls.forEach(url => {
        textWithoutUrls = textWithoutUrls.replace(url, "");
    });
    
    // Total count is text without urls + 23 characters for each URL
    return textWithoutUrls.length + (urls.length * 23);
}

function composeTweetText(releases) {
    const baseHashtags = " #BigQuery #GoogleCloud";
    const maxTweetLen = 280;
    
    if (releases.length === 1) {
        const item = releases[0];
        const prefix = `BigQuery ${item.type} (${item.date}): `;
        const suffix = `\n\nRead more: ${item.link}${baseHashtags}`;
        
        // URL counts as 23 characters on X. Let's calculate actual character count.
        const suffixLenForTwitter = 13 + 23 + baseHashtags.length;
        const prefixLenForTwitter = prefix.length;
        
        const maxSnippetLen = maxTweetLen - prefixLenForTwitter - suffixLenForTwitter;
        
        let snippet = item.text;
        if (snippet.length > maxSnippetLen) {
            snippet = snippet.substring(0, maxSnippetLen - 3) + "...";
        }
        
        return `${prefix}${snippet}${suffix}`;
    } else {
        // Sort selected releases by date (descending)
        const sorted = [...releases].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const dates = [...new Set(sorted.map(r => r.date))];
        const dateStr = dates.length > 2 
            ? `${dates[0]} to ${dates[dates.length - 1]}` 
            : dates.join(' & ');
            
        const prefix = `BigQuery updates (${dateStr}):\n`;
        // Use first update link or base release notes link
        const mainLink = sorted[0].link || "https://docs.cloud.google.com/bigquery/docs/release-notes";
        const suffix = `\n\nDetails: ${mainLink}${baseHashtags}`;
        
        const suffixLenForTwitter = 10 + 23 + baseHashtags.length;
        const prefixLenForTwitter = prefix.length;
        
        let remaining = maxTweetLen - prefixLenForTwitter - suffixLenForTwitter;
        
        let itemsText = "";
        for (let i = 0; i < sorted.length; i++) {
            const item = sorted[i];
            // Format: • [Feature] Autonomous embedding generation...
            const bullet = `• [${item.type}] ${item.text}`;
            const targetLineLen = bullet.length + 1; // plus newline
            
            const lineMax = Math.floor(remaining / (sorted.length - i));
            let lineText = bullet;
            
            if (lineText.length > lineMax) {
                lineText = lineText.substring(0, lineMax - 4) + "...";
            }
            
            lineText += "\n";
            itemsText += lineText;
            remaining -= lineText.length;
        }
        
        return `${prefix}${itemsText}${suffix}`;
    }
}

// Modal Actions
function openTweetModal(release) {
    previewSection.style.display = 'block';
    
    // Populate Preview Box
    previewBadge.textContent = release.type;
    previewBadge.className = `preview-badge badge-${release.type.toLowerCase().replace(/\s/g, '-')}`;
    previewDate.textContent = release.date;
    previewHtml.innerHTML = release.html;
    
    // Compose tweet body
    const initialText = composeTweetText([release]);
    textareaTweet.value = initialText;
    
    openModalBase();
}

function openMultiTweetModal() {
    if (state.selectedIds.size === 0) return;
    
    previewSection.style.display = 'none'; // Hide single card preview for multi selection
    
    // Gather selected releases objects
    const selectedReleases = state.releases.filter(r => state.selectedIds.has(r.id));
    
    // Compose tweet body
    const initialText = composeTweetText(selectedReleases);
    textareaTweet.value = initialText;
    
    openModalBase();
}

function openModalBase() {
    modalTweet.style.display = 'flex';
    // Small delay to trigger animation
    setTimeout(() => {
        modalTweet.classList.add('open');
        updateCharCount();
        textareaTweet.focus();
        // Set cursor to start
        textareaTweet.setSelectionRange(0, 0);
    }, 50);
}

function closeModal() {
    modalTweet.classList.remove('open');
    setTimeout(() => {
        modalTweet.style.display = 'none';
    }, 300);
}

// Textarea Character Count
function updateCharCount() {
    const text = textareaTweet.value;
    const count = getTwitterCharacterCount(text);
    const limit = 280;
    
    const remaining = limit - count;
    txtCharCount.textContent = remaining;

    // Warning states
    txtCharCount.classList.remove('warning', 'danger');
    btnPostTweet.disabled = false;
    tweetRecBox.style.display = 'none';

    if (remaining <= 0) {
        txtCharCount.classList.add('danger');
        btnPostTweet.disabled = count > limit;
        tweetRecBox.style.display = 'block';
    } else if (remaining <= 20) {
        txtCharCount.classList.add('warning');
    }

    // Update Circle Progress
    const radius = 10;
    const circumference = 2 * Math.PI * radius; // 62.83
    const percentage = Math.min(count / limit, 1);
    const offset = circumference - (percentage * circumference);
    
    charProgressCircle.style.strokeDashoffset = offset;
    
    // Change progress circle color dynamically
    if (count > limit) {
        charProgressCircle.style.stroke = 'var(--cat-issue)';
    } else if (remaining <= 20) {
        charProgressCircle.style.stroke = '#f59e0b';
    } else {
        charProgressCircle.style.stroke = 'var(--color-accent)';
    }
}

// Intent Share Trigger
function postTweet() {
    const text = textareaTweet.value;
    const count = getTwitterCharacterCount(text);
    
    if (count > 280) {
        showToast("Cannot Post", "Tweet exceeds 280 characters limit.", "error");
        return;
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
    closeModal();
    showToast("Opening X/Twitter", "Opening composer in a new tab...", "success");
}
