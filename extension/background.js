// Toolbar click: run the library in the page's own (MAIN) world, so its
// fetch of <script src> and its cssRules walk behave exactly as when an app
// loads it. Injected once per page; later clicks only toggle.
chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  const [{ result: loaded }] = await chrome.scripting.executeScript({
    target, world: 'MAIN', func: () => !!window.UIInspector,
  });
  if (!loaded) {
    await chrome.scripting.executeScript({ target, world: 'MAIN', files: ['ui-inspector.js'] });
    await chrome.scripting.executeScript({ target, world: 'MAIN', func: () => UIInspector.init() });
  }
  await chrome.scripting.executeScript({ target, world: 'MAIN', func: () => UIInspector.toggle() });
});
