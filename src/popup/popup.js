import { getUserSettings } from '../storage.js';
import {
  getStatus, STATUS_DISABLED, removeUrl, getAllLinksForDomain, sortLinksByStatus,
} from '../global.js';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = await getStatus(tab.url);
  if (status === STATUS_DISABLED) {
    // show reduced popup on disabled sites
  }

  await updatePopup(status, tab.url, false);

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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // not waiting for response to not block user interaction
  chrome.runtime.sendMessage({ type: 'change-page-status', status, tab });

  if (status === 'none') {
    window.close();
  } else {
    setTimeout(window.close, 1200);
    await updatePopup(status, tab.url, true);
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
    // open in new tab, otherwise it does not work in Google Chrome
    a.target = '_blank';

    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL(`images/icon-${link.status}.png`);
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
