// Toolbar click: run the library in the page's own (MAIN) world, so its
// fetch of <script src> and its cssRules walk behave exactly as when an app
// loads it. Injected once per page; later clicks only toggle.
chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  try {
    const [{ result: loaded }] = await chrome.scripting.executeScript({
      target, world: 'MAIN', func: () => !!window.UIInspector,
    });
    if (!loaded) {
      await chrome.scripting.executeScript({ target, world: 'MAIN', files: ['ui-inspector.js'] });
      await chrome.scripting.executeScript({ target, world: 'MAIN', func: () => UIInspector.init() });
    }
    await chrome.scripting.executeScript({ target, world: 'MAIN', func: () => UIInspector.toggle() });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Toggle UI Inspector' });
  } catch (err) {
    // chrome:// pages, the Web Store and PDF viewers refuse injection: say so
    // on the button instead of doing nothing at all.
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b91c1c' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({ tabId: tab.id, title: `UI Inspector cannot run on this page — ${err.message}` });
  }
});
