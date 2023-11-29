import { normalizeUrl, PageInfo } from './global.js';

/**
 * get state of a page
 * @param url
 * @return {Promise<PageInfo>}
 */
export async function getPageState(url) {
  if (!url || !url.startsWith('http')) {
    return null;
  }
  url = normalizeUrl(url);

  const valueWrapper = await chrome.storage.local.get(url);
  if (!valueWrapper || Object.keys(valueWrapper).length === 0) {
    return null;
  }
  return readPageStateFromStorageValue(url, valueWrapper[url]);
}

/**
 * Update the status of a page
 * @param url {string}
 * @param properties {object}
 * @return {Promise<*>}
 */
export async function updatePageState(url, properties) {
  url = normalizeUrl(url);
  const state = await getPageState(url);
  const existingProperties = state?.properties || {};
  const mergedProperties = { ...existingProperties, ...properties };
  if (!mergedProperties.created) {
    mergedProperties.created = new Date().toISOString();
  }
  mergedProperties.modified = new Date().toISOString();
  await chrome.storage.local.set({ [url]: mergedProperties });
  return mergedProperties;
}

/**
 * Update the status of a page
 * @param url {string}
 * @param properties {object}
 * @return {Promise<*>}
 */
export async function internalReplacePageState(url, properties) {
  await chrome.storage.local.set({ [url]: properties });
}

export async function removePageState(url) {
  url = normalizeUrl(url);
  await chrome.storage.local.remove(url);
}

function readPageStateFromStorageValue(url, value) {
  if (!value) {
    return null;
  }
  return new PageInfo(url, value);
}

export async function getDataExport() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => ({ url, ...value }))
    .sort();
}

/**
 @returns {Promise<Map<string,Array.<PageInfo>>>}
 */
export async function listPages() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => new PageInfo(url, value))
    .sort();
}

/**
 * @param origin {string} e.g. new URL(url).origin
 * @return {Promise<PageInfo[]>}
 */
export async function listPagesForDomain(origin) {
  if (!origin) {
    return [];
  }
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .filter(([key]) => key.startsWith(origin))
    .map(([key, value]) => readPageStateFromStorageValue(key, value));
}

export async function upgradeDatastore() {
  console.log('upgrade datastore');
  const allItems = await chrome.storage.local.get(null);
  for (const key of Object.keys(allItems)) {
    let value = allItems[key];
    // eslint-disable-next-line no-await-in-loop
    if (typeof value === 'boolean') {
      // upgrade from v1
      // eslint-disable-next-line no-await-in-loop
      value = await updatePageState(key, { status: value ? 'done' : 'todo' });
    } else if (typeof value === 'string') {
      // upgrade from v2
      // eslint-disable-next-line no-await-in-loop
      value = await updatePageState(key, { status: value });
    } else if (typeof value === 'object' && value.status === 'started') {
      // upgrade from v3. Status 'started' is not used anymore and replaced with 'todo'.
      // eslint-disable-next-line no-await-in-loop
      value = await updatePageState(key, { status: 'todo' });
    }

    if (value['0']) {
      // remove invalid keys
      console.log('remove invalid keys for ', key);
      delete value['0'];
      delete value['1'];
      delete value['2'];
      delete value['3'];
      delete value['4'];
      delete value['5'];
      delete value['6'];
      delete value['7'];

      // eslint-disable-next-line no-await-in-loop
      await internalReplacePageState(key, value);
    }
  }
}
