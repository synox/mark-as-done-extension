// noinspection JSDeprecatedSymbols

console.log("content.js was activated")

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
        console.log("content: received", request)
        if (request.type === "update-content") {
            await updateAllLinksOnPage()
        }
    }
);

function shouldIncludeHash(url) {
    let withoutHash = url.replaceAll(ignoreHashRegex, "");
    // ignore special case where links go the the same page, but with an empty hash
    if (withoutHash === location.href && withoutHash + "#" === url) {
        return false;
    } else {
        return true;
    }
}

async function updateAllLinksOnPage() {
    let links = document.getElementsByTagName('a');

    console.log("found ", links.length, "links")
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (shouldIncludeHash(link.href)) {
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
