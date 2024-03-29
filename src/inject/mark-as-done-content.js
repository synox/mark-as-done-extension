// This script is injected into every page. It is responsible for updating the links
// on the page. It therefore needs to be as small and fast as possible.

// JS-Modules cannot be injected, so we cannot export or import anything.

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'update-content') {
    updateAllLinksOnPage().then(() => {
      watchPageForDynamicallyAddedLinks();
    });
  }
});

// eslint-disable-next-line func-names
(async function () {
  const pDebounceModule = await import(chrome.runtime.getURL('/src/3rdparty/p-debounce-4.0.0/index.js'));
  window.debouncedUpdateAllLinksOnPage = pDebounceModule.default(updateAllLinksOnPage, 200);
}());

/**
 * @param root {HTMLElement|Document}
 * @return {Promise<void>}
 */
async function updateAllLinksOnPage(root = document) {
  const links = root.querySelectorAll('a[href]');

  // create unique set of links
  const uniqueLinks = new Set();
  Array.from(links)
    .forEach((link) => uniqueLinks.add(normalizeUrl(link.href)));

  const statusMap = await chrome.runtime.sendMessage({ type: 'batch-get-status', urls: Array.from(uniqueLinks) });
  for (const link of links) {
    if (isNormalLink(link, window.location.href) && !isHashLinkToCurrentPage(link, window.location.href)) {
      const url = normalizeUrl(link.href);
      link.classList.remove('marked-as-done');
      link.classList.remove('marked-as-todo');

      if (statusMap[url]) {
        link.classList.add(`marked-as-${statusMap[url]}`);
      }
    }
  }
}

function isHashLinkToCurrentPage(link, documentUrl) {
  const pageUrl = new URL(link.href);
  const currentPageUrl = new URL(documentUrl);

  // compare urls, ignoring hash
  const isCurrentPage = pageUrl.origin === currentPageUrl.origin
    && pageUrl.pathname === currentPageUrl.pathname
    && pageUrl.search === currentPageUrl.search;

  return isCurrentPage && pageUrl.hash.length > 0;
}

/**
 * Only mark normal links and ignore links to anchors on the same page.
 * @param linkElement {HTMLAnchorElement}
 * @param documentUrl {string} Based on the current domain additional checks are done.
 * @return {boolean}
 */
// eslint-disable-next-line no-unused-vars
function isNormalLink(linkElement, documentUrl) {
  const url = linkElement.href;
  if (url === '') {
    return false;
  }

  // A plain '#' is often used for buttons and menubars. Can be ignored.
  return linkElement.getAttribute('href') !== '#';
}

function watchPageForDynamicallyAddedLinks() {
  if (!window.newLinkObserver) {
    // eslint-disable-next-line no-unused-vars
    window.newLinkObserver = new MutationObserver((mutationList, observer) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          const hasAddedLinks = Array
            .from(mutation.addedNodes)
            .some((node) => node instanceof HTMLAnchorElement || (node.querySelector && node.querySelector('a')));
          if (hasAddedLinks) {
            window.debouncedUpdateAllLinksOnPage();
            break;
          }
        }
      }
    });
    window.newLinkObserver.observe(
      document.querySelector('body'),
      { childList: true, subtree: true },
    );
  }
}

/**
 * Normalize the url to be used as key in the storage. This removes the hash and the search parameters.
 *
 * @param url
 * @return {null|string}
 * @deprecated this is a copy of the function in global.js. please keep updating both
 */
function normalizeUrl(url) {
  try {
    const urlObject = new URL(url);
    // In general, hash are ignored.

    // Search parameters must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
    // but on other pages the "?lang=en" should be ignored.

    let filteredSearch = urlObject.search.replace(/lang=.*$/, '');

    // In confluence-wiki, there is a suffix when clicking the sidebar which should be ignored.
    // https://wiki.corp.example.com/display/ABC/Link?src=contextnavpagetreemode
    filteredSearch = urlObject.search.replace(/src=contextnavpagetreemode/, '');

    if (filteredSearch.endsWith('&')) {
      // remove the trailing "&" after removing the  src param
      // https://wiki.corp.example.com/display/ABC/pageId=1234&src=contextnavpagetreemode
      filteredSearch = filteredSearch.substring(0, filteredSearch.length - 1);
    }
    if (filteredSearch === '?') {
      filteredSearch = '';
    }

    return urlObject.origin + urlObject.pathname + filteredSearch;
  } catch (error) {
    console.error(`Can not parse as url=${url}, error=${error}`);
    return null;
  }
}
