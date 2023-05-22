import { getStatus, normalizeUrl } from './global.js';

/**
 * react to tab activation: update popup and icon, and inject scripts
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject script if there are already any entries for the  current domain
  if (!await isAllowedDomain(tab.url) || !await hasAnyEntriesForDomain(tab.url)) {
    console.log('extension is disabled on domain', tab.url);
    await updateIcon(tab.id, 'disabled');
    return;
  }

  if (tab.status === 'loading') {
    await activatePopup(tab);
    const status = await getStatus(tab.url);
    await updateIcon(tab.id, status);
  } else if (tab.status === 'complete' && changeInfo.status === 'complete') {
    console.log('tab was updated', tab.url, changeInfo);
    await injectContentScripts(tab);
  }
});

/**
 * react to changes in the storage: update all tabs
 */
async function updateLinksInAllTabs() {
  console.log('storage changed, updating all tabs');
  const tabs = await browser.tabs.query({});
  // don't wait until update is complete
  tabs
    .filter((tab) => isAllowedDomain(tab.url))
    .map(async (tab) => {
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'update-content' });
      } catch (e) {
        if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
          console.warn('error updating tab', tab.url, e);
        }
      }
    });
}

/**
 * react to messages from the popup, settings and content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Status changed in popup
  if (message.type === 'change-page-status') {
    handleChangePageStatus(message, sendResponse);
  }

  if (message.type === 'import-data') {
    handleImportData(message, sendResponse);
  }

  if (message.type === 'get-status') {
    handleGetStatusMessage(message, sendResponse);
  }

  // Return true to indicate that the response should be sent asynchronously
  return true;
});

async function activatePopup(tab) {
  await browser.browserAction.setPopup({ popup: 'src/popup/popup.html', tabId: tab.id });
}

/**
 * @param url {string}
 * @return {Promise<boolean>}
 */
async function hasAnyEntriesForDomain(url) {
  const urlObj = new URL(url);
  const allItems = await browser.storage.local.get(null);
  return Object.keys(allItems).some((key) => key.startsWith(urlObj.origin));
}

function isAllowedDomain(url) {
  return url && url.startsWith('http');
}

async function injectContentScripts(tab) {
  await browser.tabs.executeScript(tab.id, { file: '3rdparty/browser-polyfill.min.js' });
  // not importing global.js because node modules are not supported with executeScript()
  await browser.tabs.executeScript(tab.id, { file: 'src/inject/inject.js' });
  await browser.tabs.insertCSS(tab.id, { file: 'src/inject/inject.css' });
  await browser.tabs.sendMessage(tab.id, { type: 'update-content' });
}

/**
 *
 * @param message {{status: LinkStatus, tab}}
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleChangePageStatus(message, sendResponse) {
  console.log('updating status to', message.status);

  await storePageStatus(message.tab.url, message.status);
  try {
    await browser.tabs.sendMessage(message.tab.id, { type: 'update-content' });
  } catch (e) {
    if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
      console.error('error while sending "update-content" message', e);
    }
  }
  await updateIcon(message.tab.id, message.status);

  // Make sure the scripts are injected
  if (message.status !== 'none' && !await hasAnyEntriesForDomain(message.tab.url)) {
    // not waiting for the injection to complete:
    injectContentScripts(message.tab).catch(console.log);
  }
  sendResponse('change-page-status done');
}

function handleImportData(message, sendResponse) {
  message.data.forEach((entry) => {
    browser.storage.local.set({ [entry.url]: entry.status });
  });

  sendResponse('success');
}

async function handleGetStatusMessage(message, sendResponse) {
  const status = await getStatus(message.url);
  sendResponse(status);
}

/**
 * @param tabId {string}
 * @param status {LinkStatus}
 * @return {Promise<void>}
 */
async function updateIcon(tabId, status) {
  await browser.browserAction.setIcon({ tabId, path: `images/icon-${status}.png` });
}

/**
 *
 * @param url
 * @param newStatus {LinkStatus}
 * @return {Promise<*>}
 */
async function storePageStatus(url, newStatus) {
  const normalizedUrl = normalizeUrl(url);

  if (newStatus === 'none') {
    await browser.storage.local.remove(normalizedUrl);
  } else {
    // This special syntax uses the value of normalizedUrl as the key of the object
    await browser.storage.local.set({ [normalizedUrl]: newStatus });
  }

  await updateLinksInAllTabs();
}
