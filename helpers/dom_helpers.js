// Create (or reuse) a global namespace to hold all helpers.
globalThis.MpjHelpers = globalThis.MpjHelpers || {};

// Add a subsection to the namespace for the helpers defined in this file.
globalThis.MpjHelpers.Dom = {};


/**
 * Simplifies the acquisition and storage of page elements.
 */
globalThis.MpjHelpers.Dom.PageElementManager = class PageElementManager {
    /**
     * Return a boolean indicating whether the given element is valid.
     * An element is considered valid when it does not coerce to false and, if the element has a length attribute,
     * its length is not zero.
     * @param {*} element - The element to test.
     * @returns {boolean} Whether the given element is valid.
     */
    static isValidElement(element) {
        if (!element) { return false; }
        else if (element.length !== undefined) { return Boolean(element.length); }
        else { return true; }
    }


    /**
     * Return a promise that resolves when the given function returns valid elements for the first time.
     * The promise resolves to the returned elements.
     * @param {function()} getElement - A function that searches for certain elements in the DOM and returns the result.
     * @param {*} [observerTarget=undefined] - A DOM Node whose `childList` is to be watched for the target elements. Defaults to `document.body` if not specified.
     * @param {boolean} [observeSubtree=true] - Whether to watch the subtree of the `observerTarget`'s `childList` for the target elements. Defaults to `true` if not specified.
     * @returns {Promise.<any>} A promise that resolves when `getElement` returns valid elements for the first time.
     */
    static awaitElement(getElement, observerTarget = undefined, observeSubtree = true) {
        return new Promise(resolve => {
            // First check if the element is already available.
            const element = getElement();
            if (PageElementManager.isValidElement(element)) {
                resolve(element);
                return;
            }

            // If the element is not yet available, create an observer to wait for it.
            function observerHandler(mutationList, observer) {
                const element = getElement();
                if (PageElementManager.isValidElement(element)) {
                    observer.disconnect();
                    resolve(element);
                }
            }

            const observer = new MutationObserver(observerHandler);
            observer.observe(observerTarget || document.body, { childList: true, subtree: observeSubtree });

            // Check the element one more time to eliminate race conditions.
            observerHandler(undefined, observer);
        });
    }


    /**
     * Create a PageElementManager.
     * @param {Object.<string, function()>} elementGetters - An object that maps element names to callbacks that return the corresponding elements.
     */
    constructor(elementGetters = {}) {
        this.elements = {};
        this.elementGetters = elementGetters;
    }


    /**
     * @virtual
     * Optional method: Initialize the PageElementManager.
     * This typically involves awaiting any elements that are required from the very start. If not overridden, this
     * method does nothing.
     */
    async initialize() {
        // Default: no-op
    }


    /**
     * Reset the PageElementManager by clearing all previously acquired elements.
     */
    reset() {
        this.elements = {};
    }


    /**
     * Return the element with the specified name synchronously.
     * Only use this method to retrieve elements that were acquired using the optional `initialize()` method.
     * For other elements, use the `await()` method.
     * @param {string} name - The name of the element.
     * @returns {*=} The element with the specified name, or `undefined` if the name is invalid.
     */
    get(name) {
        return this.elements[name];
    }


    /**
     * Return a promise that resolves to the element with the specified name.
     * @param {string} name - The name of the element.
     * @returns {Promise.<any>} A promise that resolves to the element with the specified name, or `undefined` if the name is invalid.
     */
    async await(name) {
        // If an element with the specified name exists in this.elements, return that element.
        if (this.elements.hasOwnProperty(name)) { return this.elements[name]; }

        // Otherwise, attempt to add the specified element to this.elements.
        if (!this.elementGetters.hasOwnProperty(name)) {
            return undefined;
        }

        this.elements[name] = PageElementManager.awaitElement(this.elementGetters[name]);
        return this.elements[name];
    }
};


/**
 * Manages listening for and handling page changes.
 */
