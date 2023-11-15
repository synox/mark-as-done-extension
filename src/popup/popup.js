import {
  getPageState,
  listPages,
  listPagesForDomain,
} from '../storage.js';
import {
  ensureSitePermissions,
  getOrigin, isValidUrl,
  normalizeUrl, STATUS_DONE, STATUS_NONE, STATUS_TODO,
} from '../global.js';

const optimisticUpdates = {};

async function main() {
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

function initEventButtonHandlers(tabUrl) {
  document.getElementById('mark-as-unread-button').addEventListener('click', (event) => {
    event.preventDefault();
    // we cannot use async/await here because we can only request permissions from a user gesture.
    ensureSitePermissions(tabUrl).then(() => {
      handleChangeState(tabUrl, STATUS_TODO);
    });
  });
  document.getElementById('mark-as-finished-button').addEventListener('click', (event) => {
    event.preventDefault();
    // we cannot use async/await here because we can only request permissions from a user gesture.
    ensureSitePermissions(tabUrl).then(() => {
      handleChangeState(tabUrl, STATUS_DONE);
    });
  });
  document.getElementById('settings-button').addEventListener('click', (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

async function handleChangeState(url, status) {
  // not waiting for response to not block user interaction
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({
    type: 'change-page-status', status, url: tab.url, tab,
  });

  // do optimistic local data update, assuming the change will be successful
  console.log('change state', url, status);
  const updatedPageInfo = { url, properties: { status } };
  optimisticUpdates[url] = updatedPageInfo;
  await updatePopup(updatedPageInfo, tab.url);

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
    div.remove();
    await handleChangeState(page.url, STATUS_NONE);
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
    ? await listPagesForDomain(getOrigin(tabUrl))
    : await listPages();

  let unreadCount = 0;
  let finishedCount = 0;
  for (const page of pages) {
    if (optimisticUpdates[page.url]) {
      page.properties = { ...page.properties, ...optimisticUpdates[page.url].properties };
    }
    const pageElement = createPageElement(page, tabUrl);
    if (page.properties.status === 'todo') {
      document.querySelector('main section.unread .pages').append(pageElement);
      unreadCount += 1;
    } else if (page.properties.status === 'done') {
      document.querySelector('main section.finished .pages').append(pageElement);
      finishedCount += 1;
    } else {
      // ignore "none" status
    }
  }

  document.querySelector('main section.unread h2 .counter').textContent = `(${unreadCount})`;
  document.querySelector('main section.finished h2 .counter').textContent = `(${finishedCount})`;
}

/**
 *
 * @param pageInfo {PageInfo}
 * @param tabUrl {string}
 */
async function updatePopup(pageInfo, tabUrl) {
  console.debug('update popup with status', pageInfo);

  if (!isValidUrl(tabUrl)) {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  } else if (pageInfo && pageInfo.properties.status === 'todo') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.remove('hidden');
  } else if (pageInfo && pageInfo.properties.status === 'done') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  } else {
    document.getElementById('mark-as-unread-button').classList.remove('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  }

  let showOnlyCurrentDomain;
  if (isValidUrl(tabUrl)) {
    const currentDomainFilter = document.getElementById('current-domain-filter');
    currentDomainFilter.closest('label').querySelector('span').textContent = new URL(tabUrl).hostname;
    currentDomainFilter.addEventListener('change', async () => {
      await replacePagesInPopup(currentDomainFilter.checked, tabUrl);
    });
    showOnlyCurrentDomain = currentDomainFilter.checked;
  } else {
    document.querySelector('aside .filters').remove();
    showOnlyCurrentDomain = false;
  }

  await replacePagesInPopup(showOnlyCurrentDomain, tabUrl);
}

main().catch(console.error);
