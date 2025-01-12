let isTracking = false;
let isRecording = false;
let positions = [];

document.addEventListener('DOMContentLoaded', async () => {
    const xPosition = document.getElementById('x-position');
    const yPosition = document.getElementById('y-position');
    const xOffset = document.getElementById('x-offset');
    const yOffset = document.getElementById('y-offset');
    const recordToggle = document.getElementById('record-toggle');
    const savePosition = document.getElementById('save-position');
    const copyPosition = document.getElementById('copy-position');
    const positionsList = document.getElementById('positions-list');
    const trackingToggle = document.getElementById('tracking-toggle');

    // Load saved positions
    const stored = await chrome.storage.local.get('savedPositions');
    positions = stored.savedPositions || [];
    renderPositions();

    // Initialize tracking and recording states
    chrome.storage.local.get(['isTracking', 'isRecording'], (data) => {
        isTracking = data.isTracking || false;
        isRecording = data.isRecording || false;
        trackingToggle.checked = isTracking;
        updateRecordingUI();
    });

    // Handle tracking toggle
    trackingToggle.addEventListener('change', () => {
        isTracking = trackingToggle.checked;
        chrome.storage.local.set({ isTracking });
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

    // Toggle recording
    recordToggle.addEventListener('click', () => {
        isRecording = !isRecording;
        chrome.storage.local.set({ isRecording });
        updateRecordingUI();

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'toggleRecording',
                isRecording
            }).catch(console.error);
        });
    });

    function updateRecordingUI() {
        recordToggle.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        recordToggle.classList.toggle('recording', isRecording);
    }

    // Save current position
    savePosition.addEventListener('click', async () => {
        const position = {
            x: parseInt(xPosition.textContent),
            y: parseInt(yPosition.textContent),
            timestamp: new Date().toISOString()
        };
        positions.push(position);
        await chrome.storage.local.set({ savedPositions: positions });
        renderPositions();
    });

    // Copy position to clipboard
    copyPosition.addEventListener('click', () => {
        const text = `X: ${xPosition.textContent}, Y: ${yPosition.textContent}`;
        navigator.clipboard.writeText(text).then(() => {
            copyPosition.textContent = '✓';
            setTimeout(() => copyPosition.textContent = '📋', 1000);
        }).catch(console.error);
    });

    // Listen for position updates from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'positionUpdate' && isTracking) {
            xPosition.textContent = message.x;
            yPosition.textContent = message.y;
        } else if (message.type === 'recordPosition' && isRecording) {
            positions.push(message.position);
            chrome.storage.local.set({ savedPositions: positions });
            renderPositions();
        }
        sendResponse({ success: true });
        return true;
    });

    function renderPositions() {
        positionsList.innerHTML = '';
        positions.forEach((pos, index) => {
            const item = document.createElement('div');
            item.className = 'position-item';
            item.innerHTML = `
                <span>X: ${pos.x}, Y: ${pos.y}</span>
                <button title="Delete">×</button>
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
