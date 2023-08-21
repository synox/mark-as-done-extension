// import './3rdparty/browser-polyfill.min.js';
import { getStatus, normalizeUrl } from './global.js';

/**
 * react to changes in the storage: update all tabs
 */
async function updateLinksInAllTabs() {
  console.debug('storage changed, updating all tabs');
  const tabs = await chrome.tabs.query({});
  // don't wait until update is complete
  tabs
    .filter((tab) => isAllowedDomain(tab.url))
    .map(async (tab) => {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'update-content' });
      } catch (e) {
        if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
          console.warn('error updating tab', tab.url, e);
        }
      }
    });
}

async function activatePopup(tab) {
  await chrome.action.setPopup({ popup: 'src/popup/popup.html', tabId: tab.id });
}

/**
 * @param url {string}
 * @return {Promise<boolean>}
 */
async function hasAnyEntriesForDomain(url) {
  const urlObj = new URL(url);
  const allItems = await chrome.storage.local.get(null);
  return Object.keys(allItems).some((key) => key.startsWith(urlObj.origin));
}

function isAllowedDomain(url) {
  return url && url.startsWith('http');
}

async function injectContentScripts(tab) {
  await chrome.scripting.executeScript({ target : {tabId : tab.id}, files: ['src/inject/inject.js'] });
  await chrome.scripting.insertCSS( {target : {tabId : tab.id}, files: ['src/inject/inject.css'] });
  await chrome.tabs.sendMessage(tab.id, {type: 'update-content' });
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
    await chrome.tabs.sendMessage(message.tab.id, { type: 'update-content' });
  } catch (e) {
    if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
      console.error('error while sending "update-content" message', e);
    }
  }
  await updateIcon(message.tab.id, message.status);

  // Make sure the scripts are injected
  if (message.status !== 'none' && !await hasAnyEntriesForDomain(message.tab.url)) {
    // not waiting for the injection to complete:
    injectContentScripts(message.tab).catch(console.error);
  }
  sendResponse('change-page-status done');
}

function handleImportData(message, sendResponse) {
  message.data.forEach((entry) => {
    chrome.storage.local.set({ [entry.url]: entry.status });
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
  await chrome.action.setIcon({ tabId, path: `/images/icon-${status}.png` });
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
    await chrome.storage.local.remove(normalizedUrl);
  } else {
    // This special syntax uses the value of normalizedUrl as the key of the object
    await chrome.storage.local.set({ [normalizedUrl]: newStatus });
  }

  await updateLinksInAllTabs();
}

// eslint-disable-next-line import/prefer-default-export
export function main() {
  /**
   * react to tab activation: update popup and icon, and inject scripts
   */
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only inject script if there are already any entries for the  current domain
    if (!await isAllowedDomain(tab.url) || !await hasAnyEntriesForDomain(tab.url)) {
      console.debug('extension is disabled on domain', tab.url);
      await updateIcon(tab.id, 'disabled');
      return;
    }

    if (tab.status === 'loading') {
      await activatePopup(tab);
      const status = await getStatus(tab.url);
      await updateIcon(tab.id, status);
    } else if (tab.status === 'complete' && changeInfo.status === 'complete') {
      console.debug('tab was updated', tab.url, changeInfo);
      await injectContentScripts(tab);
    }
  });

  /**
   * react to messages from the popup, settings and content scripts
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
}
main();
