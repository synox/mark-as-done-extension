document.querySelectorAll("button.changeStateButton, a.changeStateButton")
    .forEach(button =>
        button.addEventListener('click', () => handleButtonInPopupClick(button)));


async function handleButtonInPopupClick(button) {
    let status = button.getAttribute("data-status");
    updatePopup(status, true)
    let [tab] = await browser.tabs.query({active: true, currentWindow: true});
    browser.runtime.sendMessage({type: "change-page-status", status, tab});
    if (status === "none") {
        setTimeout(window.close, 200);
    } else {
        setTimeout(window.close, 1200);
    }
}

function updatePopup(status, animate = false) {
    console.log("update with status", status)

    if (animate) {
        document.querySelectorAll("h1").forEach(h1 => {
            h1.classList.add("appearFromTop")
        })
    }
    document.querySelectorAll(".controls").forEach(controls => {
        if (controls.getAttribute("data-status") === status) {
            controls.classList.add("current")
        } else {
            controls.classList.remove("current")
        }
    });
}

//
// async function listItemsForCurrentPage() {
//     let [tab] = await browser.tabs.query({active: true, currentWindow: true});
//     const prefix = new URL(tab.url).origin
//     let allItems = await browser.storage.local.getP(null);
//     return Object.entries(allItems)
//         .map(entry => {
//             return {url: entry[0], status: compatibiltyStatus(entry[1])}
//         })
//         .filter(entry => entry.url.startsWith(prefix))
//         .sort();
// }


// document.getElementById("listButton").addEventListener('click', async event => {
//     let result = await listItemsForCurrentPage();
//     let el = document.getElementById("list-result");
//     let htmlItems = result.map(item => `<li data-status="${item.status}"><a href="${item.url}" target="_blank">${item.url}</a></li>`)
//     el.innerHTML = `<ul>${htmlItems.join("")}</ul>`
// });

async function init() {
    let [tab] = await browser.tabs.query({active: true, currentWindow: true});
    let status = await getStatus(tab.url)
    if(status === STATUS_DISABLED) {
        return;
    }
    let animate = false;

    // on first click, change to initial status
    if (status === "none") {
        status = "todo" // TODO #1: make initial status configurable
        browser.runtime.sendMessage({type: "change-page-status", status, tab});
    }
    updatePopup(status, animate);
}

init()
