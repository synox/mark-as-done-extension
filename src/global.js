export const STATUS_NONE = 'none';
export const STATUS_TODO = 'todo';
export const STATUS_DONE = 'done';

/**
 * @property {LinkStatus} status
 * @property {string} url
 * @property {string} properties.title
 * @property {string} properties.modified
 * @property {string} properties.created
 */
export class PageInfo {
  constructor(url, properties = {}) {
    this.url = url;
    this.properties = properties;
  }
}

/**
 * @typedef {Object} LinkInfo
 * @property {string} url - The URL of the link.
 * @property {LinkStatus} status - The status of the link.
 */

/**
 * @typedef {'todo','started','done'|'none'|'disabled'} LinkStatus
 */

/**
 * Normalize the url to be used as key in the storage. This removes the hash and the search parameters.
 *
 * @param url
 * @return {null|string}
 */
export function normalizeUrl(url) {
  try {
    const urlObject = new URL(url);
    // In general, hash are ignored.

    // Search parameters must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
    // but on other pages the "?lang=en" should be ignored.

    let filteredSearch = urlObject.search.replace(/lang=.*$/, '');

    // In confluence-wiki, there is a suffix when clicking the sidebar which should be ignored.
    // https://wiki.corp.example.com/display/ABC/Link?src=contextnavpagetreemode
    filteredSearch = urlObject.search.replace(/src=contextnavpagetreemode/, '');

    if (filteredSearch === '?') {
      filteredSearch = '';
    }

    return urlObject.origin + urlObject.pathname + filteredSearch;
  } catch (error) {
    console.error(`Can not parse as url=${url}, error=${error}`);
    return null;
  }
}

export function isValidUrl(url) {
  if (!url || !url.startsWith('http')) {
    return false;
  }
  try {
    return new URL(url).origin;
  } catch (error) {
    return false;
  }
}

export function getOrigin(url) {
  if (isValidUrl(url)) {
    return new URL(url).origin;
  } else {
    return null;
  }
}

export function ensureSitePermissions(tabUrl) {
  if (!isValidUrl(tabUrl)) {
    return Promise.resolve();
  }

  return chrome.permissions.request({ origins: [tabUrl] }).then((granted) => {
    console.debug('permissions requested. Granted: ', granted);
  });
}
