// ==UserScript==
// @name         Auto Hide YouTube Live Chat
// @namespace    MPJ_namespace
// @version      2024.04.14.01
// @description  Automatically hides YouTube Live Chat if it is present on a video or stream. Live Chat can still be shown manually.
// @author       MPJ
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Auto_Hide_YouTube_Live_Chat.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Auto_Hide_YouTube_Live_Chat.user.js
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
        if (settings.enableLogging) { console.log("[MPJ|AHYTLC] " + message); }
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
        showHideButton = document.querySelectorAll("#show-hide-button");
        const prechecks = [chat, showHideButton.length];
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


    /**
     * Recursively attempt to hide Live Chat.
     * 
     * YouTube should never automatically open Live Chat more than once per page, so this function will stop once it has
     * clicked the show/hide button. The function will also stop when attempts reaches zero or when a user interaction
     * is detected on the show/hide button.
     * @param {number} attempts - The remaining number of attempts.
     */
    function hideLiveChat(attempts) {
        // Stop if attempts have run out.
        if (attempts < 1) {
            log("Attempts to hide Live Chat have run out");
            return;
        }
        log(`Attempting to hide Live Chat. Attempts remaining: ${attempts - 1}`);

        // Stop if a trusted click on the show/hide button was detected.
        // This should prevent the script from interfering with user interactions on the show/hide button.
        if (trust) {
            log("A trusted click was detected on the show/hide button, stopping attempts to hide Live Chat");
            return;
        }

        // Click the button to hide Live Chat if it is not already hidden.
        if (!chat.hasAttribute("collapsed")) {
            // YouTube sometimes creates multiple show/hide buttons (could be a bug).
            // As long as the show/hide button contains a 'button' child node, it should be valid.
            for (const btn of showHideButton) {
                const childButton = btn.querySelector("button");
                if (childButton) {
                    childButton.click();
                    log("Clicked the show/hide button in attempt to hide Live Chat");
                    return;
                }
                log("WARNING: Detected an invalid (duplicated?) show/hide button! Attempting to circumvent");
            }
            // If no valid buttons are found, try to restart from keepTrying().
            // The maximum allowed number of consecutive restarts is equal to settings.maxAttempts.
            log(`ERROR: Found ${showHideButton.length} show/hide button(s), but none are valid`);
            failureCount += 1;
            if (failureCount <= settings.MaxAttempts) {
                log(`Attempting to restart. Restarts remaining: ${settings.MaxAttempts - failureCount}`);
                window.setTimeout(function () { keepTrying(settings.maxAttempts); }, settings.attemptDelay);
            }
            else { log("ERROR: Unable to hide Live Chat! Please try to fully reload the page"); }
            return;
        }

        // Schedule the next iteration.
        window.setTimeout(function () { hideLiveChat(attempts - 1); }, settings.attemptDelay);
    }


    /**
     * Handle click events for the show/hide Live Chat button.
     * If the isTrusted attribute of the event is true, set variable 'trust' to true.
     * @param {Event} e - The event to handle.
     */
    function showHideButtonClickHandler(e) {
        if (!e.isTrusted) { return; }
        log("Detected a trusted click on the show/hide button");
        trust = true;
    }


    /**
     * The main function of the script.
     */
    function scriptMain() {
        // Set up a listener to detect trusted clicks on the show/hide button.
        trust = false;
        chat.addEventListener("click", showHideButtonClickHandler);

        // Attempt to hide Live Chat.
        hideLiveChat(settings.maxAttempts);
    }


    /**
     * Handle yt-navigate-finish events.
     * Run keepTrying() if the current page is a watch page.
     */
    function pageChangeHandler() {
        if (document.URL.startsWith("https://www.youtube.com/watch")) {
            log("New target page detected, attempting execution");
            failureCount = 0;
            keepTrying(settings.maxAttempts);
        }
    }


    // Code to start the above functions.
    log("Auto Hide YouTube Live Chat by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let chat, showHideButton, trust, failureCount = 0;

    // Add an event listener for YouTube's built-in yt-page-data-updated event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-page-data-updated", pageChangeHandler);
})();
