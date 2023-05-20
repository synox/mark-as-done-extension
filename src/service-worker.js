import { getStatus, prepareUrl } from './global.js';

async function activateIcon(tab) {
  // Update Icon in toolbar
  const status = await getStatus(tab.url);
  await browser.browserAction.setPopup({ popup: 'src/popup/popup.html', tabId: tab.id });
  await updateIcon(tab.id, status);
}

/**
 * @param url {string}
 * @return {Promise<boolean>}
 */
async function hasAnyStatusForDomain(url) {
  const urlObj = new URL(url);
  const allItems = await browser.storage.local.get(null);
  return Object.keys(allItems).some((key) => key.startsWith(`${urlObj.protocol}//${urlObj.hostname}`));
}

async function activateTabContent(tab) {
  console.debug('activateTabContent', tab.id);

  await browser.tabs.executeScript(tab.id, { file: '3rdparty/browser-polyfill.min.js' });
  // not importing global.js because node modules are not supported with executeScript()
  await browser.tabs.executeScript(tab.id, { file: 'src/inject/inject.js' });
  await browser.tabs.insertCSS(tab.id, { file: 'src/inject/inject.css' });
  browser.tabs.sendMessage(tab.id, { type: 'update-content' });
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject script if the current domain has any status set
  if (tab.url && tab.url.startsWith('http') && await hasAnyStatusForDomain(tab.url)) {
    if (tab.status === 'loading') {
      await activateIcon(tab);
    } else if (tab.status === 'complete') {
      console.log('tab was updated', tab.url);
      await activateTabContent(tab);
    }
  } else {
    console.log('domain is disabled', tab.url);
    await updateIcon(tab.id, 'disabled');
  }
});

/**
 *
 * @param message {{status: LinkStatus, tab}}
 * @param sendResponse
 * @return {Promise<void>}
 */
async function handleChangePageStatus(message, sendResponse) {
  console.log('updating status to', message.status);
  // Make sure the scripts are injected
  if (!await hasAnyStatusForDomain(message.tab.url)) {
    await activateTabContent(message.tab);
  }

  await storePageStatus(message.tab.url, message.status);
  try {
    browser.tabs.sendMessage(message.tab.id, { type: 'update-content' });
  } catch (e) {
    console.error('error while sending "update-content" message', e);
  }
  await updateIcon(message.tab.id, message.status);

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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Status changed in popup
  // console.debug('background: received', message);
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
 * @param status {LinkStatus}
 * @return {Promise<*>}
 */
async function storePageStatus(url, status) {
  const preparedUrl = prepareUrl(url);

  if (status === 'none') {
    return await browser.storage.local.remove(preparedUrl);
  }

  // This special syntax uses the value of preparedUrl as the key of the object
  return await browser.storage.local.set({ [preparedUrl]: status });
}
