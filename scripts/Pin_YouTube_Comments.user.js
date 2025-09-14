// ==UserScript==
// @name         Pin YouTube Comments
// @namespace    MPJ_namespace
// @version      2025.08.03.02
// @description  Adds a small 'Pin' button to every YouTube comment that will move it to the top of the list when clicked.
// @author       MPJ
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Pin_YouTube_Comments.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Pin_YouTube_Comments.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether the script will log messages to the browser's console.
        // This option is useful for debugging. Enabling this option is harmless, but also useless for most users.
        // Default: false
        verboseLogging: false,
        // Whether the script will log extra detailed messages to the browser's console.
        // This option is useful for debugging. Enabling this option is harmless, but also useless for most users.
        // Default: false

        scrollToPinned: true,
        // If this option is enabled, pinning a comment will scroll the page to the new position of the comment.
        // Scrolling can still be prevented by holding shift when clicking the pin button.
        // Default: true
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Log a message to the browser's developer console at the given log level if `settings.enableLogging` is `true`.
     * Otherwise, this function has no effect. The message is prefixed with a script identifier.
     * For messages marked as `verbose`, `settings.verboseLogging` must be `true` in order for the message to be logged.
     * @param {*} message - The message to log.
     * @param {boolean} [verbose] - Whether logging the message should require that `settings.verboseLogging` is `true`. Defaults to `false` if not specified.
     * @param {number} [level] - The log level to use for the message, where `0`, `1`, and `2` correspond to `log`, `warn` and `error` respectively. Defaults to `0` if not specified or invalid.
     */
    function log(message, verbose = false, level = 0) {
        if (settings.enableLogging && (verbose ? settings.verboseLogging : true)) {
            console[["log", "warn", "error"][level] || "log"]("[MPJ|PYTC] " + message);
        }
    }


    /**
     * Simplifies the acquisition and storage of page elements.
     */
    class PageElementManager {
        /**
         * Return a boolean indicating whether the given element is valid.
         * An element is considered valid when it does not coerce to false, and, if the element has a length attribute,
         * its length is not zero.
         * @param {*} element - The element to test.
         * @returns {boolean} A boolean indicating whether the given element is valid.
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
                observerHandler(undefined, observer)
            });
        }


        /**
         * Create a PageElementManager.
         * @param {Object.<string, function()>} elementGetters - An object that links element names to callbacks that return the corresponding elements.
         */
        constructor(elementGetters = {}) {
            this.elements = {};
            this.elementGetters = elementGetters;
        }


        /**
         * Initialize the PageElementManager.
         * This typically involves awaiting any elements that are required from the very start of the script.
         */
        async initialize() {
            log("Initializing the required page elements...");

            // If necessary, implement initialization code here...

            log("Finished initializing the required page elements.");
        }


        /**
         * Reset the PageElementManager by clearing all previously acquired elements.
         */
        reset() {
            this.elements = {};
        }


        /**
         * Return the element with the specified name synchronously.
         * Only use this method to retrieve elements that are acquired during initialization.
         * For other elements, use `await()`.
         * @param {string} name - The name of the element.
         * @returns {*=} The element with the specified name, or undefined if the element does not exist.
         */
        get(name) {
            return this.elements[name];
        }


        /**
         * Return a promise that resolves to the element with the specified name.
         * @param {string} name - The name of the element.
         * @returns {Promise.<any>} A promise that resolves to the element with the specified name, or undefined if the element does not exist.
         */
        async await(name) {
            // If an element with the specified name exists in this.elements, return that element.
            if (this.elements.hasOwnProperty(name)) { return this.elements[name]; }

            // Otherwise, attempt to add the specified element to this.elements.
            if (!this.elementGetters.hasOwnProperty(name)) {
                log(`Cannot find a getElement() method for the specified name '${name}'!`, false, 2);
                return undefined;
            }

            this.elements[name] = PageElementManager.awaitElement(this.elementGetters[name]);
            return this.elements[name];
        }
    }


    /**
     * Manages listening for and handling page changes.
     */
    class PageChangeManager {
        /**
         * Create a PageChangeManager.
         * @param {function()} newPageCallback - The callback function to execute upon detecting a new target page.
         * @param {string} pageChangeEventName - The name of the event that indicates a page change.
         * @param {function(string): boolean} isTargetPage - A function that returns a boolean indicating whether the given URL is considered a target page.
         * @param {boolean} [awaitUnhide=false] - Whether to wait for the tab that the script is running in to be opened. Defaults to `false`.
         */
        constructor(newPageCallback, pageChangeEventName, isTargetPage, awaitUnhide = false) {
            this.previousURL = "";
            this.awaitingUnhide = false;

            this.newPageCallback = newPageCallback;
            this.pageChangeEventName = pageChangeEventName;
            this.isTargetPage = isTargetPage;
            this.awaitUnhide = awaitUnhide;
        }


        /**
         * Handle visibilitychange events.
         * Runs onTargetPage() if the tab that the script is running in is opened while the script is waiting.
         */
        visibilitychangeHandler() {
            if (this.awaitingUnhide && !document.hidden) {
                this.awaitingUnhide = false;
                log("Detected that the browser tab has been opened.");
                this.onTargetPage();
            }
        }


        /**
         * Handle page change events.
         * Runs onTargetPage() once for each encountered watch page.
         */
        pageChangeHandler() {
            const URL = document.URL.split("&", 1)[0];
            if (URL == this.previousURL) { return; }
            this.previousURL = URL;
            if (this.isTargetPage(URL)) {
                log("New target page detected, attempting execution...");
                this.onTargetPage();
            }
        }


        /**
         * Run newPageCallBack() unless the script must wait for the tab that it is running in to be opened.
         */
        onTargetPage() {
            if (this.awaitUnhide && document.hidden) {
                this.awaitingUnhide = true;
                log("Waiting for the browser tab to be opened...");
                return;
            }

            this.newPageCallback();
        }


        /**
         * Listen for page changes and run newPageCallback() upon detecting a new target page.
         */
        listen() {
            if (this.awaitUnhide) {
                // Add an event listener that will allow the script to detect when the tab that it is running in is opened.
                document.addEventListener("visibilitychange", this.visibilitychangeHandler.bind(this));
            }

            document.addEventListener(this.pageChangeEventName, this.pageChangeHandler.bind(this));
            // Run pageChangeHandler() manually, since the event listener may miss the first occurence of the event.
            this.pageChangeHandler();
        }
    }


    /**
     * Create and return a pin button template. This template is intended to be cloned before use in the DOM.
     * @returns {HTMLButtonElement} The created pin button template.
     */
    function createPinButtonTemplate() {
        const pinButton = document.createElement("button");
        pinButton.className = "mpj-pytc-pin-button yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-s";
        pinButton.setAttribute("aria-label", "Pin");

        const textContainer = document.createElement("div");
        textContainer.className = "yt-spec-button-shape-next__button-text-content";
        pinButton.appendChild(textContainer);

        const textSpan = document.createElement("span");
        textSpan.className = "yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap";
        textSpan.setAttribute("role", "text");
        textSpan.textContent = "Pin";
        textContainer.appendChild(textSpan);

        return pinButton;
    }


    /**
     * Move the target comment to the top of the comments section.
     * If `settings.scrollToPinned` is `true` and the `shiftKey` property of `clickEvent` is `false`, then the pinned
     * comment will also be scrolled into view.
     * @param {PointerEvent} clickEvent - The `click` event that caused this function to be called.
     * @param {*} target - The target comment.
     */
    function pinComment(clickEvent, target) {
        const parent = target.parentNode;
        parent.insertBefore(target, parent.firstChild);

        // If settings.scrollToPinned is enabled and the comment is outside the viewport, scroll the comment into view.
        // This functionality is skipped if the 'shiftKey' property of clickEvent is true.
        if (settings.scrollToPinned && !clickEvent.shiftKey && target.getBoundingClientRect().top < 56) {
            target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }

        log("A comment has been pinned.", true);
    }


    /**
     * Create and return a pin button for the target comment.
     * @param {*} target - The target comment.
     * @returns {HTMLElement} The created pin button.
     */
    function createPinButton(target) {
        const buttonRenderer = document.createElement("ytd-button-renderer");
        buttonRenderer.className = "mpj-pytc-pin-button style-scope ytd-comment-engagement-bar";
        buttonRenderer.setAttribute("force-icon-button", "true");

        // Clone a pin button from the template and attach a click handler function corresponding to the target comment.
        const pinButton = constants.pinButtonTemplate.cloneNode(true);
        pinButton.onclick = function (clickEvent) { pinComment(clickEvent, target); };

        // Add the pin button to the 'ytd-button-renderer' as soon as it finishes generating its internal structure.
        (async () => {
            const buttonShape = await PageElementManager.awaitElement(() => buttonRenderer.querySelector("yt-button-shape"), buttonRenderer, false);

            const addPinButton = () => {
                if (!buttonShape.contains(pinButton)) {
                    buttonShape.appendChild(pinButton);
                }
            };

            // Also ensure that the button is re-added if it gets cleared by a re-render.
            const observer = new MutationObserver(addPinButton);
            observer.observe(buttonShape, { childList: true, subtree: false });

            addPinButton();
        })();

        return buttonRenderer;
    }


    /**
     * Create a pin button and append it to the toolbar of the target comment.
     * @param {*} target - The target comment. This function has no effect if the target node is not a valid comment.
     */
    function appendPinButton(target) {
        // First run a couple of checks to ensure that the target is a valid YouTube comment.
        if (!target) { return; }
        const toolbar = target.querySelector("#toolbar");
        if (!toolbar) { return; }

        // Avoid adding multiple pin buttons to the same comment.
        if (toolbar.querySelector("ytd-button-renderer.mpj-pytc-pin-button")) { return; }

        toolbar.appendChild(createPinButton(target));
    }


    /**
     * Observe the comments section, appending a pin button to all newly loaded comments.
     */
    async function observeComments() {
        // Set up a handler function for the 'commentsObserver' MutationObserver.
        function commentsObserverHandler(records) {
            for (const record of records) {
                record.addedNodes.forEach(target => { appendPinButton(target); });
            }
        }

        const comments = await pageElements.await("comments");
        observers.commentsObserver = new MutationObserver(commentsObserverHandler);
        observers.commentsObserver.observe(comments, { childList: true });
        log("Enabled commentsObserver for changes in the comments section.");
    }


    /**
     * The main function of the script.
     */
    async function scriptMain() {
        if (!state.isInitialized) {
            await observeComments();

            state.isInitialized = true;
        }
    }


    // Execution of the script starts here.
    log("Pin YouTube Comments by MPJ starting execution...");

    // Set up an object to hold the global constants of the script.
    const constants = {
        pinButtonTemplate: createPinButtonTemplate(),
    };

    // Set up an object to hold the global state of the script.
    const state = {
        isInitialized: false,
    };

    // Set up a PageElementManager to help acquire page elements that are required by the script.
    const pageElements = new PageElementManager({
        comments: () => document.querySelector("#comments #contents"),
    });

    // Set up an object to hold the MutationObservers that are used by the script.
    const observers = {};

    // Listen for page changes and run scriptMain() on every watch page.
    const pageChangeManager = new PageChangeManager(
        scriptMain,
        "yt-page-data-updated",
        URL => URL.startsWith("https://www.youtube.com/watch"),
        true
    );
    pageChangeManager.listen();
})();
