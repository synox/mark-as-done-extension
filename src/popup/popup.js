import { getPageState, listPages, listPagesForDomain } from '../storage.js';
import {
  ensureSitePermissions,
  getOrigin,
  isValidUrl, normalizeUrl,
  PageInfo,
  STATUS_NONE,

} from '../global.js';
import { filterPages, sortWithCurrentFirst } from '../filter-utils.js';

class Popup {
  constructor() {
    this.tab = null;
    this.pageInfo = null;

    // unsaved updates, use this to show the user the changes immediately
    this.optimisticUpdates = {};
  }

  async start() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    // eslint-disable-next-line prefer-destructuring
    this.tab = tabs[0];
    this.pageInfo = await getPageState(this.tab.url);

    this.initEventHandlers();

    await this.updatePopup();
  }

  showOnlyCurrentDomain() {
    const currentDomainFilter = document.getElementById('current-domain-filter');
    return isValidUrl(this.tab.url) && currentDomainFilter.checked;
  }

  initEventHandlers() {
    const changeStatus = (event) => {
      event.preventDefault();
      // we cannot use async/await here because we can only request permissions from a user gesture.
      ensureSitePermissions(this.tab.url).then(() => {
        this.handleChangeCurrentPageState(event.target.dataset.newStatus);
      });
    };
    document.getElementById('mark-as-unread-button').addEventListener('click', changeStatus);
    document.getElementById('mark-as-finished-button').addEventListener('click', changeStatus);
    document.getElementById('settings-button').addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('current-domain-filter').addEventListener('change', () => this.replacePagesInPopup());
    document.querySelector('[role="search"]').addEventListener('change', () => this.replacePagesInPopup());
  }

  handleChangeCurrentPageState(status) {
    const tabUrl = this.tab.url;
    const properties = { status, title: this.tab.title };

    // not waiting for response to not block user interaction
    chrome.runtime.sendMessage({
      type: 'change-page-status',
      tab: this.tab,
      url: tabUrl,
      properties,
    });

    // do optimistic local data update, assuming the change will be successful
    console.log('change state', tabUrl, status);
    if (!this.pageInfo) {
      this.pageInfo = new PageInfo(tabUrl);
    }
    this.pageInfo.properties.status = status;
    this.pageInfo.properties.title = this.tab.title;
    this.optimisticUpdates[tabUrl] = this.pageInfo;

    // noinspection ES6MissingAwait
    this.updatePopup();

    setTimeout(window.close, 800);
  }

  async updatePopup() {
    console.debug('update popup with status', this.pageInfo);

    if (!isValidUrl(this.tab.url)) {
      // invalid url
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else if (this.pageInfo && this.pageInfo.properties.status === 'todo') {
      // already marked as unread
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.remove('hidden');
    } else if (this.pageInfo && this.pageInfo.properties.status === 'done') {
      // already marked as finished
      document.getElementById('mark-as-unread-button').classList.add('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    } else {
      // no status yet
      document.getElementById('mark-as-unread-button').classList.remove('hidden');
      document.getElementById('mark-as-finished-button').classList.add('hidden');
    }

    const currentDomainFilter = document.getElementById('current-domain-filter');
    if (isValidUrl(this.tab.url)) {
      currentDomainFilter.closest('label').querySelector('span').textContent = new URL(this.tab.url).hostname;
    } else {
      document.getElementById('filters').classList.add('hidden');
    }

    await this.replacePagesInPopup();

    // popup content is hidden until rendered for the first time
    document.body.classList.remove('body-hidden');
  }

  async replacePagesInPopup() {
    const filteredPages = await this.loadPagesToDisplay();

    let unreadCount = 0;
    let finishedCount = 0;

    document.querySelector('main section.unread .pages').innerHTML = '';
    document.querySelector('main section.finished .pages').innerHTML = '';

    for (const page of filteredPages) {
      const pageElement = this.createPageElement(page);
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

  async loadPagesToDisplay() {
    let pages;
    if (this.showOnlyCurrentDomain()) {
      pages = await listPagesForDomain(getOrigin(this.tab.url));
    } else {
      pages = await listPages();
    }

    // use unsaved data from optimistic updates
    // eslint-disable-next-line guard-for-in
    for (const url in this.optimisticUpdates) {
      const page = pages.find((p) => p.url === url);
      if (page) {
        page.properties = { ...page.properties, ...this.optimisticUpdates[url].properties };
      } else {
        pages.push(this.optimisticUpdates[url]);
      }
    }

    console.log({ search: document.querySelector('filter-search').value });
    const filteredPages = filterPages(pages, { search: document.querySelector('filter-search')?.value });
    sortWithCurrentFirst(filteredPages, normalizeUrl(this.tab.url));
    return filteredPages;
  }

  /**
   * @param page {PageInfo}
   * @return {HTMLElement}
   */
  createPageElement(page) {
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

    if (page.url === this.tab.url) {
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
    const lastModified = new Date(page.properties.modified).toLocaleDateString();
    metadata.textContent = `${hostname} - ${lastModified}`;
    const button = document.createElement('button');
    button.classList.add('outline');

    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('images/trash-can.svg');
    button.prepend(icon);

    button.addEventListener('click', async () => {
      div.remove();
      await this.removePageState(page.url);
    });
    a.append(title);
    a.append(metadata);
    div.append(a);
    div.append(button);
    return div;
  }

  removePageState(url) {
    // not waiting for response to not block user interaction
    chrome.runtime.sendMessage({
      type: 'remove-page', url, tabUrl: this.tab.url, tabId: this.tab.id,
    });

    // do optimistic local data update, assuming the change will be successful
    if (this.pageInfo && this.pageInfo.url === url) {
      this.pageInfo = null;
    }
    this.optimisticUpdates[url] = { url, properties: { status: STATUS_NONE } };

    // noinspection ES6MissingAwait
    this.updatePopup();

    setTimeout(window.close, 800);
  }
}

if (window.chrome?.tabs) {
  // running as the extension
  new Popup().start().catch(console.error);
} else {
  // running as a standalone page for testing
  document.body.classList.remove('body-hidden');
}
