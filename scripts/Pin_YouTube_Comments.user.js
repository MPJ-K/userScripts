// ==UserScript==
// @name         Pin YouTube Comments
// @namespace    https://github.com/MPJ-K/userScripts
// @version      2025.10.04.01
// @description  Adds a small 'Pin' button to every YouTube comment that will move it to the top of the list when clicked.
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @author       MPJ-K
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/logging_helpers.js#sha256-ddYDZR5bgGwvIGxF1w7xGaEI7UBMovYQJBrXLmyTtFs=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/dom_helpers.js#sha256-pEZlv2TApVkBE5k1MMfjKVYgNFo2SyQSiCgF9TuHG0s=
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @updateURL    https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Pin_YouTube_Comments.user.js
// @downloadURL  https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Pin_YouTube_Comments.user.js
// ==/UserScript==

// References for cross-file JSDoc in VS Code:
/// <reference path="../helpers/logging_helpers.js" />
/// <reference path="../helpers/dom_helpers.js" />

(function () {
    'use strict';

    // Script settings

    const settings = {
        logLevel: "disabled",
        // The maximum log level at which the script is allowed to log messages to the browser's console.
        // Unless you are a developer looking to debug, this option is of little value. Valid levels in ascending order
        // of verbosity are: "disabled", "error", "warn", "info", and "debug".
        // Default: "disabled"
        logDebugToInfo: false,
        // Whether to log "debug"-level messages using the console's 'log' method instead of its 'debug' method.
        // Enabling this option lets you view the script's debug messages without needing to enable verbose messages in
        // the browser's console.
        // Default: false

        scrollToPinned: true,
        // If this option is enabled, pinning a comment will scroll the page to the new position of the comment.
        // Scrolling can still be prevented by holding shift when clicking the pin button.
        // Default: true
        invertShiftKey: false,
        // Whether to invert the behavior of the shift key regarding the 'scrollToPinned' setting.
        // If enabled, the shift key must be held down to automatically scroll the pinned comment into view.
        // Default: false
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


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
        if (settings.scrollToPinned && (settings.invertShiftKey ? clickEvent.shiftKey : !clickEvent.shiftKey) && target.getBoundingClientRect().top < 56) {
            target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }

        logger.debug("A comment has been pinned.");
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
            const buttonShape = await helpers.Dom.PageElementManager.awaitElement(() => buttonRenderer.querySelector("yt-button-shape"), 0, buttonRenderer, false);

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
        logger.info("Enabled commentsObserver for changes in the comments section.");
    }


    /**
     * The main function of the script.
     */
    async function scriptMain() {
        if (!state.isInitialized) {
            state.isInitialized = true;

            await observeComments();

            // At this time, it is not necessary to re-attach the commentObserver for every new page.
            // Hence, the PageChangeManager may be disconnected once the commentObserver has been attached.
            pageChangeManager.disconnect();
        }
    }


    // Execution of the script starts here.

    // Create convenient aliases for the script's helper functions.
    const helpers = window.MpjHelpers;

    // Set up a logger.
    const logger = new helpers.Logging.Logger(settings.logLevel, "[MPJ|PYTC]", settings.logDebugToInfo);

    logger.info("Starting userScript 'Pin YouTube Comments' by MPJ-K...");

    // Set up an object to hold the global constants of the script.
    const constants = {
        pinButtonTemplate: createPinButtonTemplate(),
    };

    // Set up an object to hold the global state of the script.
    const state = {
        isInitialized: false,
    };

    // Set up a PageElementManager to help acquire page elements that are required by the script.
    const pageElements = new helpers.Dom.PageElementManager({
        comments: () => document.querySelector("#comments #contents"),
    });

    // Set up an object to hold the MutationObservers that are used by the script.
    const observers = {};

    // Listen for page changes and run scriptMain() on every watch page.
    const pageChangeManager = new helpers.Dom.PageChangeManager(
        scriptMain,
        URL => URL.startsWith("https://www.youtube.com/watch"),
        true,
        logger
    );
    pageChangeManager.connect("yt-page-data-updated");
})();
