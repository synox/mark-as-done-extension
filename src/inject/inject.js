// This script is injected into every page. It is responsible for updating the links
// on the page. It therefore needs to be as small and fast as possible.

// JS-Modules cannot be injected, so we cannot export or import anything.

// console.debug('mark-as-done script added');

// eslint-disable-next-line no-unused-vars

// eslint-disable-next-line no-unused-vars
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.debug('content: received', request);
  if (request.type === 'update-content') {
    updateAllLinksOnPage(window.location.href).then(() => watchPageForDynamicallyAddedLinks());
  }
});

/**
 * @param documentUrl {string}
 * @param root {HTMLElement|Document}
 * @return {Promise<void>}
 */
async function updateAllLinksOnPage(documentUrl, root = document) {
  const links = root.querySelectorAll('a[href]');

  // create unique set of links
  const allLinks = new Set();
  Array.from(links)
    .filter((link) => isNormalLink(link, documentUrl))
    .forEach((link) => allLinks.add(link.href));

  const statusMap = await chrome.runtime.sendMessage({ type: 'batch-get-status', urls: Array.from(allLinks) });
  for (const link of links) {
    if (isNormalLink(link, documentUrl)) {
      const url = normalizeUrl(link.href);
      link.classList.remove('marked-as-done');
      link.classList.remove('marked-as-todo');

      if (statusMap[url]) {
        link.classList.add(`marked-as-${statusMap[url]}`);
      }
    }
  }
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
  // TODO: this needs to be more generic. We need to watch for changes in the DOM.
  // Maybe use a MutationObserver?

  // TODO: prevent multiple observers. Currently this function is called multiple times.

  // Some pages load content later. Need to add a trigger to process the links later.
  if (window.location.href.startsWith('https://learning.oreilly.com/')) {
    // Button to show the toc
    document.querySelectorAll('a.sbo-toc-thumb').forEach((a) => {
      a.addEventListener('click', () => updateAllLinksOnPage(window.location.href));
    });
  }

  if (window.location.href.startsWith('https://wiki.corp')) {
    // eslint-disable-next-line no-unused-vars
    const mutationObserver = new MutationObserver((mutationList, observer) => {
      // Use traditional 'for loops' for IE 11
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          console.debug('Wiki: Sidebar was loaded.');
          updateAllLinksOnPage(window.location.href);
        }
      }
    });
    mutationObserver.observe(
      document.querySelector('div.plugin_pagetree_children'),
      { childList: true, subtree: false },
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

    if (filteredSearch === '?') {
      filteredSearch = '';
    }

    return urlObject.origin + urlObject.pathname + filteredSearch;
  } catch (error) {
    console.error(`Can not parse as url=${url}, error=${error}`);
    return null;
  }
}
