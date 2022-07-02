// ==UserScript==
// @name         YouTube Custom Playback Speed Buttons
// @namespace    MPJ_namespace
// @version      03-07-2022
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

    // Script Settings

    const enableLogging = false;
    // Whether or not the script will log messages to the browser's console. Default: false
    const maxAttempts = 10;
    // Number of times the script will attempt to run upon detecting a new watch page.
    // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
    const attemptDelay = 500;
    // Delay between attempts to run the script in milliseconds. Default: 500
    const buttonSpeeds = [1, 1.75, 2, 2.5, 3];
    // Specifies the playback speed buttons added to the player. You can add as many buttons as you want,
    // but the speed must be between 0.1 and 10. The buttons will be added in the specified order.
    // Values must be entered in array form. Default: [1, 1.75, 2, 2.5, 3]
    const addVolumeButton = false;
    // If enabled, a custom volume button is added that works independently from YouTube's own
    // volume control. Volume is adjusted by scrolling over the button and clicking it sets the volume
    // to zero. It also bypasses YouTube's hidden volume limiter (scales down the volume range for loud
    // videos) and always allows the volume to reach 100%.
    // The volume step size can be customized using the 'volumeStep' setting.
    // The default volume (when a new video loads) is still determined by YouTube's controls.
    const volumeStep = 0.02;
    // The volume adjustment step size for the custom volume button. One scroll step increases the
    // volume by this amount (note: 0.01 equals 1%). Default: 0.02
    const cropBottomGradient = false;
    // Setting this to true crops the darkening gradient at the bottom of the player that appears
    // when the bottom button bar is shown (mouse hovering over the player).
    const bottomGradientMaxHeight = "21px";
    // When cropBottomGradient is enabled, this setting specifies the height to which the bottom gradient
    // will be cropped. Must be a string with a height value understood by style.maxHeight. Default: "21px"


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
        popups = popups.children;
        let noPopups = true;
        for (let i = 0; i < popups.length; i++) {
            if (popups[i].style.display != "none") { noPopups = false; }
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
            const autoSpeed = localStorage.getItem("MPJAutoSpeed");
            const savedSpeed = localStorage.getItem("MPJSavedSpeed") || "x1";
            const excludedList = localStorage.getItem("MPJExcludedList") || "List Starter,";
            const notLiveCheck = document.querySelector(".ytp-live") == null;
            if (currentSpeed == 1 && autoSpeed == 1 && savedSpeed != "x1" && notLiveCheck && !excludedList.includes(getListID())) {
                log("May have failed to set speed, retrying just in case. Attempts remaining: " + (attempts - 1));
                keepTrying(attempts - 1);
            }
        }, attemptDelay);
    }


    function runScript() {
        // This function will create all the buttons and attempt to set the player speed accordingly.

        // Add the buttons if they are not already present.
        const ytRMenu = document.querySelector(".ytp-right-controls");
        if (!document.querySelector(".x1")) {
            log("Adding buttons");
            // Create the custom volume button if it is enabled.
            if (addVolumeButton) { ytRMenu.prepend(makeVolBtn()); }
            // Create the speed buttons.
            for (let i = buttonSpeeds.length - 1; i >= 0; i--) {
                if (buttonSpeeds[i] > 10 || buttonSpeeds[i] < 0.1) {
                    log("WARNING: Skipped adding a playback speed button, because its speed is not between 0.1 and 10");
                    continue;
                }
                ytRMenu.prepend(makeSpeedBtn(buttonSpeeds[i]));
            }
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
        const savedSpeed = localStorage.getItem("MPJSavedSpeed") || "x1";
        const savedBtn = document.querySelector("." + savedSpeed);
        const excludedList = localStorage.getItem("MPJExcludedList") || "List Starter,";

        if (localStorage.getItem("MPJAutoSpeed") == 1) {
            log("Automatic playback speed enabled, attempting to set playback speed to " + savedBtn.innerHTML);
            document.querySelector(".rem-button").style.borderColor = "#3ea6ff";
            // Check if the current playlist is not excluded.
            if (!excludedList.includes(getListID())) {
                // Only set speed if this is not a livestream.
                if (notLiveCheck) {
                    savedBtn.click();
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
            return mod < volumeStep * 0.25 ? vol - mod : vol - mod + volumeStep;
        }


        function makeSpeedBtn(speed) {
            // This function creates a speed button.
            const classname = ("x" + speed).replace(".", "");

            const btn = document.createElement("button");
            btn.className = "ytp-button mpj-button " + classname;
            btn.style.top = "-19px";
            btn.style.width = "auto";
            btn.style.opacity = ".5";
            btn.style.marginRight = "6px";
            btn.style.position = "relative";
            btn.style.fontSize = "14px";
            btn.innerHTML = speed + "x";

            btn.onmouseover = function() { this.style.opacity = 1; }
            btn.onmouseleave = function() { this.style.opacity = 0.5; }

            btn.onclick = function() {
                localStorage.setItem("MPJSavedSpeed", classname);
                document.querySelector("video").playbackRate = speed;
                resetBtns();
                this.style.fontWeight = "800";
                this.style.color = "#3ea6ff";
            }

            return btn;
        }


        function resetBtns() {
            // This function resets the style of every speed button.
            for (let i = 0; i < buttonSpeeds.length; i++) {
                const selector = document.querySelector("." + (("x" + buttonSpeeds[i]).replace(".", "")));
                selector.style.fontWeight = "normal";
                selector.style.color = "";
            }
        }


        function selectNormalSpeedBtn() {
            // This function visually selcts the normal (1x) speed button.
            resetBtns();
            const normalSpeedBtn = document.querySelector(".x1");
            normalSpeedBtn.style.fontWeight = "800";
            normalSpeedBtn.style.color = "#3ea6ff";
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
                if (localStorage.getItem("MPJAutoSpeed") == 1) {
                    localStorage.setItem("MPJAutoSpeed", 0);
                    remBtn.style.borderColor = "";
                }
                else{
                    localStorage.setItem("MPJAutoSpeed", 1);
                    localStorage.setItem("MPJSavedSpeed", ("x" + document.querySelector("video").playbackRate).replace(".", ""));
                    remBtn.style.borderColor = "#3ea6ff";
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
                    this.style.color = "";
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
