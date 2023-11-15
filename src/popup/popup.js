import { getPageState, listPages, listPagesForDomain } from '../storage.js';
import {
  ensureSitePermissions,
  getOrigin,
  isValidUrl,
  STATUS_DONE,
  STATUS_NONE,
  STATUS_TODO,
} from '../global.js';

class PopupContext {
  constructor() {
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

  async function handleChangeState(url, status) {
    // not waiting for response to not block user interaction
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({
      type: 'change-page-status',
      status,
      url: tab.url,
      title: tab.title,
      tab,
    });

    // do optimistic local data update, assuming the change will be successful
    console.log('change state', url, status);
    if (!popupContext.pageInfo) {
      popupContext.pageInfo = { url, properties: {} };
    }
    popupContext.pageInfo.status = status;
    popupContext.optimisticUpdates[url] = popupContext.pageInfo;
    await updatePopup();

    setTimeout(window.close, 800);
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

  async function removePageState(url) {
    // not waiting for response to not block user interaction
    chrome.runtime.sendMessage({ type: 'remove-page', url });

    // do optimistic local data update, assuming the change will be successful
    console.log('remove state of', url);
    if (popupContext.pageInfo && popupContext.pageInfo.url === url) {
      popupContext.pageInfo = null;
    }
    popupContext.optimisticUpdates[url] = { url, properties: { status: STATUS_NONE } };
    await updatePopup();

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
    for (const page of pages) {
      if (popupContext.optimisticUpdates[page.url]) {
        page.properties = { ...page.properties, ...popupContext.optimisticUpdates[page.url].properties };
      }
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

    if (!isValidUrl(popupContext.tab.url)) {
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else if (popupContext.pageInfo && popupContext.pageInfo.properties.status === 'todo') {
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.remove('hidden');
    } else if (popupContext.pageInfo && popupContext.pageInfo.properties.status === 'done') {
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else {
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
  }
}

main().catch(console.error);
