(async () => {
  const src = chrome.runtime.getURL('src/service-worker.module.js');
  const workerMain = await import(src);
  workerMain.main();
})();
