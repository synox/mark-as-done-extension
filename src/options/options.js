var STATUS_DONE = "done"
var STATUS_STARTED = "started"
var STATUS_NONE = "none"
var STATUS_TODO = "todo"

function save(filename, data) {
    const blob = new Blob([data], {type: 'text/json'});
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}


document.getElementById("exportButton").addEventListener('click', async event => {
    let allItems = await browser.storage.local.get(null);
    let result = Object.entries(allItems)
        .map(entry => {
            return {url: entry[0], status: compatibiltyStatus(entry[1])}
        })
        .sort();

    save("marked-as-done-all.json", JSON.stringify(result));
});


document.getElementById("importButton").addEventListener('click', async event => {
    document.getElementById('upload').click();
})

document.getElementById('upload').addEventListener("change", handleFiles, false);

function handleFiles() {
    if (this.files.length === 0) {
        console.log('No file selected.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
        // when the reader is done, the content is in reader.result.
        const data = JSON.parse(reader.result);
        chrome.runtime.sendMessage({type: 'import-data', data: data}, response => {
            document.getElementById("importStatus").append("import completed. status: " + response)
        });
    };
    reader.readAsText(this.files[0]);
}


document.getElementById("deleteAllButton").addEventListener('click', async event => {
    if (confirm("This will delete all data. First export everything!") && confirm("Really, are you ready to delete it all?")) {
        await chrome.storage.local.clear()
        alert("done")
    }
});

document.getElementById("listButton").addEventListener('click', async event => {
    let allItems = await browser.storage.local.get(null);
    let result = Object.entries(allItems)
        .map(entry => {
            return {url: entry[0], status: compatibiltyStatus(entry[1])}
        })
        .sort()
        .reduce((accumulator, currentValue) => {
            let domain;
            try {
                domain = new URL(currentValue.url).origin
            } catch (error) {
                domain = "others";
            }
            accumulator[domain] = [...accumulator[domain] || [], currentValue];
            return accumulator;
        }, {})

    console.log(result);

    let el = document.getElementById("list-result");

    let htmlItems = "";
    for (let domain of Object.keys(result).sort()) {
        let totalCount = result[domain].length
        let doneCount = result[domain].filter(item => item.status === STATUS_DONE).length
        htmlItems += `<details><summary>${domain} (${doneCount}/${totalCount})</summary>
        <ul>`
        for (const item of result[domain]) {
            htmlItems += `<li data-status="${item.status}"><a href="${item.url}" target="_blank">${item.url}</a></li>`
        }
        htmlItems += `</ul></details>`;
    }
    el.innerHTML = htmlItems
});

