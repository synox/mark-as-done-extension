const STATUS_DONE = 'done';
const STATUS_STARTED = 'started';
const STATUS_NONE = 'none';
const STATUS_DISABLED = 'disabled';
const STATUS_TODO = 'todo';

/**
 * @typedef {Object} LinkInfo
 * @property {string} url - The URL of the link.
 * @property {LinkStatus} status - The status of the link.
 */

/**
 * @typedef {'done'|'started'|'none'|'disabled'|'todo'} LinkStatus
 */

// Keep backwards compatibility
function compatibiltyStatus(oldStatus) {
  if (oldStatus === true) {
    return STATUS_DONE;
  }

  if (oldStatus === undefined) {
    return STATUS_NONE;
  }

  return oldStatus;
}

/**
 *
 * @param linkElement {HTMLAnchorElement}
 * @param documentUrl {string}
 * @return {boolean}
 */
function isNormalMarkableLink(linkElement, documentUrl) {
  const url = linkElement.href;
  if (url === '') {
    return false;
  }

  // A plain '#' is often used for buttons and menubars. Can be ignored.
  if (linkElement.getAttribute('href') === '#') {
    return false;
  }

  if (url === documentUrl) {
    return true;
  }

  // ignore header links in the sidebar
  if (documentUrl.startsWith('https://experienceleague.adobe.com/')
		&& linkElement.matches('#container [data-id="toc"] a[href^="#"]')) {
    return false;
  }

  const isSamePage = prepareUrl(url) === prepareUrl(documentUrl);
  if (isSamePage) {
    return true;
  }

  return true;
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

async function getStatus(url) {
  if (!url) {
    return STATUS_NONE;
  }

  if (!url.startsWith('http')) {
    return STATUS_DISABLED;
  }

  const preparedUrl = prepareUrl(url);
  if (!url) {
    return STATUS_NONE;
  }
  const value = await browser.storage.local.get(preparedUrl);
  return compatibiltyStatus(value[preparedUrl]);
}

function prepareUrl(url) {
  try {
    const urlObject = new URL(url);
    // In general, hash are ignored.

    // Search must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
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
 * @param {string} origin - The origin URL to get links from.
 * @returns {Promise<Array.<LinkInfo>>} links - A Promise that resolves to an array of LinkInfo objects.
 */
async function getAllLinksForDomain(origin) {
  const allLinks = await getAllLinksByDomain();
  return allLinks[origin];
}

/**
 * sort links by status in-place
 * @param links {array}
 * return {void}
 */
function sortLinksByStatus(links) {
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
function removeUrl(links, url) {
  // the update was sent async, so the current page might not yet be in the list. But it should be.
  return links.filter((link) => link.url !== url);
}

/**
 * change the status of one url. This is done in-place.
 * @param links {Array<LinkInfo>}
 * @param url {string}
 * @param newStatus {string}
 */
function updateStatusForUrl(links, url, newStatus) {
  // the update was sent async, so the current page might not yet be in the list. But it should be.
  const link = links.find((link) => link.url === url);
  if (link) {
    link.status = newStatus;
  } else {
    links.push({ url, status: newStatus });
  }
}

/**
 Retrieves all stored links by their domain from the browser's local storage.
 The links are sorted and grouped by domain.

 @returns {Promise<Map<string,Array.<LinkInfo>>>} links by domain. each domain contains an array of `LinkInfo`.  */
async function getAllLinksByDomain() {
  const allItems = await browser.storage.local.get(null);
  return Object.entries(allItems)
    .map((entry) => ({ url: entry[0], status: compatibiltyStatus(entry[1]) }))
    .sort()
    .reduce((accumulator, currentValue) => {
      let domain;
      try {
        domain = new URL(currentValue.url).origin;
      } catch (error) {
        domain = 'others';
      }

      accumulator[domain] = [...accumulator[domain] || [], currentValue];
      return accumulator;
    }, {});
}
