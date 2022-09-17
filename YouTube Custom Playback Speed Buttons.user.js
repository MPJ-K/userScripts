// ==UserScript==
// @name         YouTube Custom Playback Speed Buttons
// @namespace    MPJ_namespace
// @version      17-09-2022
// @description  Adds easily accessible playback speed buttons for selectable speeds up to 10x and an option to remember the speed.
// @author       MPJ
// @match        https://*.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// ==/UserScript==

// This script was originally based off "YouTube Faster Playback Speed Buttons" by Cihan Tuncer.
// It retains some code and functions from the original script, in addition to the button styling (I have no competence with CSS).
// The script has since been heavily modified in the form of rewritten code, additional functionality and increased robustness.
// I am an amateur JS programmer working on scripts as a hobby, this being one of my first projects. The code has many comments
// explaining my implementation.

// Currently known bugs:
// None

(function() {
    'use strict';

    // Script settings

    const enableLogging = false;
    // Whether or not the script will log messages to the browser's console. Default: false
    const maxAttempts = 10;
    // Number of times the script will attempt to run upon detecting a new watch page.
    // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
    const attemptDelay = 500;
    // Delay between attempts to run the script in milliseconds. Default: 500
    const buttonSpeeds = [1, 1.75, 2, 2.5, 3];
    // Specifies the playback speed buttons added to the player. You can add as many buttons as you want,
    // but the speed must be between 0.1 and 10 (these limits are intrinsic to YouTube's video player).
    // The buttons will be added in the specified order. Values must be entered in array form.
    // Default: [1, 1.75, 2, 2.5, 3]
    const addScrollableSpeedButton = false;
    // Enabling this option will add a special playback speed button that allows fine playback speed
    // control by scrolling over the button. Clicking the button sets the playback speed to 1x.
    // Regular speed buttons continue to work as normal, but can also be disabled entirely by setting
    // buttonSpeeds = [].
    // The playback speed step size can be customized using the 'speedStep' setting.
    // Default: false
    const speedStep = 0.25;
    // The playback speed adjustment stepsize for the scrollable playback speed button. One scroll step
    // increases or decreases the playback speed by this amount. Default: 0.25
    const addVolumeButton = false;
    // If enabled, a custom volume button is added that works independently from YouTube's own
    // volume control. Volume is adjusted by scrolling over the button and clicking it sets the volume
    // to zero. It also bypasses YouTube's hidden volume limiter (scales down the volume range for loud
    // videos) and always allows the volume to reach 100%.
    // The volume step size can be customized using the 'volumeStep' setting.
    // The default volume (when a new video loads) is still determined by YouTube's controls.
    // This was added because I personally like discreet volume steps and YouTube's default 10% steps
    // are far too big. If you don't mind moving YouTube's slider then this option is of little value.
    // Default: false
    const volumeStep = 0.02;
    // The volume adjustment step size for the custom volume button. One scroll step increases or
    // decreases the volume by this amount (note: 0.01 equals 1%). Default: 0.02
    const cropBottomGradient = false;
    // Setting this to true crops the darkening gradient at the bottom of the player that appears
    // when the bottom button bar is shown (mouse hovering over the player). Default: false
    const bottomGradientMaxHeight = "21px";
    // When cropBottomGradient is enabled, this setting specifies the height to which the bottom gradient
    // will be cropped. Must be a string with a height value understood by style.maxHeight. Default: "21px"

    const normalButtonColor = "";
    // The color to use for all buttons in their normal (inactive) state.
    // Must be some value understood by style.color. Default: ""
    const activeButtonColor = "#3ea6ff";
    // The color to use for all buttons (except the exclude playlist button) in their active state.
    // Must be some value understood by style.color. Default: "#3ea6ff"

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (enableLogging) { console.log("[MPJ|YTCPSB] " + message); }
    }


    function keepTrying(attempts) {
        // This function will run the script until it succeeds or until the set number of attempts have run out.

        // Stop when attempts run out.
        if (attempts < 1) { return; }

        // The following check will prevent the script from executing until the user switches to the browser tab it is running in.
        // It does not consume attempts and therefore prevents the script from not working due to all attempts failing while the tab has not yet been opened.
        if (document.hidden) {
            waitingForUnhide = true;
            log("Waiting for the user to switch to the target tab.");
            return;
        }

        // Run some prechecks to ensure all needed elements are present.
        const ytRMenu = document.querySelector(".ytp-right-controls");
        const speedControl = document.querySelector("video").playbackRate;
        const notLivePrecheck = document.querySelector(".ytp-time-display");
        const bottomGradient = document.querySelector(".ytp-gradient-bottom");
        let popups = document.querySelector("ytd-popup-container");
        if (ytRMenu && speedControl && notLivePrecheck && popups && bottomGradient) { log("Passed prechecks"); }
        else {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(function() { keepTrying(attempts - 1); }, attemptDelay);
            return;
        }

        // If the option is set, crop the bottom gradient.
        if (cropBottomGradient) {
            bottomGradient.style.maxHeight = bottomGradientMaxHeight;
            log("Cropped bottom gradient");
        }

        // Before running, check if there are any popups open and wait for them to be closed.
        // This is done to avoid the script forcefully closing popups.
        // NOTE: This may be worth removing eventually because it is no longer necessary.
        // The new event-based page change detection is very fast and it is now almost impossible
        // for the user to open a popup before the script runs.
        popups = popups.children;
        let noPopups = true;
        for (const popup of popups) {
            // Skip the toast renderer to fix a bug that started appearing around September 2022.
            if (popup.nodeName == "YT-NOTIFICATION-ACTION-RENDERER") { continue; }
            // Run through all the popups and check that they are hidden.
            if (popup.style.display != "none") {
                noPopups = false;
                break;
            }
        }
        if (!noPopups) {
            // If there are open popups, wait for two attempt delays without consuming attempts.
            log("Detected open popups, waiting for them to be closed");
            window.setTimeout(function() { keepTrying(attempts); }, attemptDelay * 2);
            return;
        }

        // Run the main function.
        runScript();

        // Check if the script ran successfully after a short delay.
        window.setTimeout(function() {
            const currentSpeed = document.querySelector("video").playbackRate;
            const autoSpeed = localStorage.getItem("MPJAutoSpeed") || 0;
            const savedSpeed = parseFloat(localStorage.getItem("MPJSavedSpeed") || 1);
            const excludedList = localStorage.getItem("MPJExcludedList") || "List Starter,";
            const notLiveCheck = document.querySelector(".ytp-live") == null;
            if (currentSpeed == 1 && autoSpeed == 1 && savedSpeed != 1 && notLiveCheck && !excludedList.includes(getListID())) {
                log("May have failed to set speed, retrying just in case. Attempts remaining: " + (attempts - 1));
                keepTrying(attempts - 1);
            }
        }, attemptDelay);
    }


    function runScript() {
        // This function will create all the buttons and attempt to set the player speed accordingly.

        // Add the buttons if they are not already present.
        const ytRMenu = document.querySelector(".ytp-right-controls");
        if (!document.querySelector(".rem-button")) {
            log("Adding buttons");
            // Create the custom volume button if it is enabled.
            if (addVolumeButton) { ytRMenu.prepend(makeVolBtn()); }
            // Create the scrollable playback speed button if it is enabled.
            if (addScrollableSpeedButton) { ytRMenu.prepend(makeScrollableSpeedBtn()); }
            // Create the speed buttons.
            for (let i = buttonSpeeds.length - 1; i >= 0; i--) {
                if (buttonSpeeds[i] > 10 || buttonSpeeds[i] < 0.1) {
                    log("WARNING: Skipped adding a playback speed button because its speed is not between 0.1 and 10");
                    continue;
                }
                ytRMenu.prepend(makeSpeedBtn(buttonSpeeds[i]));
            }
            // Once the speed buttons have been added, change their widths to fixed values to prevent them from shifting due to style changes.
            fixSpeedBtnWidth(maxAttempts);
            // Create the remember speed button.
            ytRMenu.prepend(makeRemBtn());
        }
        // Update the value of the volume button if it was already present.
        else if (addVolumeButton) { document.querySelector(".vol-button").innerHTML = Math.round(roundVol() * 100) + "%"; }

        // Add or remove the exclude playlist button.
        const excludeBtnSelector = document.querySelector(".exclude-button");
        // Check if the current page is a playlist.
        if (document.URL.includes("&list=")) {
            // If the button is not present, add the button.
            if (!excludeBtnSelector) {
                const excludeButton = makeExcludeBtn();
                ytRMenu.prepend(excludeButton);
            }
        }
        // If the button is present but the current page is not a playlist, remove the button.
        else if (excludeBtnSelector) { excludeBtnSelector.remove(); }

        // Set the player speed according to the saved speed.
        const notLiveCheck = document.querySelector(".ytp-live") == null;
        const savedSpeed = parseFloat(localStorage.getItem("MPJSavedSpeed") || 1);
        const savedBtn = document.querySelector(".x" + savedSpeed.toFixed(2).replace(".", ""));
        const excludedList = localStorage.getItem("MPJExcludedList") || "List Starter,";

        if (localStorage.getItem("MPJAutoSpeed") == 1) {
            log("Automatic playback speed enabled, attempting to set playback speed to " + savedSpeed.toFixed(2) + "x");
            document.querySelector(".rem-button").style.borderColor = activeButtonColor;
            // Check if the current playlist is not excluded.
            if (!excludedList.includes(getListID())) {
                // Only set speed if this is not a livestream.
                if (notLiveCheck) {
                    if (savedBtn) { savedBtn.click(); }
                    else {
                        document.querySelector("video").playbackRate = savedSpeed;
                        resetBtns(savedSpeed);
                        const sSpeedBtn = document.querySelector(".scrollable-speed-button");
                        sSpeedBtn.style.color = activeButtonColor;
                    }
                    log("Set speed successfully");
                }
                // If this is a livestream, select the 1x button without changing the saved speed.
                else {
                    log("Detected livestream, not setting playback speed");
                    selectNormalSpeedBtn();
                }
            }
            // If the current playlist is excluded, select the 1x button without changing the saved speed.
            else {
                log("Current playlist is excluded from automatic playback speed, skipping");
                selectNormalSpeedBtn();
                document.querySelector(".exclude-button").style.color = "#ff0000";
            }
        }
        else {
            log("Automatic playback speed disabled, skipping");
            selectNormalSpeedBtn();
        }


        function makeVolBtn() {
            // This function creates the custom volume button.
            const volBtn = document.createElement("button");
            volBtn.className = "ytp-button mpj-button vol-button";
            volBtn.style.top = "-19px";
            volBtn.style.width = "36px";
            volBtn.style.opacity = ".5";
            volBtn.style.marginRight = "6px";
            volBtn.style.position = "relative";
            volBtn.style.fontSize = "14px";
            volBtn.style.textAlign = "center";
            volBtn.title = "Volume";
            volBtn.innerHTML = Math.round(roundVol() * 100) + "%";

            volBtn.onmouseover = function() { this.style.opacity = 1; }
            volBtn.onmouseleave = function() { this.style.opacity = 0.5; }

            volBtn.onclick = function() {
                document.querySelector("video").volume = 0;
                this.innerHTML = "0%";
            }

            volBtn.onwheel = function(event) {
                event.preventDefault();
                const player = document.querySelector("video");
                const volRounded = roundVol();
                if (event.deltaY < 0) { player.volume = Math.min(volRounded + volumeStep, 1); }
                else { player.volume = Math.max(volRounded - volumeStep, 0); }
                this.innerHTML = Math.round(player.volume * 100) + "%";
            }
            return volBtn;
        }


        function roundVol() {
            // Returns a rounded version of the current player volume.
            const vol = document.querySelector("video").volume;
            const mod = vol % volumeStep;
            return mod < volumeStep * 0.1 ? vol - mod : vol - mod + volumeStep;
        }


        function makeScrollableSpeedBtn() {
            // This function creates the custom volume button.
            const sSpeedBtn = document.createElement("button");
            sSpeedBtn.className = "ytp-button mpj-button scrollable-speed-button";
            sSpeedBtn.style.top = "-19px";
            sSpeedBtn.style.width = "36px";
            sSpeedBtn.style.opacity = ".5";
            sSpeedBtn.style.marginRight = "6px";
            sSpeedBtn.style.position = "relative";
            sSpeedBtn.style.fontSize = "14px";
            sSpeedBtn.style.textAlign = "center";
            sSpeedBtn.innerHTML = "1.00x";

            sSpeedBtn.onmouseover = function() { this.style.opacity = 1; }
            sSpeedBtn.onmouseleave = function() { this.style.opacity = 0.5; }

            sSpeedBtn.onclick = function() {
                const normalSpeedBtn = document.querySelector(".x100");
                if (normalSpeedBtn) { normalSpeedBtn.click(); }
                else {
                    document.querySelector("video").playbackRate = 1;
                    localStorage.setItem("MPJSavedSpeed", 1);
                    resetBtns(1);
                    this.style.color = activeButtonColor;
                }
            }

            sSpeedBtn.onwheel = function(event) {
                event.preventDefault();
                const player = document.querySelector("video");
                const currSpeed = player.playbackRate;
                //const currSpeed = parseFloat(localStorage.getItem("MPJSavedSpeed") || 1);
                let newSpeed;
                if (event.deltaY < 0) { newSpeed = Math.min(currSpeed + speedStep, 10); }
                else { newSpeed = Math.max(currSpeed - speedStep, 0.1); }
                // Convert floats with very small decimal values to integers.
                const newSpeedRounded = Math.round(newSpeed);
                if (Math.abs(newSpeed - newSpeedRounded) < 0.001) { newSpeed = newSpeedRounded; }
                // Update buttons and the playback speed.
                const speedBtn = document.querySelector(".x" + newSpeed.toFixed(2).replace(".", ""));
                if (speedBtn) { speedBtn.click(); }
                else {
                    player.playbackRate = newSpeed;
                    localStorage.setItem("MPJSavedSpeed", newSpeed);
                    resetBtns(newSpeed);
                    this.style.color = activeButtonColor;
                }
            }
            return sSpeedBtn;
        }


        function makeSpeedBtn(speed) {
            // This function creates a speed button.
            const classname = ("x" + speed.toFixed(2)).replace(".", "");

            const btn = document.createElement("button");
            btn.className = "ytp-button mpj-button " + classname;
            btn.style.top = "-19px";
            btn.style.width = "auto";
            btn.style.opacity = ".5";
            btn.style.marginRight = "6px";
            btn.style.position = "relative";
            btn.style.fontSize = "14px";
            btn.style.textAlign = "center";
            btn.innerHTML = speed + "x";

            btn.onmouseover = function() { this.style.opacity = 1; }
            btn.onmouseleave = function() { this.style.opacity = 0.5; }

            btn.onclick = function() {
                document.querySelector("video").playbackRate = speed;
                localStorage.setItem("MPJSavedSpeed", speed);
                resetBtns(speed);
                this.style.fontWeight = "800";
                this.style.color = activeButtonColor;
            }
            return btn;
        }


        function resetBtns(speed) {
            // This function resets the style of every speed button.
            for (let i = 0; i < buttonSpeeds.length; i++) {
                const selector = document.querySelector("." + (("x" + buttonSpeeds[i].toFixed(2)).replace(".", "")));
                selector.style.fontWeight = "normal";
                selector.style.color = normalButtonColor;
            }
            if (addScrollableSpeedButton) {
                const sSpeedBtn = document.querySelector(".scrollable-speed-button");
                sSpeedBtn.innerHTML = speed < 10 ? speed.toFixed(2) + "x" : "10.0x";
                sSpeedBtn.style.color = normalButtonColor;
            }
        }


        function selectNormalSpeedBtn() {
            // This function visually selcts the normal (1x) speed button.
            resetBtns(1);
            const normalSpeedBtn = document.querySelector(".x100");
            if (normalSpeedBtn) {
                normalSpeedBtn.style.fontWeight = "800";
                normalSpeedBtn.style.color = activeButtonColor;
            }
        }


        function fixSpeedBtnWidth(attempts) {
            // This function changes the width of every speed button to a fixed value.
            for (let i = 0; i < buttonSpeeds.length; i++) {
                const selector = document.querySelector("." + (("x" + buttonSpeeds[i].toFixed(2)).replace(".", "")));
                // If offsetWidth is undefined, retry after a short delay.
                if (!selector.offsetWidth) {
                    // Stop if attempts have run out.
                    if (attempts < 2) {
                        log("Ran out of attempts while trying to compute speed button widths");
                        return;
                    }
                    log("Unable to compute speed button widths. Attempts remaining: " + (attempts - 1));
                    window.setTimeout(() => fixSpeedBtnWidth(attempts - 1), attemptDelay);
                    return;
                }
                selector.style.width = (selector.offsetWidth + 1) + "px";
            }
            log("Successfully set speed button widths");
        }


        function makeRemBtn() {
            // This function creates the remember playback speed button.
            const remBtn = document.createElement("button");
            remBtn.className = "ytp-button mpj-button rem-button";
            remBtn.style.top = "-19px";
            remBtn.style.width = "14px";
            remBtn.style.height = "14px";
            remBtn.style.border = "2px solid white";
            remBtn.style.borderRadius = "10px";
            remBtn.style.opacity = ".5";
            remBtn.style.marginRight = "10px";
            remBtn.style.position = "relative";
            remBtn.title = "Remember Playback Speed";

            remBtn.onmouseover = function() { this.style.opacity = 1; }
            remBtn.onmouseleave = function() { this.style.opacity = 0.5; }

            remBtn.onclick = function() {
                if ((localStorage.getItem("MPJAutoSpeed") || 0) == 1) {
                    localStorage.setItem("MPJAutoSpeed", 0);
                    localStorage.setItem("MPJSavedSpeed", 1);
                    remBtn.style.borderColor = "";
                }
                else{
                    localStorage.setItem("MPJAutoSpeed", 1);
                    localStorage.setItem("MPJSavedSpeed", document.querySelector("video").playbackRate);
                    remBtn.style.borderColor = activeButtonColor;
                }
            }
            return remBtn;
        }


        function makeExcludeBtn() {
            // This function creates the exclude current playlist button.
            const excludeBtn = document.createElement("button");
            excludeBtn.className = "ytp-button mpj-button exclude-button";
            excludeBtn.style.top = "-18px";
            excludeBtn.style.width = "auto";
            excludeBtn.style.opacity = ".5";
            excludeBtn.style.marginRight = "5px";
            excludeBtn.style.position = "relative";
            excludeBtn.style.fontSize = "17px";
            excludeBtn.title = "Exclude Current Playlist";
            excludeBtn.innerHTML = "✖";

            excludeBtn.onmouseover = function() { this.style.opacity = 1; }
            excludeBtn.onmouseleave = function() { this.style.opacity = 0.5; }

            excludeBtn.onclick = function() {
                const listID = getListID();
                let excludedList = localStorage.getItem("MPJExcludedList") || "List Starter,";
                if (excludedList.includes(listID)) {
                    excludedList = excludedList.slice(0, excludedList.indexOf(listID) - 1) + excludedList.slice(excludedList.indexOf(listID) + listID.length);
                    this.style.color = normalButtonColor;
                }
                else {
                    excludedList = excludedList + listID + ",";
                    this.style.color = "#ff0000";
                }
                localStorage.setItem("MPJExcludedList", excludedList);
            }
            return excludeBtn;
        }
    }


    function getListID() {
        // This function returns the ID of the current playlist from the URL.
        const url = document.URL;
        if (url.includes("&list=")) {
            let startIndex = url.indexOf("&list=") + 6;
            let endIndex = url.indexOf("&", startIndex + 1);
            if (endIndex > -1) { return url.slice(startIndex, endIndex); }
            else { return url.slice(startIndex); }
        }
        else { return "null"; }
    }


    // Code to start the above functions.
    log("YouTube Custom Playback Speed Buttons by MPJ starting execution");
    // Add an event listener for YouTube's built in navigate-finish event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", () => {
        if (document.URL.startsWith("https://www.youtube.com/watch")) {
            log("New target page detected, attempting execution");
            keepTrying(maxAttempts);
        }
    });
    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && waitingForUnhide) {
            waitingForUnhide = false;
            keepTrying(maxAttempts);
        }
    });
})();
