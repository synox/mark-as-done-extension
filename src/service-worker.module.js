import {
  getPageState, listPagesForDomain, removePageState, updatePageState,
} from './storage.js';
import { getOrigin, normalizeUrl } from './global.js';

// eslint-disable-next-line import/prefer-default-export
export function main() {
  /** on tab activation: update popup and icon, and inject scripts */
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (await isAllowedDomain(tab.url) && await hasAnyEntriesForDomain(tab.url)) {
        // Only inject script if there are already any entries for the current domain
        await injectContentScripts(tab);
        chrome.action.setTitle({ title: '' });
      } else {
        chrome.action.setTitle({ title: 'mark as done: disabled for this domain' });
      }

      if (tab.status === 'loading') {
        await chrome.action.setPopup({ popup: 'src/popup/popup.html', tabId: tab.id });
        const pageInfo = await getPageState(normalizeUrl(tab.url));
        await updateIcon(tab.id, pageInfo?.properties.status || 'none');
      } else if (tab.status === 'complete' && changeInfo.status === 'complete') {
        // console.debug('tab was updated', tab.url, changeInfo);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  /** react to messages from the popup, settings and content scripts */
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

/**
 * @param url {string}
 * @return {Promise<boolean>}
 */
async function hasAnyEntriesForDomain(url) {
  const pageStates = await listPagesForDomain(getOrigin(url));
  return pageStates.length > 0;
}

function isAllowedDomain(url) {
  return url && url.startsWith('http');
}

async function injectContentScripts(tab) {
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/inject/inject.js'] });
  await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['/src/inject/inject.css'] });
  await chrome.tabs.sendMessage(tab.id, { type: 'update-content' });
}

/**
 *
 * @param message {{status: LinkStatus, url, tab}}
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleChangePageStatus(message, sendResponse) {
  console.log('updating status to', message.status);

  if (message.status === 'none') {
    await removePageState(normalizeUrl(message.url));
  } else {
    await updatePageState(normalizeUrl(message.url), { status: message.status });
  }
  await updateLinksInAllTabs();
  // TODO: is this needed? don't we already update the current tab above?
  // try {
  //   await chrome.tabs.sendMessage(message.tab.id, { type: 'update-content' });
  // } catch (e) {
  //   if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
  //     console.error('error while sending "update-content" message', e);
  //   }
  // }
  await updateIcon(message.tab.id, message.status);

  // Make sure the scripts are injected
  if (message.status !== 'none' && !await hasAnyEntriesForDomain(message.url)) {
    // not waiting for the injection to complete:
    injectContentScripts(message.tab).catch(console.error);
  }
  sendResponse('change-page-status done');
}

async function handleImportData(message, sendResponse) {
  for (const entry of message.data) {
    const { url, ...properties } = entry;
    // eslint-disable-next-line no-await-in-loop
    await updatePageState(url, properties);
  }
  sendResponse('success');
}

async function handleGetStatusMessage(message, sendResponse) {
  const pageInfo = await getPageState(normalizeUrl(message.url));
  sendResponse(pageInfo?.properties?.status || 'none');
}

/**
 * @param tabId {string}
 * @param status {LinkStatus}
 * @return {Promise<void>}
 */
async function updateIcon(tabId, status) {
  // TODO: refactor all calls to this function
  await chrome.action.setIcon({ tabId, path: `/images/icon-${status}.png` });
}

/**
 * react to changes in the storage: update all tabs
 */
async function updateLinksInAllTabs() {
  console.debug('storage changed, updating all tabs');
  const tabs = await chrome.tabs.query({});
  // we don't wait until the other tabs are updated.
  // noinspection ES6MissingAwait
  tabs
    .filter((tab) => isAllowedDomain(tab.url))
    .forEach(async (tab) => {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'update-content' });
      } catch (e) {
        if (e.message !== 'Could not establish connection. Receiving end does not exist.') {
          console.warn('error updating tab', tab.url, e);
        }
      }
    });
}

main();
