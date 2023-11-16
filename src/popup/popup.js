import { getPageState, listPages, listPagesForDomain } from '../storage.js';
import {
  ensureSitePermissions,
  getOrigin,
  isValidUrl, PageInfo,
  STATUS_DONE,
  STATUS_NONE,
  STATUS_TODO,
} from '../global.js';

class PopupContext {
  constructor() {
    /**
     * @type {PageInfo}
     */
    this.pageInfo = null;
    this.optimisticUpdates = {};
    this.tab = null;
  }
}

function showOnlyCurrentDomain(popupContext) {
  const currentDomainFilter = document.getElementById('current-domain-filter');
  const onlyShowCurrentDomain = isValidUrl(popupContext.tab.url) && currentDomainFilter.checked;
  return onlyShowCurrentDomain;
}

async function main() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const popupContext = new PopupContext();
  // eslint-disable-next-line prefer-destructuring
  popupContext.tab = tabs[0];
  popupContext.pageInfo = await getPageState(popupContext.tab.url);

  initEventButtonHandlers(popupContext.tab.url);
  await updatePopup();

  function handleChangeCurrentPageState(status) {
    const tabUrl = popupContext.tab.url;
    const properties = { status, title: popupContext.tab.title };
    // not waiting for response to not block user interaction
    chrome.runtime.sendMessage({
      type: 'change-page-status',
      tab: popupContext.tab,
      url: tabUrl,
      properties,
    });

    // do optimistic local data update, assuming the change will be successful
    console.log('change state', tabUrl, status);
    if (!popupContext.pageInfo) {
      popupContext.pageInfo = new PageInfo(tabUrl);
    }
    popupContext.pageInfo.properties.status = status;
    popupContext.pageInfo.properties.title = popupContext.tab.title;
    popupContext.optimisticUpdates[tabUrl] = popupContext.pageInfo;

    // noinspection ES6MissingAwait
    updatePopup();

    setTimeout(window.close, 800);
  }

  function initEventButtonHandlers(tabUrl) {
    document.getElementById('mark-as-unread-button').addEventListener('click', (event) => {
      event.preventDefault();
      // we cannot use async/await here because we can only request permissions from a user gesture.
      ensureSitePermissions(tabUrl).then(() => {
        handleChangeCurrentPageState(STATUS_TODO);
      });
    });
    document.getElementById('mark-as-finished-button').addEventListener('click', (event) => {
      event.preventDefault();
      // we cannot use async/await here because we can only request permissions from a user gesture.
      ensureSitePermissions(tabUrl).then(() => {
        handleChangeCurrentPageState(STATUS_DONE);
      });
    });
    document.getElementById('settings-button').addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  function removePageState(url) {
    // not waiting for response to not block user interaction
    chrome.runtime.sendMessage({ type: 'remove-page', url });

    // do optimistic local data update, assuming the change will be successful
    if (popupContext.pageInfo && popupContext.pageInfo.url === url) {
      popupContext.pageInfo = null;
    }
    popupContext.optimisticUpdates[url] = { url, properties: { status: STATUS_NONE } };

    // noinspection ES6MissingAwait
    updatePopup();

    setTimeout(window.close, 800);
  }

  /**
   * @param page {PageInfo}
   * @return {HTMLElement}
   */
  function createPageElement(page) {
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

    if (page.url === popupContext.tab.url) {
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
      await removePageState(page.url);
    });
    a.append(title);
    a.append(metadata);
    div.append(a);
    div.append(button);
    return div;
  }

  async function replacePagesInPopup() {
    const onlyShowCurrentDomain = showOnlyCurrentDomain(popupContext);

    document.querySelector('main section.unread .pages').innerHTML = '';
    document.querySelector('main section.finished .pages').innerHTML = '';
    const pages = onlyShowCurrentDomain
      ? await listPagesForDomain(getOrigin(popupContext.tab.url))
      : await listPages();

    let unreadCount = 0;
    let finishedCount = 0;

    // eslint-disable-next-line guard-for-in
    for (const url in popupContext.optimisticUpdates) {
      const page = pages.find((p) => p.url === url);
      if (page) {
        page.properties = { ...page.properties, ...popupContext.optimisticUpdates[url].properties };
      } else {
        pages.push(popupContext.optimisticUpdates[url]);
      }
    }

    for (const page of pages) {
      const pageElement = createPageElement(page);
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

  async function updatePopup() {
    console.log('context', popupContext);
    console.debug('update popup with status', popupContext.pageInfo);

    // reset
    document.getElementById('page-status').textContent = '';
    document.getElementById('page-status').classList.remove('unread', 'finished');

    if (!isValidUrl(popupContext.tab.url)) {
      // invalid url
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else if (popupContext.pageInfo && popupContext.pageInfo.properties.status === 'todo') {
      // already marked as unread
      document.getElementById('page-status').textContent = 'unread';
      document.getElementById('page-status').classList.add('unread');
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.remove('hidden');
    } else if (popupContext.pageInfo && popupContext.pageInfo.properties.status === 'done') {
      // already marked as finished
      document.getElementById('page-status').textContent = 'finished';
      document.getElementById('page-status').classList.add('finished');
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else {
      // no status yet
      document.getElementById('mark-as-unread-button').classList.remove('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    }

    if (isValidUrl(popupContext.tab.url)) {
      const currentDomainFilter = document.getElementById('current-domain-filter');
      currentDomainFilter.closest('label').querySelector('span').textContent = new URL(popupContext.tab.url).hostname;
      currentDomainFilter.addEventListener('change', async () => await replacePagesInPopup());
    } else {
      document.querySelector('aside .filters').remove();
    }

    await replacePagesInPopup();

    // popup content is hidden until rendered for the first time
    document.body.classList.remove('body-hidden');
  }
}

main().catch(console.error);
