document.querySelectorAll("button.changeStateButton")
    .forEach(button => button.addEventListener('click', () => handleButtonClick(button)));

document.querySelectorAll("a.changeStateButton")
    .forEach(button => button.addEventListener('click', () => handleButtonClick(button)));


async function handleButtonClick(button) {
    let status = button.getAttribute("data-status");
    updateView(status, true)
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    chrome.runtime.sendMessage({type: "set-status", status, tab});
    if (status === "none") {
        setTimeout(window.close, 200);
    } else {
        setTimeout(window.close, 1200);
    }
}

function updateView(status, animate = false) {
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
//     let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
//     const prefix = new URL(tab.url).origin
//     let allItems = await chrome.storage.local.getP(null);
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
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    let status = await getStatus(tab.url)
    if (status === "none") {
        status = "todo"
        chrome.runtime.sendMessage({type: "set-status", status, tab});
        updateView(status, true)
    } else {
        updateView(status, false)

    }
}

init()