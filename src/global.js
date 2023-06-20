export const STATUS_DONE = 'done';
export const STATUS_STARTED = 'started';
export const STATUS_NONE = 'none';
export const STATUS_DISABLED = 'disabled';
export const STATUS_TODO = 'todo';

/**
 * @typedef {Object} LinkInfo
 * @property {string} url - The URL of the link.
 * @property {LinkStatus} status - The status of the link.
 */

/**
 * @typedef {'todo','started','done'|'none'|'disabled'} LinkStatus
 */

// Keep backwards compatibility
export function compatibiltyStatus(oldStatus) {
  if (oldStatus === true) {
    return STATUS_DONE;
  }

  if (oldStatus === undefined) {
    return STATUS_NONE;
  }

  return oldStatus;
}

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

/**
 * @param url
 * @return {Promise<LinkStatus>}
 */
export async function getStatus(url) {
  if (!url) {
    return STATUS_NONE;
  }

  if (!url.startsWith('http')) {
    return STATUS_DISABLED;
  }

  const normalizedUrl = normalizeUrl(url);
  if (!url) {
    return STATUS_NONE;
  }
  const value = await browser.storage.local.get(normalizedUrl);
  return compatibiltyStatus(value[normalizedUrl]);
}

/**
 * @param {string} origin - The origin URL to get links from.
 * @returns {Promise<Array.<LinkInfo>>} links
 */
export async function getAllLinksForDomain(origin) {
  const allLinks = await getAllLinksByDomain();
  return allLinks[origin] || [];
}

/**
 * sort links by status in-place
 * @param links {array}
 * return {void}
 */
export function sortLinksByStatus(links) {
  links.sort((a, b) => {
    const statusValues = {
      [STATUS_STARTED]: 2,
      [STATUS_TODO]: 1,
      [STATUS_DONE]: -1,
      default: 0,
    };

    const getMappedValue = (status) => statusValues[status] || statusValues.default;

    return getMappedValue(b.status) - getMappedValue(a.status);
  });
}

/**
 *
 * @param links {Array<LinkInfo>}
 * @param url {string}
 */
export function removeUrl(links, url) {
  // the update was sent async, so the current page might not yet be in the list. But it should be.
  return links.filter((link) => link.url !== url);
}

/**
 * change the status of one url. This is done in-place.
 * @param links {Array<LinkInfo>}
 * @param url {string}
 * @param newStatus {string}
 */
export function updateStatusForUrl(links, url, newStatus) {
  // the update was sent async, so the current page might not yet be in the list. But it should be.
  const link = links.find((aLink) => aLink.url === url);
  if (link) {
    link.status = newStatus;
  } else {
    links.push({ url, status: newStatus });
  }
}

/**
 Retrieves all stored links by their domain from the browser's local storage.
 The links are sorted and grouped by domain.
 @returns {Promise<Map<string,Array.<LinkInfo>>>} links by domain.
     each domain contains an array of `LinkInfo`.
 */
export async function getAllLinksByDomain() {
  const allItems = await browser.storage.local.get(null);
  return Object.entries(allItems)
    .map((entry) => ({ url: entry[0], status: compatibiltyStatus(entry[1]) }))
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