globalThis.MpjHelpers.Dom.PageChangeManager = class PageChangeManager {
    #previousURL = "";
    #awaitingUnhide = false;
    #activeListener = null;

    /** Private reference to a `visibilitychangeHandler` instance that is bound to the PageChangeManager. */
    #boundVisibilitychangeHandler;

    /** Private reference to a `pageChangeHandler` instance that is bound to the PageChangeManager. */
    #boundPageChangeHandler;


    /**
     * Create a PageChangeManager.
     * @param {function()} newPageCallback - The callback function to execute upon detecting a new target page.
     * @param {function(string): boolean} isTargetPage - A function that returns a boolean indicating whether the given URL is considered a target page.
     * @param {boolean} [awaitUnhide=false] - Whether to wait for the tab that the script is running in to be opened. Defaults to `false`.
     * @param {Object} [logger=undefined] - An optional `Console`-like object to use for logging. Defaults to `undefined`.
     */
    constructor(newPageCallback, isTargetPage, awaitUnhide = false, logger = undefined) {
        this.newPageCallback = newPageCallback;
        this.isTargetPage = isTargetPage;
        this.awaitUnhide = awaitUnhide;
        this.logger = logger || { debug: () => { } };

        // Bind a visibilitychangeHandler and pageChangeHandler to this instance of the PageChangeManager.
        this.#boundVisibilitychangeHandler = this.#visibilitychangeHandler.bind(this);
        this.#boundPageChangeHandler = this.#pageChangeHandler.bind(this);
    }


    /**
     * Run `this.newPageCallBack()` unless the script must wait for the tab that it is running in to be opened.
     */
    #onTargetPage() {
        if (this.awaitUnhide && document.hidden) {
            this.#awaitingUnhide = true;
            this.logger.debug("Waiting for this browser tab to be opened...");
            return;
        }

        this.newPageCallback();
    }


    /**
     * Handle `visibilitychange` events.
     * Runs `this.#onTargetPage()` if the tab that the script is running in is opened while the script is waiting.
     */
    #visibilitychangeHandler() {
        if (this.#awaitingUnhide && !document.hidden) {
            this.#awaitingUnhide = false;
            this.logger.debug("Detected that this browser tab has been opened.");
            this.#onTargetPage();
        }
    }


    /**
     * Handle page change events.
     * Runs `this.#onTargetPage()` once for each encountered watch page.
     */
    #pageChangeHandler() {
        const URL = document.URL.split("&", 1)[0];
        if (URL == this.#previousURL) { return; }

        this.#previousURL = URL;
        if (this.isTargetPage(URL)) {
            this.logger.debug("Detected a new target page!");
            this.#onTargetPage();
        }
    }


    /**
     * Stop listening for page change events by removing this PageChangeManager's event listeners.
     */
    disconnect() {
        if (!this.#activeListener) { return; }

        this.#activeListener.target.removeEventListener(this.#activeListener.type, this.#boundPageChangeHandler, this.#activeListener.options);
        document.removeEventListener("visibilitychange", this.#boundVisibilitychangeHandler);
        this.#activeListener = null;
    }


    /**
     * Listen for the specified page change event on the specified `EventTarget` and run `this.newPageCallback()` upon
     * detecting a new target page.
     * Only one active event listener is allowed per PageChangeManager instance. Subsequent calls will overwrite the
     * previous listener.
     * @param {string} pageChangeEventName - The name of the event that indicates a page change.
     * @param {EventTarget} [eventTarget=undefined] - The `EventTarget` to attach the event listener to. Defaults to `document` if not specified.
     * @param {boolean | AddEventListenerOptions} [addEventListenerOptions=true] - The options to use for the event listener. See `EventTarget.addEventListener()` for details. Defaults to `undefined`.
     */
    connect(pageChangeEventName, eventTarget = undefined, addEventListenerOptions = undefined) {
        // Only allow one active listener per PageChangeManager instance.
        if (this.#activeListener) { this.disconnect(); }

        if (this.awaitUnhide) {
            // Add an event listener that will allow the script to detect when the tab that it is running in is opened.
            document.addEventListener("visibilitychange", this.#boundVisibilitychangeHandler);
        }

        const target = eventTarget || document;
        target.addEventListener(pageChangeEventName, this.#boundPageChangeHandler, addEventListenerOptions);
        this.#activeListener = { target: target, type: pageChangeEventName, options: addEventListenerOptions };

        // Run pageChangeHandler() manually, since the event listener may miss the first occurence of the event.
        this.#boundPageChangeHandler();
    }
};


/**
 * Manages setting up and listening for custom keyboard shortcuts.
 */
globalThis.MpjHelpers.Dom.KeyboardShortcutManager = class KeyboardShortcutManager {
    /**
     * @typedef {Object} UnparsedShortcut - An unparsed keyboard shortcut.
     * @property {string} keyCombination - The key combination that triggers the shortcut. This must specify one valid key preceeded by any number of valid modifier keys, separated by spaces.
     * @property {function()} trigger - The callback to execute when the shortcut is activated.
     */


    /**
     * @typedef {Object.<string, UnparsedShortcut>} Shortcuts - An `Object` that maps shortcut names to their respective unparsed key combinations and trigger callbacks.
     */


    /**
     * @typedef {Object} Shortcut - A keyboard shortcut.
     * @property {string} key - The key that triggers the shortcut if the correct modifier keys are active.
     * @property {string[]} modifiers - The modifier keys that must be active for the shortcut to trigger.
     * @property {function()} trigger - The callback to execute when the shortcut is activated.
     */


    /**
     * @typedef {Object.<string, Shortcut>} ShortcutMap - An `Object` that maps shortcut names to their respective key combinations and trigger callbacks.
     */


    /**
     * Parse the specified keyboard shortcuts.
     * @param {Shortcuts} shortcuts - An `Object` that maps shortcut names to their respective unparsed key combinations and trigger callbacks.
     * @returns {ShortcutMap} An `Object` that maps shortcut names to their respective key combinations and trigger callbacks.
     */
    static parseKeyboardShortcuts(shortcuts) {
        const shortcutMap = {};

        for (const shortcut in shortcuts) {
            const [key, ...modifiers] = shortcuts[shortcut].keyCombination.trim().toLowerCase().split(/\s+/).reverse();
            shortcutMap[shortcut] = {
                key: key,
                modifiers: modifiers.map(modifier => modifier + "Key"),
                trigger: shortcuts[shortcut].trigger
            };
        }

        return shortcutMap;
    }


    /**
     * Private reference to a `keydownHandler` instance that is bound to the KeyboardShortcutManager.
     */
    #boundKeydownHandler;


    /**
     * Create a KeyboardShortcutManager.
     * @param {Shortcuts} shortcuts - An `Object` that maps shortcut names to their respective unparsed key combinations and trigger callbacks.
     * @param {function()} [onAnyShortcut] - An optional callback that is executed whenever a keyboard shortcut is triggered.
     */
    constructor(shortcuts, onAnyShortcut = () => { }) {
        this.shortcutMap = KeyboardShortcutManager.parseKeyboardShortcuts(shortcuts);
        this.onAnyShortcut = onAnyShortcut;

        // Bind a keydownHandler to this instance of the KeyboardShortcutManager.
        this.#boundKeydownHandler = this.#keydownHandler.bind(this);
    }


    /**
     * Handle `keydown` events.
     * If the given event matches any shortcut specified in `this.shortcutMap`, the shortcut is triggered.
     * @param {KeyboardEvent} event - A `keydown` event.
     */
    #keydownHandler(event) {
        // Skip this event if the current active element is some form of text input.
        const activeElement = document.activeElement;
        if (activeElement.tagName === "INPUT" || activeElement.tagName == "TEXTAREA" || activeElement.isContentEditable) { return; }

        // Check whether the current 'keydown' event matches any of the shortcuts specified in the script settings.
        let handledKeypress = false;

        for (const shortcut of Object.values(this.shortcutMap)) {
            // Check whether the correct key for this shortcut has been pressed.
            if (event.key.toLowerCase() !== shortcut.key) { continue; }

            // Check whether the correct modifier keys for this shortcut are active.
            const modifiers = ["altKey", "ctrlKey", "shiftKey", "metaKey"];
            if (!modifiers.every(key => shortcut.modifiers.includes(key) ? event[key] : !event[key])) { continue; }

            // Carry out the actions that correspond to this shortcut.
            shortcut.trigger();
            handledKeypress = true;
        }

        // If a valid keypress was handled, stop the event from propagating further.
        if (handledKeypress) {
            this.onAnyShortcut();
            event.preventDefault();
            event.stopPropagation();
        }
    }


    /**
     * Enable custom keyboard shortcuts by listening for `keydown` events on the specified `EventTarget`.
     * @param {EventTarget} [eventTarget=undefined] - The `EventTarget` to attach the event listener to. Defaults to `document` if not specified.
     * @param {boolean | AddEventListenerOptions} [addEventListenerOptions=true] - The options to use for the event listener. See `EventTarget.addEventListener()` for details. Defaults to `true`.
     */
    connect(eventTarget = undefined, addEventListenerOptions = true) {
        (eventTarget || document).addEventListener("keydown", this.#boundKeydownHandler, addEventListenerOptions);
    }


    /**
     * Remove the `keydown` event listener from the specified `EventTarget`, disabling the associated shortcuts.
     * @param {EventTarget} eventTarget - The `EventTarget` from which to remove the event listener.
     * @param {boolean | EventListenerOptions} eventListenerOptions - The options that were specified for the event listener.
     */
    disconnect(eventTarget, eventListenerOptions) {
        eventTarget.removeEventListener("keydown", this.#boundKeydownHandler, eventListenerOptions);
    }
};
