import {
  compatibiltyStatus, normalizeUrl, STATUS_DISABLED, STATUS_DONE, STATUS_NONE,
} from './global.js';

const defaultSettings = {
  enabledStates: ['todo', 'started', 'done'],
};

/**
 * @typedef {Object} UserSettings
 * @property {LinkStatus[]} enabledStates
 */

/**
 *
 * @return {UserSettings}
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

/**
 * Update the status of a page
 * @param url {string}
 * @param title {string}
 * @param newStatus {LinkStatus}
 * @return {Promise<*>}
 */
export async function storePageStatus(url, title, newStatus) {
  const normalizedUrl = normalizeUrl(url);
  console.log('storePageStatus', normalizedUrl, title, newStatus);
  if (newStatus === 'none') {
    await chrome.storage.local.remove(normalizedUrl);
  } else {
    // This special syntax uses the value of normalizedUrl as the key of the object
    await chrome.storage.local.set({ [normalizedUrl]: { status: newStatus, title } });
  }
}

class PageInfo {
  constructor(status, title, url) {
    this.status = status;
    this.title = title;
    this.url = url;
  }
}

function readEntry(value, url) {
  if (!value) {
    return new PageInfo(STATUS_NONE, null, url);
  }

  // read with backward compatibility
  if (value.status) {
    // v3 format
    return new PageInfo(value.status, value.title, url);
  } else if (value === true) {
    // v1 format  (boolean)
    return new PageInfo(STATUS_DONE, null, url);
  } else if (value === undefined) {
    // v1 format (boolean)
    return new PageInfo(STATUS_NONE);
  } else if (value instanceof String) {
    // v2 (status as string)
    return new PageInfo(value, null, url);
  } else {
    console.error('unknown format', value);
    return new PageInfo(STATUS_NONE, null, url);
  }
}

/**
 * @param url
 * @return {Promise<PageInfo>}
 */
export async function getPageInfo(url) {
  if (!url) {
    return new PageInfo(STATUS_NONE);
  }

  if (!url.startsWith('http')) {
    return new PageInfo(STATUS_DISABLED);
  }

  const normalizedUrl = normalizeUrl(url);
  if (!url) {
    return new PageInfo(STATUS_NONE);
  }
  const valueWrapper = await chrome.storage.local.get(normalizedUrl);
  const value = valueWrapper[normalizedUrl];
  return readEntry(value);
}

export async function getDataExport() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map((entry) => ({ url: entry[0], title: entry.title, status: compatibiltyStatus(entry[1]) }))
    .sort();
}

/**
 Retrieves all stored links by their domain from the browser's local storage.
 The links are sorted and grouped by domain.
 @returns {Promise<Map<string,Array.<PageInfo>>>} links by domain.
  each domain contains an array of `LinkInfo`.
 */
export async function getAllLinksGroupedByDomain() {
  const allItems = await chrome.storage.local.get(null);
  return Object.entries(allItems)
    .map(([url, value]) => readEntry(value, url))
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
 * @param origin {string} e.g. new URL().origin
 * @return {Promise<PageInfo[]>}
 */
export async function getEntriesForDomain(origin) {
  const allItems = await chrome.storage.local.get(null);
  return Object.keys(allItems)
    .filter((key) => key.startsWith(origin))
    .map((key) => getPageInfo(key));
}
