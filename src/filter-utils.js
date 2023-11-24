/**
 * @param pages {PageInfo[]}
 * @param search {string}
 */
export function filterPages(pages, search = '') {
  const searchTerms = search.toLowerCase().split(' ') || [];

  if (searchTerms.length === 0) {
    return pages;
  }

  return pages.filter((page) => {
    const { title, url } = page.properties;
    const titleMatch = searchTerms.some((term) => title?.toLowerCase().includes(term));
    const urlMatch = searchTerms.some((term) => url?.toLowerCase().includes(term));
    return titleMatch || urlMatch;
  });
}
