// noinspection JSDeprecatedSymbols

console.log("content.js was activated")

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
        console.log("content: received", request)
        if (request.type === "update-content") {
            await updateAllLinksOnPage()
        }
    }
);

function shouldMarkLink(url, documentUrl) {
    if(url === ""){
        return false;
    }
    if (url === documentUrl) {
        return true;
    }
    // links to the current page, but with different anchor should not be handled
    let plainUrl = prepareUrl(url)
    let plainDocumentUrl = prepareUrl(documentUrl)
    if (plainUrl === plainDocumentUrl) {
        return false;
    }

    return true;
}


async function updateAllLinksOnPage() {
    let links = document.getElementsByTagName('a');

    console.log("found ", links.length, "links")
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (shouldMarkLink(link.href, location.href)) {
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
