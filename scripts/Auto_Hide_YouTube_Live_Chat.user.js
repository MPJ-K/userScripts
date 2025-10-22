// ==UserScript==
// @name         Auto Hide YouTube Live Chat
// @namespace    https://github.com/MPJ-K/userScripts
// @version      2025.10.04.01
// @description  Automatically hides YouTube Live Chat if it is present on a video or stream. Live Chat can still be shown manually.
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @author       MPJ-K
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/logging_helpers.js#sha256-ddYDZR5bgGwvIGxF1w7xGaEI7UBMovYQJBrXLmyTtFs=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/dom_helpers.js#sha256-pEZlv2TApVkBE5k1MMfjKVYgNFo2SyQSiCgF9TuHG0s=
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @updateURL    https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Auto_Hide_YouTube_Live_Chat.user.js
// @downloadURL  https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Auto_Hide_YouTube_Live_Chat.user.js
// ==/UserScript==

/**
 * README
 * 
 * This script will automatically hide YouTube Live Chat if it is present on a video or stream. Live Chat can still be 
 * shown manually, this script will only try to hide it once when a watch page loads.
 * 
 * As for why you would want to hide the YouTube Live Chat; it negatively impacts page performance. While it is open,
 * Live Chat can more than double the CPU usage of the page. Additionally, Live Chat causes the page's RAM usage to
 * slowly increase over time. Consider using this script if you only rarely interact with YouTube Live Chat.
**/

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
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Listen for trusted `click` events on Live Chat, preventing it from being hidden if a trusted click is detected.
     */
    function listenForTrustedClicks() {
        // Set up a handler fuction for 'click' events.
        function clickHandler(event) {
            if (!event.target.closest("#chat") || !event.isTrusted) { return; }
            logger.debug("Detected a trusted click on Live Chat!");

            if (observers.chatObserver) { observers.chatObserver.disconnect(); }
            state.trusted = document.URL.split("&", 1)[0];
        }

        document.addEventListener("click", clickHandler, true);
        logger.info("Added a listener for trusted clicks on Live Chat.");
    }


    /**
     * Attempt to hide Live Chat by clicking its show/hide button.
     * If Live Chat was opened manually or is already hidden, this function does nothing.
     */
    async function hideLiveChat() {
        logger.debug("Attempting to hide Live Chat...");

        if (state.trusted === document.URL.split("&", 1)[0]) {
            logger.debug("Live Chat was opened manually.");
            return;
        }

        const chat = await pageElements.await("chat");
        if (chat.hasAttribute("collapsed")) {
            logger.debug("Live Chat is already hidden.");
            return;
        }

        // YouTube sometimes creates multiple show/hide buttons (could be a bug).
        // As long as the show/hide button contains a 'button' child node, it should be valid.
        const showHideButton = await helpers.Dom.PageElementManager.awaitElement(() => chat.querySelector("#show-hide-button button"), 10000, chat);
        if (!showHideButton) {
            logger.error("Cannot hide Live Chat because a valid show/hide button could not be found!");
            return;
        }

        showHideButton.click();
        logger.info("Clicked the show/hide button in attempt to hide Live Chat.");

        if (observers.chatObserver) { observers.chatObserver.disconnect(); }
    }


    /**
     * Observe the `collapsed` attribute of Live Chat, calling `hideLiveChat()` if a change is detected.
     */
    async function observeChat() {
        if (observers.chatObserver) { observers.chatObserver.disconnect(); }
        else { observers.chatObserver = new MutationObserver(hideLiveChat); }

        const ytInterface = await pageElements.await("ytInterface");
        if (ytInterface.getVideoData().isLive) {
            const chat = await pageElements.await("chat", 10000);
            if (!chat) {
                logger.error("Cannot attach chatObserver because Live Chat was not found!");
                return;
            }

            observers.chatObserver.observe(chat, { attributes: true, attributeFilter: ["collapsed"] });
            logger.info("Enabled chatObserver for changes in Live Chat's collapsed state.");

            // Run hideLiveChat() after attaching the MutationObserver to eliminate race conditions.
            hideLiveChat();
        }
    }


    /**
     * The main function of the script.
     */
    async function scriptMain() {
        // Reset the state for every new page.
        state.trusted = "";
        pageElements.reset("chat");

        if (!state.isInitialized) {
            state.isInitialized = true;

            // Set up a listener to detect trusted clicks on Live Chat.
            listenForTrustedClicks();
        }

        // Observe Live Chat for changes in its 'collapsed' attribute.
        // Hide Live Chat automatically if it is expanded without user interaction.
        observeChat();
    }


    // Execution of the script starts here.

    // Create convenient aliases for the script's helper functions.
    const helpers = window.MpjHelpers;

    // Set up a logger.
    const logger = new helpers.Logging.Logger(settings.logLevel, "[MPJ|AHYTLC]", settings.logDebugToInfo);

    logger.info("Starting userScript 'Auto Hide YouTube Live Chat' by MPJ-K...");

    // Set up an object to hold the global state of the script.
    const state = {
        isInitialized: false,
        trusted: "",
    };

    // Set up a PageElementManager to help acquire page elements that are required by the script.
    const pageElements = new helpers.Dom.PageElementManager({
        ytInterface: () => document.getElementById("movie_player"),
        chat: () => document.getElementById("chat"),
        // showHideButton: () => document.querySelectorAll("#show-hide-button"),
    });

    // Set up an object to hold the MutationObservers that are used by the script.
    const observers = {};

    // Listen for page changes and run scriptMain() on every watch page.
    const pageChangeManager = new helpers.Dom.PageChangeManager(
        scriptMain,
        URL => URL.startsWith("https://www.youtube.com/watch"),
        false,
        logger
    );
    pageChangeManager.connect("yt-page-data-updated");
})();
