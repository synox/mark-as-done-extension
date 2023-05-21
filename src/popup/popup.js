import { getUserSettings } from '../storage.js';
import {
  getStatus, STATUS_DISABLED, removeUrl, getAllLinksForDomain, sortLinksByStatus,
} from '../global.js';

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let status = await getStatus(tab.url);
  if (status === STATUS_DISABLED) {
    // show reduced popup on disabled sites
  }

  let animate = false;

  // On first click, change to initial status
  if (status === 'none') {
    status = await getInitialStatus();
    browser.runtime.sendMessage({ type: 'change-page-status', status, tab });
    animate = true;
  }

  await updatePopup(status, tab.url, animate);

  let currentSiteLinks = await getAllLinksForDomain(new URL(tab.url).origin);
  // Remove current page from list, only show other pages on the same domain
  currentSiteLinks = removeUrl(currentSiteLinks, tab.url);
  addRelatedLinks(currentSiteLinks);

  document.querySelector('#listButton').addEventListener('click', () => {
    setTimeout(window.close, 200);
  });

  document.querySelectorAll('button.changeStateButton, a.changeStateButton')
    .forEach((button) => button.addEventListener('click', () => handleChangeStatus(button)));
}

async function handleChangeStatus(button) {
  const status = button.getAttribute('data-status');
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  await browser.runtime.sendMessage({ type: 'change-page-status', status, tab });

  if (status === 'none') {
    setTimeout(window.close, 200);
  } else {
    await updatePopup(status, tab.url, true);
    setTimeout(window.close, 1200);
  }
}

/**
 *
 * @param status {LinkStatus}
 * @param url {string}
 * @param animate {boolean}
 */
async function updatePopup(status, url, animate = false) {
  console.debug('update with status', status);

  if (animate) {
    document.body.classList.add('appear-from-top');
  }

  document.querySelectorAll('.controls').forEach((controls) => {
    if (controls.getAttribute('data-status') === status) {
      controls.classList.add('current');
    } else {
      controls.classList.remove('current');
    }
  });

  // remove buttons for disabled states
  const settings = await getUserSettings();
  document.querySelectorAll('.changeStateButton').forEach((button) => {
    if (button.dataset.status !== 'none' && !settings.enabledStates.includes(button.dataset.status)) {
      button.remove();
    }
  });
}

function addRelatedLinks(currentSiteLinks) {
  const listElement = document.querySelector('.related-links ul');

  if (currentSiteLinks.length === 0) {
    listElement.parentElement.remove();
    return;
  }
  sortLinksByStatus(currentSiteLinks);
  currentSiteLinks.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.innerText = new URL(link.url).pathname;
    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL(`images/icon-${link.status}.png`);
    a.prepend(icon);
    li.append(a);

    listElement.append(li);
    a.addEventListener('click', () => {
      setTimeout(window.close, 200);
    });
  });
}

async function getInitialStatus() {
  const settings = await getUserSettings();
  if (settings.enabledStates.includes('todo')) return 'todo';
  if (settings.enabledStates.includes('started')) return 'started';
  return 'done';
}

init().catch(console.error);
