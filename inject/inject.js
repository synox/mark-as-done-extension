// This script is injected into every page. It is responsible for updating the links
// on the page. It therefore needs to be as small and fast as possible.

// noinspection JSDeprecatedSymbols
console.log("Content script injected");


browser.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
        console.debug("content: received", request)
    if (request.type === "update-content") {
        console.debug("content: updating content")
            await updateAllLinksOnPage()

            // Some pages load content later. Need to add a trigger to process the links later.
            if (location.href.startsWith("https://learning.oreilly.com/")) {
                // button to show the toc
                document.querySelectorAll("a.sbo-toc-thumb").forEach(a => {
                    a.addEventListener('click', () => updateAllLinksOnPage());
                })
            }

            if (location.href.startsWith("https://wiki.corp")) {
                const mutationObserver = new MutationObserver(function (mutationList, observer) {
                    // Use traditional 'for loops' for IE 11
                    for (const mutation of mutationList) {
                        if (mutation.type === 'childList') {
                            console.debug('Wiki: Sidebar was loaded.');
                            updateAllLinksOnPage()
                        }
                    }
                })
                mutationObserver.observe(document.querySelector("div.plugin_pagetree_children"),
                    {childList: true, subtree: false})
            }

        }
    }
);

browser.storage.local.onChanged.addListener(async function (changes, areaName) {
        updateAllLinksOnPage();
    }
);


function isNormalMarkableLink(linkElement, documentUrl) {
    const url = linkElement.href;
    if (url === "") {
        return false;
    }
    // a plain '#' is often used for buttons and menubars. Can be ignored.
    if (linkElement.getAttribute("href") === "#") {
        return false;
    }

    if (url === documentUrl) {
        return true;
    }

    // ignore header links in the sidebar
    if (documentUrl.startsWith("https://experienceleague.adobe.com/") &&
        linkElement.matches('#container [data-id="toc"] a[href^="#"]')) {
        return false;
    }
    let isSamePage = prepareUrl(url) === prepareUrl(documentUrl)
    if (isSamePage) {
        return true;
    }

    return true;
}


async function updateAllLinksOnPage() {
    let links = document.getElementsByTagName('a');

    // console.debug("found ", links.length, "links")
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (isNormalMarkableLink(link, location.href)) {
            let status = await getStatus(link.href)

            link.classList.remove("marked-as-done")
            link.classList.remove("marked-as-todo")
            link.classList.remove("marked-as-started")

            if (status !== "none") {
                link.classList.add("marked-as-" + status);
            }
        }
    }
}
