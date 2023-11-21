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
  if(!state) {
    mergedProperties.created = new Date().toISOString();
  }
  mergedProperties.modified = new Date().toISOString();
  await chrome.storage.local.set({ [url]: mergedProperties });
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
 Retrieves all stored links by their domain from the browser's local storage.
 The links are sorted and grouped by domain.
 @returns {Promise<Map<string,Array.<PageInfo>>>} links by domain.
  each domain contains an array of `LinkInfo`.
 */
export async function listPagesGroupedByDomain() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => new PageInfo(url, value))
    .sort()
    .reduce((accumulator, currentValue) => {
      let domain;
      try {
        domain = new URL(currentValue.url).origin;
      } catch (error) {
        // ignore bad urls
        return accumulator;
      }

      accumulator[domain] = [...accumulator[domain] || [], currentValue];
      return accumulator;
    }, {});
}

/**
 @returns {Promise<Map<string,Array.<PageInfo>>>}
 */
export async function listPagesGroupedByStatus() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => new PageInfo(url, value))
    .sort()
    .reduce((accumulator, currentValue) => {
      accumulator[currentValue.properties.status] = [
        ...accumulator[currentValue.properties.status] || [],
        currentValue,
      ];
      return accumulator;
    }, {});
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
    const value = allItems[key];
    // eslint-disable-next-line no-await-in-loop
    if (typeof value === 'boolean') {
      // upgrade from v1
      // eslint-disable-next-line no-await-in-loop
      await updatePageState(key, { status: value ? 'done' : 'todo' });
    } else if (typeof value === 'string') {
      // upgrade from v2
      // eslint-disable-next-line no-await-in-loop
      await updatePageState(key, { status: value });
    } else if (typeof value === 'object' && value.status === 'started') {
      // upgrade from v3. Status 'started' is not used anymore and replaced with 'todo'.
      // eslint-disable-next-line no-await-in-loop
      await updatePageState(key, { status: 'todo' });
    }
  }
}
