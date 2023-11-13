/**
 * get state of a page
 * @param url
 * @return {Promise<PageInfo>}
 */
export async function getPageState(url) {
  console.log('getPageState', url);
  if (!url || !url.startsWith('http')) {
    return null;
  }

  const valueWrapper = await chrome.storage.local.get(url);
  if (!valueWrapper) {
    return null;
  }
  return readPageStateFromStorageValue(url, valueWrapper[url]);
}

/**
 * @param url {string}
 * @property {LinkStatus} status
 * @property {string} title
 * @property {string} lastModified
 * @property {string} created
 */
class PageInfo {
  constructor(url, properties) {
    this.url = url;
    this.properties = properties;
  }
}

/**
 * Update the status of a page
 * @param url {string}
 * @param properties {object}
 * @return {Promise<*>}
 */
export async function updatePageState(url, properties) {
  const state = await getPageState(url);
  const existingProperties = state?.properties || {};
  const mergedProperties = { ...existingProperties, ...properties };
  await chrome.storage.local.set({ [url]: mergedProperties });
}

export async function removePageState(url) {
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
 Retrieves all stored links by their domain from the browser's local storage.
 The links are sorted and grouped by domain.
 @returns {Promise<Map<string,Array.<PageInfo>>>} links by domain.
  each domain contains an array of `LinkInfo`.
 */
export async function listPagesGroupedByStatus() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => new PageInfo(url, value))
    .sort()
    .reduce((accumulator, currentValue) => {
      accumulator[currentValue.properties.status] = [...accumulator[currentValue.properties.status] || [], currentValue];
      return accumulator;
    }, {});
}

/**
 * @param origin {string} e.g. new URL(url).origin
 * @return {Promise<PageInfo[]>}
 */
export async function listPagesForDomain(origin) {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .filter(([key]) => key.startsWith(origin))
    .map(([key, value]) => readPageStateFromStorageValue(key, value));
}

// TODO: do automatic data migrations on first load

const defaultSettings = {
  enabledStates: ['todo', 'started', 'done'],
};

/**
 * @typedef {Object} UserSettings
 * @property {LinkStatus[]} enabledStates
 * @deprecated
 */

/**
 *
 * @return {UserSettings}
 * @deprecated
 */
export async function getUserSettings() {
  const result = await chrome.storage.local.get('userSettings');
  return {
    ...defaultSettings,
    ...result.userSettings,
  };
}

/**
 * @typedef {UserSettings} userSettings (merged with existing settings)
 * @return {Promise<any>}
 * @deprecated
 */
export async function setUserSettings(userSettings) {
  // eslint-disable-next-line no-return-await
  const currentUserSettings = await getUserSettings();
  return await chrome.storage.local.set({
    userSettings: {
      ...currentUserSettings, ...userSettings,
    },
  });
}
