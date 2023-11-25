import { STATUS_DONE, STATUS_TODO } from './global.js';

/**
 * @param pages {PageInfo[]}
 * @param search {string}
 */
export function filterPages(pages, { search = '' }) {
  const searchTerms = search.toLowerCase().split(' ') || [];

  if (searchTerms.length === 0) {
    return pages;
  }

  return pages.filter((page) => {
    const titleMatch = searchTerms.every((term) => page.properties.title?.toLowerCase().includes(term));
    const urlMatch = searchTerms.every((term) => page.url?.toLowerCase().includes(term));
    return titleMatch || urlMatch;
  });
}

export function sortWithCurrentFirst(pages, currentUrl) {
  pages.sort((a, b) => {
    if (a.url === currentUrl) {
      return -1;
    }
    if (b.url === currentUrl) {
      return 1;
    }
    return 0;
  });
  return pages;
}

/**
 * sort links by status in-place
 * @param links {array}
 * return {void}
 */
export function sortLinksByStatus(links) {
  links.sort((a, b) => {
    const statusValues = {
      [STATUS_TODO]: 1,
      [STATUS_DONE]: -1,
      default: 0,
    };

    const getMappedValue = (status) => statusValues[status] || statusValues.default;

    return getMappedValue(b.status) - getMappedValue(a.status);
  });
}
