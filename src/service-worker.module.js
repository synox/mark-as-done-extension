import {
  listPagesForDomain, getPageState, updatePageState, removePageState,
} from './storage.js';
import { normalizeUrl } from './global.js';

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
  return await listPagesForDomain(new URL(url).origin).length > 0;
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
 * @param message {{status: LinkStatus, tab}}
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleChangePageStatus(message, sendResponse) {
  console.log('updating status to', message.status);

  if (message.status === 'none') {
    await removePageState(normalizeUrl(message.tab.url));
  } else {
    await updatePageState(normalizeUrl(message.tab.url), { status: message.status });
  }
  await updateLinksInAllTabs();
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
  sendResponse(pageInfo);
}

/**
 * @param tabId {string}
 * @param status {LinkStatus}
 * @return {Promise<void>}
 */
async function updateIcon(tabId, status) {
  await chrome.action.setIcon({ tabId, path: `/images/icon-${status}.png` });
}

// eslint-disable-next-line import/prefer-default-export
export function main() {
  chrome.permissions.onAdded.addListener((ev) => {
    console.log(`Permissions added: [${ev.permissions}] with origins [${ev.origins}]`);
    chrome.action.setPopup({ popup: 'src/popup/popup.html' });
  });

  chrome.action.setTitle({ title: 'disabled for this site. Click to request permissions' });
  chrome.action.onClicked.addListener((tab) => {
    try {
      chrome.permissions.request({ origins: [tab.url] });
    } catch (e) {
      console.error('error requesting permision', e);
      throw e;
    }
  });
  /**
   * react to tab activation: update popup and icon, and inject scripts
   */
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      // Only inject script if there are already any entries for the current domain
      if (await isAllowedDomain(tab.url) && await hasAnyEntriesForDomain(tab.url)) {
        await injectContentScripts(tab);
        chrome.action.setTitle({ title: '' });
      } else {
        chrome.action.setTitle({ title: 'mark as done: disabled for this site' });
        await updateIcon(tab.id, 'disabled');
      }

      if (tab.status === 'loading') {
        await activatePopup(tab);
        // const pageInfo = await getPageState(normalizeUrl(tab.url));
        // await updateIcon(tab.id, pageInfo.status);
      } else if (tab.status === 'complete' && changeInfo.status === 'complete') {
        // console.debug('tab was updated', tab.url, changeInfo);
      }
    } catch (e) {
      console.error(e);
      throw e;
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
