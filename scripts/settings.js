document.addEventListener('DOMContentLoaded', async () => {
    const bookmarkBarToggle = document.getElementById('bookmark-bar-toggle');
    const saveButton = document.getElementById('save-settings');

    // Load current settings
    const stored = await chrome.storage.local.get(['includeBookmarkBar']);
    if (stored.includeBookmarkBar !== undefined) {
        bookmarkBarToggle.checked = stored.includeBookmarkBar;
    }

    // Save settings
    saveButton.addEventListener('click', async () => {
        await chrome.storage.local.set({
            includeBookmarkBar: bookmarkBarToggle.checked
        });

        // Visual feedback
        const icon = saveButton.querySelector('i');
        icon.classList.remove('fa-save');
        icon.classList.add('fa-check');
        setTimeout(() => {
            icon.classList.remove('fa-check');
            icon.classList.add('fa-save');
        }, 1000);
    });
});