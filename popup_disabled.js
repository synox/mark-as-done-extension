document.getElementById('enable').addEventListener('click', async function (event) {
    // Permissions must be requested from inside a user gesture, like a button's
    // click handler.
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    chrome.permissions.request({
        permissions: [
            "storage",
            "scripting",
            "unlimitedStorage"
        ],
        origins: [new URL(tab.url).origin + "/*"]
    }, function (granted) {
        // The callback argument will be true if the user granted the permissions.
        if (granted) {
            chrome.runtime.sendMessage({type: "access-granted", tab});
            setTimeout(window.close, 200);
        } else {
            alert("Opps, permission could not be granted. See developer console.")
        }
    });
});
