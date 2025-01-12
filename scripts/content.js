let xOffset = 0;
let yOffset = 0;
let overlay = null;
let isDragging = false;
let positions = [];

// Create floating overlay with drag functionality
function createOverlay() {
    overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        background: rgba(74, 144, 226, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: monospace;
        z-index: 999999;
        font-size: 14px;
        cursor: move;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(4px);
        user-select: none;
    `;

    let startX, startY;

    overlay.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX - overlay.offsetLeft;
        startY = e.clientY - overlay.offsetTop;
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;

        let newX = e.clientX - startX;
        let newY = e.clientY - startY;

        // Keep overlay within viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth - overlay.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - overlay.offsetHeight));

        overlay.style.left = `${newX}px`;
        overlay.style.top = `${newY}px`;
        overlay.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.body.appendChild(overlay);
}

// Save current position
async function saveCurrentPosition() {
    const windowOffset = getWindowOffset();
    const position = {
        x: Math.round(lastX + xOffset + windowOffset.x),
        y: Math.round(lastY + yOffset + windowOffset.y),
        timestamp: new Date().toISOString()
    };

    // Get existing positions from storage
    const stored = await chrome.storage.local.get('savedPositions');
    positions = stored.savedPositions || [];
    positions.push(position);
    await chrome.storage.local.set({ savedPositions: positions });

    // Visual feedback in overlay
    const originalText = overlay.textContent;
    overlay.textContent = 'Position Saved!';
    setTimeout(() => overlay.textContent = originalText, 1000);
}

// Get window offset for accurate PyAutoGUI positioning
function getWindowOffset() {
    const TAB_BAR_HEIGHT = 32;
    const URL_BAR_HEIGHT = 28;
    const BOOKMARK_BAR_HEIGHT = 30;
    const ADDITIONAL_OFFSET = 37;

    const windowOffset = {
        x: window.outerWidth - window.innerWidth + (window.screen.availLeft || 0),
        y: window.outerHeight - window.innerHeight + (window.screen.availTop || 0)
    };

    if (window.navigator.userAgent.includes('Chrome')) {
        windowOffset.y += TAB_BAR_HEIGHT + URL_BAR_HEIGHT + ADDITIONAL_OFFSET;
        chrome.storage.local.get(['includeBookmarkBar'], (data) => {
            if (data.includeBookmarkBar !== false) {
                windowOffset.y += BOOKMARK_BAR_HEIGHT;
            }
        });
    }

    return windowOffset;
}

// Format coordinates nicely
function formatCoordinates(x, y) {
    return `X: ${x.toString().padStart(4, ' ')}  Y: ${y.toString().padStart(4, ' ')}`;
}

let lastX = 0, lastY = 0;

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    if (!overlay || isDragging) return;

    const windowOffset = getWindowOffset();
    const x = Math.round(e.clientX + xOffset + windowOffset.x);
    const y = Math.round(e.clientY + yOffset + windowOffset.y);
    lastX = e.clientX;
    lastY = e.clientY;

    overlay.textContent = formatCoordinates(x, y);

    chrome.runtime.sendMessage({
        type: 'positionUpdate',
        x,
        y
    }).catch(() => {
        // Popup might be closed, ignore error
    });
});

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCurrentPosition();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'updateOffset':
            xOffset = message.xOffset || 0;
            yOffset = message.yOffset || 0;
            break;
        case 'showOverlay':
            if (!overlay) createOverlay();
            overlay.style.display = message.show ? 'block' : 'none';
            break;
    }
    sendResponse({ success: true });
    return true;
});

// Initialize overlay
createOverlay();