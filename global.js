// noinspection JSDeprecatedSymbols
var STATUS_DONE = "done"
var STATUS_STARTED = "started"
var STATUS_NONE = "none"
var STATUS_DISABLED = "disabled"
var STATUS_TODO = "todo"


// keep backwards compatibility
function compatibiltyStatus(oldStatus) {

    if (oldStatus === true) {
        return STATUS_DONE
    } else if (oldStatus === undefined) {
        return STATUS_NONE;
    }

    return oldStatus;
}

async function getStatus(url) {
    if (!url) {
        return STATUS_NONE
    }
    if(!url.startsWith("http")) {
        return STATUS_DISABLED;
    }
    let preparedUrl = prepareUrl(url);
    const value = await browser.storage.local.get(preparedUrl)
    return compatibiltyStatus(value[preparedUrl])
}


function prepareUrl(url) {
    try {
        let urlObject = new URL(url)
        // in general, hash are ignored.

        //Search must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
        // but on other pages the "?lang=en" should be ignored.

        let filteredSearch = urlObject.search.replace(/lang=.*$/, "")

        // In confluence-wiki, there is a suffix when clicking the sidebar which should be ignored.
        // https://wiki.corp.example.com/display/ABC/Link?src=contextnavpagetreemode
        filteredSearch = urlObject.search.replace(/src=contextnavpagetreemode/, "")

        if (filteredSearch === "?") {
            filteredSearch = ""
        }
        return urlObject.origin + urlObject.pathname + filteredSearch;
    } catch (error) {
        console.error(`Can not parse as url=${url}, error=${error}`)
    }
}
