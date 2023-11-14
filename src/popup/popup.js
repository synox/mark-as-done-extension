import {
  getPageState,
  listPages,
  listPagesForDomain,
  listPagesGroupedByDomain,
  removePageState,
  updatePageState,
} from '../storage.js';
import {
  normalizeUrl, sortLinksByStatus, STATUS_DONE, STATUS_NONE, STATUS_TODO,
} from '../global.js';

function initEventButtonHandlers(tabUrl) {
  document.getElementById('mark-as-unread-button').addEventListener('click', (event) => {
    event.preventDefault();
    handleChangeState(tabUrl, STATUS_TODO);
  });
  document.getElementById('mark-as-finished-button').addEventListener('click', (event) => {
    event.preventDefault();
    handleChangeState(tabUrl, STATUS_DONE);
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageInfo = await getPageState(normalizeUrl(tab.url));

  initEventButtonHandlers(tab.url);
  await updatePopup(pageInfo, tab.url);
  //
  // let currentSiteLinks = await getAllLinksForDomain(new URL(tab.url).origin);
  // // Remove current page from list, only show other pages on the same domain
  // currentSiteLinks = removeUrl(currentSiteLinks, tab.url);
  // addRelatedLinks(currentSiteLinks);
  //
  // document.querySelector('#listButton').addEventListener('click', () => {
  //   setTimeout(window.close, 200);
  // });
  //
  // document.querySelectorAll('button.changeStateButton, a.changeStateButton')
  //   .forEach((button) => button.addEventListener('click', () => handleChangeState(button)));
}

async function handleChangeState(url, status) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let updatedPageInfo;
  if (status === STATUS_NONE) {
    await removePageState(normalizeUrl(url));
    updatedPageInfo = null;
  } else {
    await updatePageState(url, { status, title: tab.title });
    updatedPageInfo = await getPageState(normalizeUrl(url));
    updatedPageInfo.status = status;
  }

  await updatePopup(updatedPageInfo, tab.url);

  // not waiting for response to not block user interaction
  chrome.runtime.sendMessage({ type: 'change-page-status', status, tab });

  setTimeout(window.close, 800);
}

/**
 * @param  page {PageInfo}
 * @param tabUrl {string}
 * @return {HTMLElement}
 */
function createPageElement(page, tabUrl) {
  /**
   * example:
   * <div class="page not-current-unread">
   *         <a href="some page">
   *           <p class="title">The Account and profile</p>
   *           <p class="metadata">asdf.com - Nov 12</p>
   *         </a>
   *           <button class="outline">remove</button>
   *       </div>
   */
  const div = document.createElement('div');
  div.classList.add('page');

  if (page.url === tabUrl) {
    div.classList.add('current');
  }

  const a = document.createElement('a');
  a.href = page.url;
  a.target = '_blank';
  const title = document.createElement('p');
  title.classList.add('title');
  title.textContent = page.properties.title || new URL(page.url).pathname;
  const metadata = document.createElement('p');
  metadata.classList.add('metadata');
  const { hostname } = new URL(page.url);
  const lastModified = new Date(page.properties.lastModified).toLocaleDateString();
  metadata.textContent = `${hostname} - ${lastModified}`;
  const button = document.createElement('button');
  button.classList.add('outline');
  button.textContent = 'remove';
  button.addEventListener('click', async () => {
    await handleChangeState(page.url, STATUS_NONE);
    div.remove();
  });
  a.append(title);
  a.append(metadata);
  div.append(a);
  div.append(button);
  return div;
}

async function replacePagesInPopup(onlyShowCurrentDomain, tabUrl) {
  document.querySelector('main section.unread .pages').innerHTML = '';
  document.querySelector('main section.finished .pages').innerHTML = '';
  const pages = onlyShowCurrentDomain
    ? await listPagesForDomain(new URL(tabUrl).origin)
    : await listPages();

  for (const page of pages) {
    const pageElement = createPageElement(page, tabUrl);
    if (page.properties.status === 'todo') {
      document.querySelector('main section.unread .pages').append(pageElement);
    } else {
      document.querySelector('main section.finished .pages').append(pageElement);
    }
  }
}

/**
 *
 * @param pageInfo {PageInfo}
 * @param tabUrl {string}
 */
async function updatePopup(pageInfo, tabUrl) {
  console.debug('update with status', pageInfo);

  if (pageInfo && pageInfo.properties.status === 'todo') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.remove('hidden');
  } else if (pageInfo && pageInfo.properties.status === 'done') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  } else {
    document.getElementById('mark-as-unread-button').classList.remove('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  }

  const currentDomainFilter = document.getElementById('current-domain-filter');
  currentDomainFilter.closest('label').querySelector('span').textContent = new URL(tabUrl).hostname;
  currentDomainFilter.addEventListener('change', async () => {
    await replacePagesInPopup(currentDomainFilter.checked, tabUrl);
  });
  await replacePagesInPopup(currentDomainFilter.checked, tabUrl);
}
init().catch(console.error);
