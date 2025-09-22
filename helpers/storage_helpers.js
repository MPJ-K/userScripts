// Create (or reuse) a global namespace to hold all helpers.
globalThis.MpjHelpers = globalThis.MpjHelpers || {};

// Add a subsection to the namespace for the helpers defined in this file.
globalThis.MpjHelpers.Storage = {};


/**
 * Set the specified key in `localStorage` to the specified value.
 * @param {string} key - The key for which to set the specified value.
 * @param {*} value - The value that is to be stored.
 */
globalThis.MpjHelpers.Storage.setValue = function setValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
};


/**
 * Search for the specified key in `localStorage` and return the corresponding value.
 * If the specified key does not exist but a default value has been specified, return the default value.
 * Otherwise, return `undefined`.
 * @param {string} key - The key that corresponds to the value that is to be retrieved from storage.
 * @param {*} [defaultValue=undefined] - The default value that is to be returned if the specified key does not exist. Defaults to `undefined`.
 * @returns {*} The value from `localStorage` that corresponds to the specified key.
 */
globalThis.MpjHelpers.Storage.getValue = function getValue(key, defaultValue = undefined) {
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : JSON.parse(value);
};


/**
 * Set a cookie with the specified name, value, and expiration date.
 * If the expiration date is not specified, the cookie lasts until the current browsing session ends.
 * @param {string} name - The name of the cookie.
 * @param {string | number | boolean} value - The value of the cookie.
 * @param {Date} [expires=undefined] - The expiration date of the cookie.
 */
globalThis.MpjHelpers.Storage.setCookie = function setCookie(name, value, expires = undefined) {
    document.cookie = `${name}=${encodeURIComponent(value)}` + (expires ? `; expires=${expires.toUTCString()}` : "") + "; path=/";
};


/**
 * Return the value of the cookie with the specified name, or `undefined` if a cookie with that name does not exist.
 * @param {string} name - The name of the cookie.
 * @returns {string=} The value of the cookie, or `undefined` if a cookie with the specified name does not exist.
 */
globalThis.MpjHelpers.Storage.getCookie = function getCookie(name) {
    const cookie = decodeURIComponent(document.cookie).split("; ").find(c => c.startsWith(name));
    return cookie ? cookie.split("=")[1] : undefined;
};
