let isTracking = true;
let isRecording = false;
let positions = [];

document.addEventListener('DOMContentLoaded', async () => {
    const xPosition = document.getElementById('x-position');
    const yPosition = document.getElementById('y-position');
    const xOffset = document.getElementById('x-offset');
    const yOffset = document.getElementById('y-offset');
    const savePosition = document.getElementById('save-position');
    const copyPosition = document.getElementById('copy-position');
    const positionsList = document.getElementById('positions-list');
    const trackingToggle = document.getElementById('tracking-toggle');
    const openSettings = document.getElementById('open-settings');

    // Initialize offset controls
    document.querySelectorAll('.input-with-controls').forEach(control => {
        const input = control.querySelector('input');
        const decrement = control.querySelector('.decrement');
        const increment = control.querySelector('.increment');

        decrement.addEventListener('click', () => {
            input.value = parseInt(input.value || 0) - 1;
            input.dispatchEvent(new Event('input'));
        });

        increment.addEventListener('click', () => {
            input.value = parseInt(input.value || 0) + 1;
            input.dispatchEvent(new Event('input'));
        });
    });

    // Load saved positions and initial state
    const stored = await chrome.storage.local.get(['savedPositions', 'isTracking']);
    positions = stored.savedPositions || [];
    isTracking = stored.isTracking !== undefined ? stored.isTracking : true;
    trackingToggle.checked = isTracking;
    renderPositions();

    // Handle tracking toggle
    trackingToggle.addEventListener('change', () => {
        isTracking = trackingToggle.checked;
        chrome.storage.local.set({ isTracking });

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'showOverlay',
                show: isTracking
            }).catch(console.error);
        });
    });

    // Handle offset changes
    const handleOffsetChange = () => {
        const currentXOffset = parseInt(xOffset.value) || 0;
        const currentYOffset = parseInt(yOffset.value) || 0;

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'updateOffset',
                xOffset: currentXOffset,
                yOffset: currentYOffset
            }).catch(console.error);
        });
    };

    xOffset.addEventListener('input', handleOffsetChange);
    yOffset.addEventListener('input', handleOffsetChange);

    // Save position function
    const saveCurrentPosition = async () => {
        if (!isTracking) return;

        const position = {
            x: parseInt(xPosition.textContent),
            y: parseInt(yPosition.textContent),
            timestamp: new Date().toISOString()
        };
        positions.push(position);
        await chrome.storage.local.set({ savedPositions: positions });
        renderPositions();

        // Visual feedback
        savePosition.classList.add('saved');
        setTimeout(() => savePosition.classList.remove('saved'), 500);
    };

    // Handle save button click
    savePosition.addEventListener('click', saveCurrentPosition);

    // Handle Ctrl+S shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentPosition();
        }
    });

    // Copy position to clipboard
    copyPosition.addEventListener('click', () => {
        if (!isTracking) return;

        const text = `X: ${xPosition.textContent}, Y: ${yPosition.textContent}`;
        navigator.clipboard.writeText(text).then(() => {
            const icon = copyPosition.querySelector('i');
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }).catch(console.error);
    });

    // Open settings
    openSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Listen for position updates from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'positionUpdate' && isTracking) {
            xPosition.textContent = message.x;
            yPosition.textContent = message.y;
        }
        sendResponse({ success: true });
        return true;
    });

    function renderPositions() {
        positionsList.innerHTML = '';
        positions.forEach((pos, index) => {
            const item = document.createElement('div');
            item.className = 'position-item';
            const date = new Date(pos.timestamp);
            const timeString = date.toLocaleTimeString();

            item.innerHTML = `
                <span>X: ${pos.x}, Y: ${pos.y}</span>
                <div class="position-actions">
                    <span class="time">${timeString}</span>
                    <button title="Delete"><i class="fas fa-times"></i></button>
                </div>
            `;

            item.querySelector('button').addEventListener('click', async () => {
                positions.splice(index, 1);
                await chrome.storage.local.set({ savedPositions: positions });
                renderPositions();
            });

            positionsList.appendChild(item);
        });
    }
});