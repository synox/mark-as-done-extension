// This script is injected into every page. It is responsible for updating the links
// on the page. It therefore needs to be as small and fast as possible.

// JS-Modules cannot be injected, so we cannot export and import anything.

console.log('Content script injected');

// TODO: move all storage access into the service worker

// eslint-disable-next-line no-unused-vars
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.debug('content: received', request);
  if (request.type === 'update-content') {
    console.debug('content: updating content');
    await updateAllLinksOnPage(window.location.href);

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
});

async function getStatusFromService(url) {
  return await browser.runtime.sendMessage({ type: 'get-status', url });
}

/**
 *
 * @param documentUrl {string}
 * @param root {HTMLElement|Document}
 * @return {Promise<void>}
 */
async function updateAllLinksOnPage(documentUrl, root = document) {
  const links = root.querySelectorAll('a');

  console.debug('found ', links.length, 'links');
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (isNormalMarkableLink(link, documentUrl)) {
      // eslint-disable-next-line no-await-in-loop
      const status = await getStatusFromService(link.href);

      link.classList.remove('marked-as-done');
      link.classList.remove('marked-as-todo');
      link.classList.remove('marked-as-started');

      if (status !== 'none') {
        link.classList.add(`marked-as-${status}`);
      }
    }
  }
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

// TODO: eliminate this duplicate function
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

