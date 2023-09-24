// ==UserScript==
// @name         Pin YouTube Comments
// @namespace    MPJ_namespace
// @version      2023.09.24.02
// @description  Adds a small 'Pin' button to every YouTube comment that will move it to the top of the list when clicked.
// @author       MPJ
// @match        https://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Pin%20YouTube%20Comments.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Pin%20YouTube%20Comments.user.js
// ==/UserScript==

/**
 * IMPORTANT
 * 
 * This script uses a system that can preserve the script's settings between script updates. Making changes to the settings
 * area below will cause a prompt to appear when the script is next executed, asking the user to confirm the changes to
 * the settings. A script update will reset the settings area, triggering the prompt. The user can then choose to dismiss
 * the changes to the settings (caused by the update) and load their previous settings instead. It is important to note that,
 * after dismissing any changes to the settings, the settings area will no longer match the settings actually used by the
 * script. If the user later wants to adjust their settings, they will need to reconfigure the entire settings area and
 * then confirm the changes on the next script start.
**/

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether the script will log messages to the browser's console. Default: false
        maxAttempts: 20,
        // Number of times the script will attempt to run upon detecting a new watch page.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 20
        attemptDelay: 500,
        // Delay between attempts to run the script (in milliseconds). Default: 500

        buttonColor: "#ffffff",
        // The color to use for the pin button text.
        // Must be some value understood by style.color. Default: "#ffffff"
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (settings.enableLogging) { console.log("[MPJ|PYTC] " + message); }
    }


    function checkSettings(currSettings) {
        // This function allows the script settings to be kept between updates.
        const lastSettings = localStorage.getItem("mpj-pytc-last-settings");
        if (!lastSettings) {
            // If the localStorage data for the previous settings does not exist, create it from the current settings.
            localStorage.setItem("mpj-pytc-last-settings", JSON.stringify(currSettings));
            log("No settings history found, skipping the comparison");
            return currSettings;
        }
        // Define a method that will load the saved settings and ensure that they are compatible.
        const loadSettings = () => {
            const loadedSettings = JSON.parse(localStorage.getItem("mpj-pytc-saved-settings") || JSON.stringify(currSettings));
            const currKeys = Object.keys(currSettings);
            // Copy over all of the current settings that are not present in the loaded settings.
            currKeys.filter(key => !loadedSettings.hasOwnProperty(key)).forEach(key => { loadedSettings[key] = currSettings[key]; });
            // Check for and replace any incompatible settings (not entirely robust but better than nothing).
            currKeys.forEach(key => { if (typeof loadedSettings[key] != typeof currSettings[key]) { loadedSettings[key] = currSettings[key]; } });
            return loadedSettings;
        };
        // Check if the current settings are identical to the previous settings.
        if (JSON.stringify(currSettings) == lastSettings) {
            // The settings have not changed since the last run of the script. Load the saved settings profile as normal.
            log("No changes detected in the script settings");
            return loadSettings();
        }
        // If the settings do not match, update lastSettings in localStorage and ask the user whether or not changes should be kept.
        log("Detected changes in the script settings");
        localStorage.setItem("mpj-pytc-last-settings", JSON.stringify(currSettings));
        ytInterface.pauseVideo();
        const settingsConfirmationMsg = (
            `Pin YouTube Comments:\nDetected a change in the script's settings!\n\n` +
            `If you did not make this change, it was probably caused by a script update. PYTC has saved your previous settings.\n\n` +
            `Please select 'OK' to apply the changes to the settings, or select 'Cancel' to load your previous settings instead.`
        );
        if (confirm(settingsConfirmationMsg)) {
            // Overwrite the saved settings with the current settings.
            localStorage.setItem("mpj-pytc-saved-settings", JSON.stringify(currSettings));
            // Apply the current settings.
            log(`Overwrote the saved settings with the current settings`);
            return currSettings;
        }
        // Load the saved settings.
        log(`Loaded the previously saved settings`);
        return loadSettings();
    }


    function keepTrying(attempts) {
        // This function will run the script until it succeeds or until the set number of attempts have run out.

        // Stop when attempts run out.
        if (attempts < 1) { return; }

        // The following check will prevent the script from executing until the user switches to the browser tab it is running in.
        // It does not consume attempts and therefore prevents the script from not working due to all attempts failing while the tab has not yet been opened.
        if (document.hidden) {
            waitingForUnhide = true;
            log("Waiting for the user to switch to the target tab");
            return;
        }

        // Ensure that the YouTube interface is accessible.
        ytInterface = document.getElementById("movie_player");
        if (!ytInterface) {
            log("Could not access the YouTube interface, attempts remaining: " + (attempts - 1));
            window.setTimeout(() => { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }

        // Check for and load the correct script settings.
        if (!checkedSettings) { settings = checkSettings(settings); }
        checkedSettings = true;

        // Run some prechecks to ensure that all needed elements are present.
        comments = document.querySelector("#comments #contents");
        if (!comments) {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(() => { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }
        log("Passed prechecks");

        // After prechecks have been passed, run the main function.
        scriptMain();
    }


    function pinComment(target) {
        // Executed whenever a pin button is clicked, where target is the relevant comment.
        // This function will move the target comment to the top of the list.

        const parent = target.parentNode;
        parent.insertBefore(target, parent.firstChild);
    }

    function makePinBtn(target) {
        // This function creates a pin button for the given target comment.

        const btn = document.createElement("button");
        btn.className = "ytp-button mpj-button pin-button";
        btn.style.width = "auto";
        btn.style.opacity = ".5";
        btn.style.marginLeft = "8px";
        btn.style.position = "relative";
        btn.style.fontSize = "13.5px";
        btn.style.textAlign = "center";
        btn.style.color = settings.buttonColor;
        btn.innerHTML = "Pin";

        btn.onmouseover = function () { this.style.opacity = 1; }
        btn.onmouseleave = function () { this.style.opacity = 0.5; }

        btn.onclick = function () { pinComment(target); }

        return btn;
    }

    function appendPinBtn(target) {
        // This function will create and add a pin button to the toolbar of the given target comment.

        // First run a couple of checks to ensure that target is a valid YouTube comment.
        if (!target) { return; }
        const toolbar = target.querySelector("#toolbar");
        if (!toolbar) { return; }

        // Avoid adding multiple pin buttons to the same comment.
        if (toolbar.querySelector(".pin-button")) { return; }

        toolbar.appendChild(makePinBtn(target));
    }


    function commentObserverHandler(records, observer) {
        // Handle observations from the commentObserver MutationObserver.

        // Make sure that appendPinBtn() is called for every new node of every observation record.
        for (const record of records) {
            record.addedNodes.forEach(target => { appendPinBtn(target); })
        }
    }


    function scriptMain() {
        // This function will carry out the script's main actions.

        // If the commentObserver MutationObserver exists, clear observers from previous pages.
        if (commentObserver) { commentObserver.disconnect(); }
        // If commentObserver does not exist, create it.
        else {
            commentObserver = new MutationObserver(commentObserverHandler);
            log("Created MutationObserver instance: commentObserver");
        }

        commentObserver.observe(comments, { childList: true });
        log("Enabled commentObserver for changes in the comments section");
    }


    function pageChangeHandler() {
        if (document.URL.startsWith("https://www.youtube.com/watch")) {
            log("New target page detected, attempting execution");
            keepTrying(settings.maxAttempts);
        }
    }


    function visibilityChangeHandler() {
        if (!document.hidden && waitingForUnhide) {
            waitingForUnhide = false;
            keepTrying(settings.maxAttempts);
        }
    }


    // Code to start the above functions.
    log("'Pin YouTube Comments' by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let checkedSettings = false, ytInterface, comments, commentObserver;
    // Add an event listener for YouTube's built-in navigate-finish event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", pageChangeHandler);
    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
})();
