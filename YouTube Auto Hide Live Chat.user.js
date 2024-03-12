// ==UserScript==
// @name         YouTube Auto Hide Live Chat
// @namespace    MPJ_namespace
// @version      2024.03.12.01
// @description  Automatically hides YouTube Live Chat if it is present on a video or stream. Live Chat can still be shown manually.
// @author       MPJ
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/YouTube_Auto_Hide_Live_Chat.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/YouTube_Auto_Hide_Live_Chat.user.js
// ==/UserScript==

/**
 * README
 * 
 * This script will automatically hide YouTube Live Chat if it is present on a video or stream. Live Chat can still be 
 * shown manually, this script will only try to hide it once when a watch page loads.
 * 
 * As to why you would want to hide the YouTube Live Chat, it negatively impacts page performance. While it is open,
 * Live Chat can more than double the CPU usage of the page. It also causes the page's RAM usage to slowly increase over
 * time. Consider using this script if you only rarely interact with the YouTube Live Chat.
**/

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether the script will log messages to the browser's console. Default: false
        maxAttempts: 20,
        // The maximum number of times that the script will attempt to run upon page load.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 20
        attemptDelay: 250,
        // The delay in milliseconds between attempts to run the script. Default: 250
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Log a message to the browser's developer console if settings.enableLogging is true.
     * Otherwise, this function has no effect. The message is prefixed with a script identifier.
     * @param {*} message - The message to log.
     */
    function log(message) {
        if (settings.enableLogging) { console.log("[MPJ|AHLC] " + message); }
    }


    /**
     * Recursively run prechecks until successful or until attempts run out. If prechecks pass, run scriptMain().
     * @param {number} attempts - The remaining number of attempts.
     */
    function keepTrying(attempts) {
        // Stop when attempts run out.
        if (attempts < 1) { return; }

        // Run prechecks to ensure that all needed elements are present.
        chat = document.getElementById("chat");
        showHideButton = document.getElementById("show-hide-button");
        const prechecks = [chat, showHideButton];
        if (prechecks.every(Boolean)) { log("Passed prechecks"); }
        else {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            const failed = prechecks.reduce((acc, val, i) => {
                if (!val) { acc.push(i); }
                return acc;
            }, []);
            log("Failed checks: " + failed);
            window.setTimeout(function () { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }

        // If all prechecks pass, run the main function.
        scriptMain();
    }


    function hideLiveChat(attempts) {
        // Stop if attempts have run out.
        if (attempts < 1) {
            log("Attempts to hide Live Chat have run out");
            return;
        }
        log(`Attempting to hide Live Chat. Attempts remaining: ${attempts - 1}`);

        // Stop if a trusted click on the show/hide button was detected.
        if (trust) {
            log("A trusted click was detected on the show/hide button, stopping attempts to hide Live Chat");
            return;
        }

        // Click the button to hide Live Chat if it is not already hidden.
        if (!chat.hasAttribute("collapsed")) {
            showHideButton.querySelector("button").click();
            log("Clicked the show/hide button in attempt to hide Live Chat");
            return;
        }

        // Schedule the next iteration.
        window.setTimeout(function () { hideLiveChat(attempts - 1); }, settings.attemptDelay);
    }


    function showHideButtonClickHandler(e) {
        if (!e.isTrusted) { return; }
        log("Detected a trusted click on the show/hide button");
        trust = true;
    }


    function scriptMain() {
        // Set up a listener to detect trusted clicks on the show/hide button.
        trust = false;
        chat.addEventListener("click", showHideButtonClickHandler)

        // Attempt to hide Live Chat.
        hideLiveChat(settings.maxAttempts);
    }


    function pageChangeHandler() {
        if (document.URL.startsWith("https://www.youtube.com/watch")) {
            log("New target page detected, attempting execution");
            keepTrying(settings.maxAttempts);
        }
    }


    // Code to start the above functions.
    log("YouTube Auto Hide Live Chat by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let chat, showHideButton, trust;

    // Add an event listener for YouTube's built-in navigate-finish event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", pageChangeHandler);
})();
