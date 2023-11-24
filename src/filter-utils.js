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
    const { title, url } = page.properties;
    const titleMatch = searchTerms.every((term) => title?.toLowerCase().includes(term));
    const urlMatch = searchTerms.every((term) => url?.toLowerCase().includes(term));
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
