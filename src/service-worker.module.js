import {
  getPageState, listPagesForDomain, removePageState, updatePageState, upgradeDatastore,
} from './storage.js';
import { getOrigin, normalizeUrl, STATUS_NONE } from './global.js';

// eslint-disable-next-line import/prefer-default-export
export function main() {
  chrome.runtime.onInstalled.addListener(upgradeDatastore);

  chrome.action.setPopup({ popup: 'src/popup/popup.html' });

  /** on tab activation: update popup and icon, and inject scripts */
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (changeInfo.status === 'loading') {
        const url = changeInfo.url || tab.url;
        const pageInfo = await getPageState(normalizeUrl(url));
        await updateIcon(tabId, pageInfo?.properties.status || 'none');
        // not waiting for the injection to complete:
        injectContentScripts(tab).catch(console.error);
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
    if (message.type === 'remove-page') {
      handleRemovePageStatus(message, sendResponse);
    }

    if (message.type === 'import-data') {
      handleImportData(message, sendResponse);
    }

    if (message.type === 'get-status') {
      handleGetStatusMessage(message, sendResponse);
    }
    if (message.type === 'batch-get-status') {
      handleGetStatusMessageAsBatch(message, sendResponse);
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
  // Only inject script if there are already any entries for the current domain
  if (await isAllowedDomain(tab.url) && await hasAnyEntriesForDomain(tab.url)) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/inject/mark-as-done-content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['/src/inject/mark-as-done-content.css'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'update-content' });
  }
}

/**
 * @param message {{url, tab, properties: {title, status: LinkStatus,} }} Note that the url and title can be different from the tab.
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleChangePageStatus(message, sendResponse) {
  if (message.properties.status === 'none') {
    await removePageState(normalizeUrl(message.url));
  } else {
    await updatePageState(normalizeUrl(message.url), message.properties);
  }
  await updateLinksInAllTabs();
  await updateIcon(message.tab.id, message.properties.status);

  // not waiting for the injection to complete:
  injectContentScripts(message.tab).catch(console.error);
  sendResponse('change-page-status done');
}

/**
 *
 * @param message {{tabId, tabUrl, url}} Note that the url and title can be different from the tab.
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleRemovePageStatus(message, sendResponse) {
  await removePageState(normalizeUrl(message.url));
  await updateLinksInAllTabs();

  if (message.tabUrl === message.url) {
    await updateIcon(message.tabId, STATUS_NONE);
  }

  sendResponse('remove-page done');
}

async function handleImportData(message, sendResponse) {
  for (const entry of message.data) {
    const { url, ...properties } = entry;
    // eslint-disable-next-line no-await-in-loop
    await updatePageState(url, properties);
  }
  await upgradeDatastore();
  sendResponse('success');
}

async function handleGetStatusMessage(message, sendResponse) {
  const pageInfo = await getPageState(normalizeUrl(message.url));
  sendResponse(pageInfo?.properties?.status || 'none');
}

async function handleGetStatusMessageAsBatch(message, sendResponse) {
  const urls = message.urls.map(normalizeUrl);
  const resultMap = {};
  await Promise.all(urls.map(async (url) => {
    const pageInfo = await getPageState(normalizeUrl(url));
    if (pageInfo) {
      resultMap[url] = pageInfo.properties.status;
    }
  }));
  sendResponse(resultMap);
}

// eslint-disable-next-line no-unused-vars
async function createDynamicIcon(status) {
  const canvas = new OffscreenCanvas(32, 32);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 32, 32);

  /// / -----

  const lineWidth = 5;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 2; // 5px for padding
  const startAngle = -0.5 * Math.PI; // Start from the top
  const progress = 0.75; // 75% progress

  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  let statusImage;
  if (status === 'none') statusImage = 'icon-none';
  if (status === 'todo') statusImage = 'chevron';
  if (status === 'done') statusImage = 'icon-done';

  const image = await fetch(chrome.runtime.getURL(`images/${statusImage}.png`));
  const imageBlob = await image.blob();
  // convert blob to bitmap
  const imageBitmap = await createImageBitmap(imageBlob);
  const padding = 8;
  context.drawImage(imageBitmap, padding, padding, canvas.width - padding - 7, canvas.height - padding - 7);
  // context.drawImage(imageBitmap, padding, padding, 32, 32);

  // Draw the progress arc
  context.beginPath();
  context.arc(centerX, centerY, radius, startAngle, startAngle + progress * 2 * Math.PI);
  context.lineWidth = lineWidth;
  context.strokeStyle = '#1665ed';
  context.stroke();

  // Draw the rest of the line in gray
  context.beginPath();
  context.arc(centerX, centerY, radius, startAngle + progress * 2 * Math.PI, startAngle + 2 * Math.PI);
  context.lineWidth = lineWidth;
  context.strokeStyle = '#eee';
  context.stroke();

  const imageData = context.getImageData(0, 0, 32, 32);
  return imageData;
}

/**
 * @param tabId {string}
 * @param status {LinkStatus}
 * @return {Promise<void>}
 */
async function updateIcon(tabId, status) {
  await chrome.action.setIcon({ tabId, path: `/images/icon-${status}.png` });

  // the following is an experiment, and it does not look good. Maybe we come back to this later.
  // const imageData = await createDynamicIcon(status);
  // await chrome.action.setIcon({ imageData });
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
