// noinspection JSDeprecatedSymbols

importScripts("global.js")


async function activateIcon(tab) {
    // Update Icon in toolbar
    let status = await getStatus(tab.url)
    await chrome.action.setPopup({popup: "popup/popup.html", tabId: tab.id})
    await updateIcon(tab.id, status)
}

async function activateTabContent(tab) {
    // activate UI changes in content.js
    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ["global.js"],
    });
    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ["content/content.js"],
    });
    await chrome.scripting.insertCSS({
        target: {tabId: tab.id},
        files: ["content/content.css"],
    });
    chrome.tabs.sendMessage(tab.id, {type: 'update-content'})
}


chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    // tab.url will be null if the permission is missing for this domain
    if (tab.url) {
        if (tab.status === "loading") {
            await activateIcon(tab)
        } else if (tab.status === "complete") {
            console.log("tab was updated", tab.url);
            await activateTabContent(tab);
        }
    }
})


chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
        // status changed in popup
        if (message.type === "set-status") {
            console.log("updating status to", message.status)
            await storePageStatus(message.tab.url, message.status);
            chrome.tabs.sendMessage(message.tab.id, {type: "update-content"});
            await updateIcon(message.tab.id, message.status);
        }
        if (message.type === "access-granted") {
            await activateTab(message.tab)
        }
        if (message.type === "import-data") {
            for (let entry of message.data) {
                chrome.storage.local.set({[entry.url]: entry.status});
            }
            sendResponse("success")

        }
    }
);


async function updateIcon(tabId, status) {
    await chrome.action.setIconP({tabId: tabId, path: `images/icon-${status}.png`});
}

async function storePageStatus(url, status) {
    let preparedUrl = prepareUrl(url);

    if (status === STATUS_NONE) {
        return chrome.storage.local.remove(preparedUrl);
    } else {
        // this special syntax uses the value of preparedUrl as the key of the object
        return chrome.storage.local.set({[preparedUrl]: status});
    }
}

chrome.action.setIconP = promisify(chrome.action.setIcon, chrome.action)
