// ==UserScript==
// @name         YouTube Auto Hide Live Chat
// @namespace    MPJ_namespace
// @version      2023.09.08.01
// @description  Automatically hides YouTube Live Chat if it is present on a video or stream. Live Chat can still be shown manually.
// @author       MPJ
// @match        https://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/YouTube%20Auto%20Hide%20Live%20Chat.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/YouTube%20Auto%20Hide%20Live%20Chat.user.js
// ==/UserScript==

(function () {
    'use strict';

    // README
    // This script will automatically hide YouTube Live Chat if it is present on a video or stream.
    // Live Chat can still be shown manually, this script will only try to hide it once when a watch page loads.
    // As to why you would want to hide the YouTube Live Chat, it negatively impacts page performance.
    // While it is open, Live Chat can more than double the CPU usage of the page. It also causes the page's RAM usage to slowly increase over time.
    // Consider using this script if you only rarely interact with the YouTube Live Chat.

    // Script settings

    const enableLogging = false;
    // Whether or not the script will log messages to the browser's console. Default: false
    const maxAttempts = 10;
    // Number of times the script will attempt to run upon detecting a new watch page.
    // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
    const attemptDelay = 500;
    // Delay between attempts to run the script in milliseconds. Default: 500

    // End of settings


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (enableLogging) { console.log("[MPJ|YTAHLC] " + message); }
    }


    function hideLiveChat(attempts) {
        // This function will attempt to hide the Live Chat.
        const chat = document.getElementById("chat");
        const btn = document.getElementById("show-hide-button");
        // Check if the chat and the button that hides Live Chat exist.
        if (!btn || !chat) {
            // Stop if attempts have run out.
            if (attempts < 1) {
                log(`Stopping because attempts have run out.`);
                return;
            }
            // Retry after a short delay.
            log(`The button that hides Live Chat does not exist. Attempts remaining: ${attempts - 1}`);
            window.setTimeout(() => hideLiveChat(attempts - 1), attemptDelay);
            return;
        }
        // First check that Live Chat is not already hidden.
        if (chat.hasAttribute("collapsed")) {
            log(`Stopping because Live Chat is already hidden.`);
            return;
        }
        // Click the button to hide Live Chat.
        btn.querySelector("button").click();
        log(`Pressed the button that hides Live Chat.`);
    }


    // Code to start the above functions.
    // Add an event listener for YouTube's built in navigate-finish event.
    // This will run the script whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", () => {
        if (!document.URL.startsWith("https://www.youtube.com/watch")) { return; }
        log(`New target page detected, attempting execution...`);
        hideLiveChat(maxAttempts);
    });
})();
