let isRecording = false;

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-recording') {
        isRecording = !isRecording;

        await chrome.storage.local.set({ isRecording });

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'toggleRecording',
                    isRecording
                }).catch(() => {
                    console.debug('No content script listening');
                });
            }
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isRecording: false });
});