export function getBrowser() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

export async function getCurrentTabInfo() {
  const tabs = await getBrowser().tabs.query({active: true, currentWindow: true});
  const tab = tabs && tabs[0];

  return {
    url: tab ? tab.url : "",
    title: tab ? tab.title : ""
  };
}

export function getBookmarkBarId() {
    return typeof browser !== 'undefined' ? "toolbar_____": "1";
}

export async function getBookmarkSubTree(id) {
  if (typeof browser !== 'undefined') {
    return await getBrowser().bookmarks.getSubTree(id);
  }

  const p = new Promise(resolve => {
    getBrowser().bookmarks.getSubTree(id, result => resolve(result));
  });
  return p;
}

export async function createBookmark(bookmark) {
  if(typeof browser !== 'undefined') {
    return getBrowser().bookmarks.create(bookmark);
  }

  const p = new Promise(resolve => {
    getBrowser().bookmarks.create(bookmark, result => resolve(result));
  });
  return p;
}

export async function removeBookmark(bookmarkId) {
  return getBrowser().bookmarks.remove(bookmarkId);
}

function useChromeStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage;
}

export function getStorageItem(key) {
  if (useChromeStorage()) {
    const result = chrome.storage.local.get([key]);
    return result.then(data => data[key])
  } else {
    return Promise.resolve(localStorage.getItem(key));
  }
}

export function setStorageItem(key, value) {
  if (useChromeStorage()) {
    return chrome.storage.local.set({[key]: value});
  } else {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
}

export function openOptions() {
  getBrowser().runtime.openOptionsPage();
  window.close();
}
