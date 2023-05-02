// noinspection JSDeprecatedSymbols

async function activateIcon(tab) {
    // Update Icon in toolbar
    let status = await getStatus(tab.url)
    await browser.browserAction.setPopup({popup: "popup/popup.html", tabId: tab.id})
    await updateIcon(tab.id, status)
}

async function activateTabContent(tab) {
    // activate UI changes in content.js
    await browser.scripting.executeScript({
        target: {tabId: tab.id},
        files: ["global.js"],
    });
    await browser.scripting.executeScript({
        target: {tabId: tab.id},
        files: ["content/content.js"],
    });
    await browser.scripting.insertCSS({
        target: {tabId: tab.id},
        files: ["content/content.css"],
    });
    browser.tabs.sendMessage(tab.id, {type: 'update-content'})
}


browser.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    // tab.url will be null if the permission is missing for this domain
    if (tab.url && tab.url.startsWith("http")) {
        if (tab.status === "loading") {
            await activateIcon(tab)
        } else if (tab.status === "complete") {
            console.log("tab was updated", tab.url);
            await activateTabContent(tab);
        }
    } else {
        await updateIcon(tab.id, 'disabled');
    }
})


browser.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
        // status changed in popup
        if (message.type === "change-page-status") {
            console.log("updating status to", message.status)
            await storePageStatus(message.tab.url, message.status);
            browser.tabs.sendMessage(message.tab.id, {type: "update-content"});
            await updateIcon(message.tab.id, message.status);
        }
        if (message.type === "import-data") {
            for (let entry of message.data) {
                browser.storage.local.set({[entry.url]: entry.status});
            }
            sendResponse("success")
        }
    }
);


async function updateIcon(tabId, status) {
    await browser.browserAction.setIconP({tabId: tabId, path: `images/icon-${status}.png`});
}

async function storePageStatus(url, status) {
    let preparedUrl = prepareUrl(url);

    if (status === STATUS_NONE) {
        return browser.storage.local.remove(preparedUrl);
    } else {
        // this special syntax uses the value of preparedUrl as the key of the object
        return browser.storage.local.set({[preparedUrl]: status});
    }
}

browser.browserAction.setIconP = promisify(browser.browserAction.setIcon, browser.browserAction)
