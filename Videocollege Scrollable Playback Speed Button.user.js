// ==UserScript==
// @name         Videocollege Scrollable Playback Speed Button
// @namespace    MPJ_namespace
// @version      17-10-2022
// @description  Makes it so that scrolling over the plackback speed button on the TU/e mediasite player adjusts playback speed beyond its normal limits.
// @author       MPJ
// @match        https://videocollege.tue.nl/Mediasite/Play/*
// @icon         https://videocollege.tue.nl/Mediasite/Play/favicon.png
// @grant        none
// ==/UserScript==

/**
 * README
 * This little script lets you set pretty much any playback speed on TU/e Mediasite videos.
 * The full HTML5 supported playback speed range (0.1x to 10x) is available to you when using this script.
 * As stated in the description, simply mouse over the playback speed button and scroll to increase or decrease the playback speed.
 * The step size for the playback speed increments / decrements can be customized in the script settings below.
 * Note that I am in no way a professional programmer and cannot guarantee that this script will work in every possible scenario.
 * Anyhow, I hope you enjoy using my script.
**/

(function() {
    'use strict';

    // Script settings

    const enableLogging = true;
    // Whether or not the script will log messages to the browser's console. Default: false
    const maxAttempts = 5;
    // Number of times the script will attempt to run upon detecting a new watch page.
    // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 5
    const attemptDelay = 500;
    // Delay between attempts to run the script in milliseconds. Default: 500
    const speedStep = 0.25;
    // The playback speed adjustment stepsize for the scrollable playback speed button. One scroll step
    // increases or decreases the playback speed by this amount. Default: 0.25

    // End of settings


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (enableLogging) { console.log("[MPJ|VSPSB] " + message); }
    }


    function keepTrying(attempts) {
        // This function will run the script until it succeeds or until the set number of attempts have run out.

        // Stop when attempts run out.
        if (attempts < 1) { return; }

        // Run some prechecks to ensure all needed elements are present.
        const speedButton = document.querySelector("button.vjs-playback-rate");
        const player = document.querySelector("video");
        if (!speedButton || !player) {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(function() { keepTrying(attempts - 1); }, attemptDelay);
            return;
        }
        log("Passed prechecks");

        // Run the script's main code.
        speedButton.onwheel = function(event) {
            event.preventDefault();
            const currSpeed = player.playbackRate;
            let newSpeed;
            if (event.deltaY < 0) { newSpeed = Math.min(currSpeed + speedStep, 10); }
            else { newSpeed = Math.max(currSpeed - speedStep, 0.1); }
            // Convert floats with very small decimal values to integers.
            const newSpeedRounded = Math.round(newSpeed);
            if (Math.abs(newSpeed - newSpeedRounded) < 0.001) { newSpeed = newSpeedRounded; }
            // Update the playback speed.
            player.playbackRate = newSpeed;
        }
        log("Successfully transformed the playback speed button");
    }


    // Code to start the above functions.
    log("Videocollege Scrollable Playback Speed Button by MPJ starting execution");
    // Add an event listener for the urlchange event.
    // This will run keepTrying() whenever the page changes.
    document.addEventListener("urlchange", () => {
        log("Page change detected, attempting execution");
        keepTrying(maxAttempts);
    });
    // Manually run once to initialize.
    keepTrying(maxAttempts);
})();
