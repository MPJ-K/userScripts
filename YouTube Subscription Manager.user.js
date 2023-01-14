// ==UserScript==
// @name         YouTube Subscription Manager
// @namespace    MPJ_namespace
// @version      2023.01.14.01
// @description  TODO
// @author       MPJ
// @match        https://*.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/YTSM_wip/YouTube%20Subscription%20Manager.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/YTSM_wip/YouTube%20Subscription%20Manager.user.js
// ==/UserScript==

/**
 * README
 * 
 * TODO
**/

// Currently known bugs and/or planned changes:
// None

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether or not the script will log messages to the browser's console. Default: false
        maxAttempts: 10,
        // Number of times the script will attempt to run upon detecting a new watch page.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
        attemptDelay: 250,
        // Delay between attempts to run the script in milliseconds. Default: 250
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (settings.enableLogging) { console.log("[MPJ|YTSM] " + message); }
    }


    function checkSettings(currSettings) {
        // This function allows the script settings to be kept between updates.
        let lastSettings = localStorage.getItem("mpj-ytsm-last-settings");
        if (lastSettings) { lastSettings = JSON.parse(lastSettings); }
        else {
            // If the localStorage data for the previous settings does not exist, create it from the current settings.
            localStorage.setItem("mpj-ytsm-last-settings", JSON.stringify(currSettings));
            log("No settings history found, skipping the comparison");
            return currSettings;
        }
        const currKeys = Object.keys(currSettings);
        const lastKeys = Object.keys(lastSettings);
        // Define a method that checks for inequality in the setting values.
        const notEqualCheck = key => {
            const currVal = currSettings[key];
            const lastVal = lastSettings[key];
            // Make an exception for 'objects' (arrays in this case), because they require a different inequality check.
            if (typeof lastVal != "object") { return currVal != lastVal; }
            return currVal.length != lastVal.length || lastVal.some((val, i) => val != currVal[i]);
        };
        // Define a method that will load the saved settings and ensure that they are compatible.
        const loadSettings = () => {
            const loadedSettings = JSON.parse(localStorage.getItem("mpj-ytsm-saved-settings") || JSON.stringify(currSettings));
            const loadedKeys = Object.keys(loadedSettings);
            // Copy over all of the current settings that are not present in the loaded settings.
            const newKeys = currKeys.filter(key => !loadedKeys.includes(key));
            newKeys.forEach(key => { loadedSettings[key] = currSettings[key]; });
            return loadedSettings;
        };
        // Check if the current settings are identical to the previous settings.
        if (!(currKeys.length != lastKeys.length || lastKeys.some(key => !currKeys.includes(key)) || lastKeys.some(key => notEqualCheck(key)))) {
            // The settings have not changed since the last run of the script. Load the saved settings profile as normal.
            log("No changes detected in the script settings");
            return loadSettings();
        }
        // If the settings do not match, update lastSettings in localStorage and ask the user whether or not changes should be kept.
        log("Detected changes in the script settings");
        localStorage.setItem("mpj-ytsm-last-settings", JSON.stringify(currSettings));
        ytInterface.pauseVideo();
        const settingsConfirmationMsg = (
            `YouTube Custom Playback Speed Buttons:\nDetected a change in the script's settings!\n\n` +
            `If you did not make this change, it was probably caused by a script update. YTSM has saved your previous settings.\n\n` +
            `Please select 'OK' to apply the changes to the settings, or select 'Cancel' to load your previous settings instead.`
        );
        if (confirm(settingsConfirmationMsg)) {
            // Overwrite the saved settings with the current settings.
            localStorage.setItem("mpj-ytsm-saved-settings", JSON.stringify(currSettings));
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

        // Check for and load the correct script settings.
        if (!checkedSettings) { settings = checkSettings(settings); }
        checkedSettings = true;

        // Run some prechecks to ensure that all needed elements are present.
        if (true) { log("Passed prechecks"); }
        else {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(function () { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }

        // After prechecks have been passed, run the main function.
        scriptMain();
    }


    function scriptMain() {
        // This function will carry out the script's main actions.
    }


    // Code to start the above functions.
    log("YouTube Subscription Manager by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let checkedSettings = false;
    // Add an event listener for YouTube's built-in navigate-finish event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", () => {
        if (true) {
            log("New target page detected, attempting execution");
            keepTrying(settings.maxAttempts);
        }
    });
    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && waitingForUnhide) {
            waitingForUnhide = false;
            keepTrying(settings.maxAttempts);
        }
    });
})();
