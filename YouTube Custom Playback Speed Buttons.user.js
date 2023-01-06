// ==UserScript==
// @name         YouTube Custom Playback Speed Buttons
// @namespace    MPJ_namespace
// @version      03-01-2023
// @description  Adds easily accessible playback speed buttons for selectable speeds up to 10x and an option to remember the speed. More features can be found in the script settings.
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

// Currently known bugs and/or planned changes:
// TODO: Adapt the script to use settings.setting structure, consider moving the settings object to the settings area and skipping the constants.

(function() {
    'use strict';

    // Script settings

    const enableLogging = false;
    // Whether or not the script will log messages to the browser's console. Default: false
    const maxAttempts = 10;
    // Number of times the script will attempt to run upon detecting a new watch page.
    // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
    const attemptDelay = 250;
    // Delay between attempts to run the script in milliseconds. Default: 250
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
    // If enabled, a custom volume button is added to the right of the playback speed buttons.
    // The button is different from YouTube's own in that it always displays the current volume.
    // Volume is adjusted by scrolling over the button and clicking it toggles mute.
    // The volume step size can be customized using the 'volumeStep' and 'fineStepsThreshold' settings.
    // This was added because I personally like discreet volume steps and YouTube's default 10% steps
    // are far too big. If you don't mind moving YouTube's slider then this option is of little value.
    // Default: false
    const volumeStep = 2;
    // The volume adjustment step size for the custom volume button. One scroll step increases or
    // decreases the volume by this amount. Note: Must be an integer (1 equals 1%). Default: 2
    const fineVolumeStepsThreshold = 10;
    // When using the custom volume button to adjust the volume below this threshold, the volume step
    // size is switched to 1%. This feature is intended to provide finer volume control when approaching
    // 0% volume. Note: Must be an integer (1 equals 1%). Default: 10
    const normalVolumeSliderStep = 10;
    // This option determines the volume adjustment step size for YouTube's normal volume slider.
    // When the scroll wheel is used to move the slider, the volume will be adjusted by this amount.
    // Note: Must be an integer (1 equals 1%). Default: 10
    const improveVolumeConsistency = false;
    // When enabled, this option improves the consistency of saved volume between different YouTube tabs.
    // This is achieved by setting the volume to the value stored in its cookie when first opening a tab.
    // For example: when using 'open in new tab' to open two new YouTube tabs back to back, changing the
    // volume on tab #1 will now also apply that change to tab #2 when it is first opened.
    // This feature does nothing on tabs that have already been opened at some point. Default: false
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


    function checkSettings(currSettings) {
        // This function allows the script settings to be kept between updates.
        if (checkedSettings) { return currSettings; }
        // Check if the current settings are identical to the loaded settings.
        const lastSettings = JSON.parse(localStorage.getItem("mpj-ytcpsb-last-settings") || JSON.stringify(currSettings));
        const currKeys = Object.keys(currSettings);
        const lastKeys = Object.keys(lastSettings);
        // Define a method that checks for inequality in the setting values.
        const notEqualCheck = key => {
            const currVal = currSettings[key];
            const lastVal = lastSettings[key];
            if (typeof lastVal != "object") { return currVal != lastVal; }
            return currVal.length != lastVal.length || lastVal.some((val, i) => val != currVal[i]);
        };
        if (!(currKeys.length != lastKeys.length || lastKeys.some(key => !currKeys.includes(key)) || lastKeys.some(key => notEqualCheck(key)))) {
            // The settings have not changed since the last run of the script. Load the saved settings profile as normal.
            log("No changes detected in the script settings");
            return JSON.parse(localStorage.getItem("mpj-ytcpsb-saved-settings") || JSON.stringify(currSettings));
        }
        // If the settings do not match, update lastSettings in localStorage and ask the user whether or not changes should be kept.
        localStorage.setItem("mpj-ytcpsb-last-settings", JSON.stringify(currSettings));
        ytInterface.pauseVideo();
        const settingsConfirmationMsg = (
            `YouTube Custom Playback Speed Buttons: Detected a change in the script's settings!\n\n` +
            `If you did not make this change, it was probably caused by a script update. YTCPSB has saved your previous settings.\n\n` +
            `Please select 'OK' to apply the changes to the settings, or select 'Cancel' to load your previous settings instead.`
        );
        if (confirm(settingsConfirmationMsg)) {
            // Overwrite the saved settings with the current settings.
            localStorage.setItem("mpj-ytcpsb-saved-settings", JSON.stringify(currSettings));
            // Apply the current settings.
            log(`Overwrote the saved settings with the current settings`);
            return currSettings;
        }
        // Load the saved settings.
        log(`Loaded the previously saved settings`);
        return JSON.parse(localStorage.getItem("mpj-ytcpsb-saved-settings") || JSON.stringify(currSettings));
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

        // Find the watch page player ('ytd-player') as a base for future querySelector calls, and the YouTube interface.
        // This fixes a long-standing bug that caused the script to malfunction when the 'inline-player' (used for video previews on YouTube Home) was loaded.
        // Calls to document.querySelector would find the 'inline-player' instead of the 'ytd-player', causing the script to run on the wrong player.
        ytdPlayer = document.getElementById("ytd-player");
        ytInterface = document.getElementById("movie_player");
        if (!ytdPlayer || !ytInterface) {
            log("Could not find the YouTube player and/or interface, attempts remaining: " + (attempts - 1));
            window.setTimeout(function() { keepTrying(attempts - 1); }, attemptDelay);
            return;
        }

        // Check for and load the correct script settings.
        settings = checkSettings(settings);
        checkedSettings = true;

        // Run some prechecks to ensure that all needed elements are present.
        ytRMenu = ytdPlayer.querySelector(".ytp-right-controls");
        corePlayer = ytdPlayer.querySelector("video");
        bottomGradient = cropBottomGradient ? ytdPlayer.querySelector(".ytp-gradient-bottom") : true;
        ytVolBtn = normalVolumeSliderStep != 10 ? document.querySelector(".ytp-volume-slider") : true;
        const notLivePrecheck = ytdPlayer.querySelector(".ytp-time-display");
        if (ytRMenu && corePlayer && bottomGradient && ytVolBtn && ytInterface && notLivePrecheck) { log("Passed prechecks"); }
        else {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(function() { keepTrying(attempts - 1); }, attemptDelay);
            return;
        }

        // After prechecks have been passed, run the main function.
        scriptMain();

        // Check if the script ran successfully after a short delay.
        // This code is mostly redundant, but on very rare occasions it can save the script from a failed execution.
        window.setTimeout(function() {
            const currentSpeed = corePlayer.playbackRate;
            const autoSpeed = JSON.parse(localStorage.getItem("mpj-auto-speed") || "false");
            const savedSpeed = JSON.parse(localStorage.getItem("mpj-saved-speed") || "1");
            const notLiveCheck = ytdPlayer.querySelector(".ytp-live") == null;
            const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");
            if (currentSpeed == 1 && autoSpeed && savedSpeed != 1 && notLiveCheck && !excludedList.includes(ytInterface.getPlaylistId())) {
                log("Detected a potential execution failure, retrying just in case. Attempts remaining: " + (attempts - 1));
                keepTrying(attempts - 1);
            }
        }, attemptDelay);
    }


    function setSpeed(speed) {
        // Sets the playback speed. Uses YouTube's built-in setPlaybackRate() function for speeds within its range.
        // The duration of closed captions or subtitles will be incorrect for speeds beyond the standard range of 0.25x to 2x.
        // Due to funkiness in setPlaybackRate(), the structure below is required to ensure that the playback speed is set correctly.
        if (speed < 0.25) {
            ytInterface.setPlaybackRate(0.25);
            corePlayer.playbackRate = speed;
        }
        else if (speed > 2) {
            ytInterface.setPlaybackRate(2);
            corePlayer.playbackRate = speed;
        }
        else {
            corePlayer.playbackRate = speed;
            ytInterface.setPlaybackRate(speed);
        }
        localStorage.setItem("mpj-saved-speed", JSON.stringify(speed));
    }


    function setVol(volume, muted) {
        // Sets the player volume and/or mute state. Also manually updates YouTube's volume cookie.
        const raw = localStorage.getItem("yt-player-volume") || `{"data":"{\\"volume\\":20,\\"muted\\":false}","expiration":0,"creation":0}`;
        const cookie = JSON.parse(raw);
        const data = JSON.parse(cookie.data);
        // Only adjust the mute state or volume if the arguments are of the correct type.
        if (typeof muted == "boolean") {
            if (muted) { ytInterface.mute(); }
            else { ytInterface.unMute(); }
            data.muted = muted;
        }
        if (typeof volume == "number") {
            ytInterface.setVolume(volume);
            data.volume = volume;
        }
        else if (volume == "stored") {
            // If "stored" was passed in the 'volume' argument, set the volume and mute state to their stored values.
            if (data.muted) { ytInterface.mute(); }
            else { ytInterface.unMute(); }
            ytInterface.setVolume(data.volume);
            // Exit the function, because the cookie data does not change in this case.
            return;
        }
        cookie.data = JSON.stringify(data);
        cookie.creation = Date.now();
        cookie.expiration = cookie.creation + 2592000000;
        localStorage.setItem("yt-player-volume", JSON.stringify(cookie));
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
        volBtn.innerHTML = ytInterface.isMuted() ? "M" : (ytInterface.getVolume() + "%");

        volBtn.onmouseover = function() { this.style.opacity = 1; }
        volBtn.onmouseleave = function() { this.style.opacity = 0.5; }

        volBtn.onclick = function() {
            if (ytInterface.isMuted()) {
                setVol(undefined, false);
                this.innerHTML = ytInterface.getVolume() + "%";
            }
            else {
                setVol(undefined, true);
                this.innerHTML = "M";
            }
        }

        volBtn.onwheel = function(event) {
            event.preventDefault();
            // Do nothing if the volume is muted.
            if (ytInterface.isMuted()) { return; }
            // Find the new volume value.
            const currVol = ytInterface.getVolume();
            let newVol;
            if (event.deltaY < 0) { newVol = Math.min(currVol + (currVol < fineVolumeStepsThreshold ? 1 : volumeStep), 100); }
            else { newVol = Math.max(currVol - (currVol <= fineVolumeStepsThreshold ? 1 : volumeStep), 0); }
            // Set the new volume.
            setVol(newVol);
            this.innerHTML = newVol + "%";
        }

        buttons.volBtn = volBtn;
        return volBtn;
    }


    function makeScrollableSpeedBtn() {
        // This function creates the scrollable speed button.
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
            const normalSpeedBtn = buttons.speedBtns["1.00"];
            if (normalSpeedBtn) { normalSpeedBtn.click(); }
            else {
                setSpeed(1);
                localStorage.setItem("mpj-saved-speed", JSON.stringify(1));
                resetBtns(1);
                this.style.color = activeButtonColor;
            }
        }

        sSpeedBtn.onwheel = function(event) {
            event.preventDefault();
            const currSpeed = corePlayer.playbackRate;
            let newSpeed;
            if (event.deltaY < 0) { newSpeed = Math.min(currSpeed + speedStep, 10); }
            else { newSpeed = Math.max(currSpeed - speedStep, 0.1); }
            // Convert floats with very small decimal values to integers.
            const newSpeedRounded = Math.round(newSpeed);
            if (Math.abs(newSpeed - newSpeedRounded) < 0.001) { newSpeed = newSpeedRounded; }
            // Update buttons and the playback speed.
            const speedBtn = buttons.speedBtns[newSpeed.toFixed(2)];
            if (speedBtn) { speedBtn.click(); }
            else {
                setSpeed(newSpeed);
                localStorage.setItem("mpj-saved-speed", JSON.stringify(newSpeed));
                resetBtns(newSpeed);
                this.style.color = activeButtonColor;
            }
        }

        buttons.sSpeedBtn = sSpeedBtn;
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
            setSpeed(speed);
            localStorage.setItem("mpj-saved-speed", JSON.stringify(speed));
            resetBtns(speed);
            this.style.fontWeight = "800";
            this.style.color = activeButtonColor;
        }

        buttons.speedBtns[speed.toFixed(2)] = btn;
        return btn;
    }


    function resetBtns(speed) {
        // This function resets the style of every speed button.
        for (const buttonSpeed of buttonSpeeds) {
            const btn = buttons.speedBtns[buttonSpeed.toFixed(2)];
            btn.style.fontWeight = "normal";
            btn.style.color = normalButtonColor;
        }
        if (addScrollableSpeedButton) {
            const sSpeedBtn = buttons.sSpeedBtn;
            sSpeedBtn.innerHTML = speed < 10 ? speed.toFixed(2) + "x" : "10.0x";
            sSpeedBtn.style.color = normalButtonColor;
        }
    }


    function selectNormalSpeedBtn() {
        // This function visually selects the normal (1x) speed button.
        resetBtns(1);
        const normalSpeedBtn = buttons.speedBtns["1.00"];
        if (normalSpeedBtn) {
            normalSpeedBtn.style.fontWeight = "800";
            normalSpeedBtn.style.color = activeButtonColor;
        }
    }


    function fixSpeedBtnWidth(attempts) {
        // This function changes the width of every speed button to a fixed value.
        for (const buttonSpeed of buttonSpeeds) {
            const btn = buttons.speedBtns[buttonSpeed.toFixed(2)];
            // If offsetWidth is undefined, retry after a short delay.
            if (!btn.offsetWidth) {
                // Stop if attempts have run out.
                if (attempts < 2) {
                    log("Ran out of attempts while trying to compute speed button widths");
                    return;
                }
                log("Unable to compute speed button widths. Attempts remaining: " + (attempts - 1));
                window.setTimeout(() => fixSpeedBtnWidth(attempts - 1), attemptDelay);
                return;
            }
            btn.style.width = (btn.offsetWidth + 1) + "px";
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
            if (JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
                localStorage.setItem("mpj-auto-speed", JSON.stringify(false));
                this.style.borderColor = "";
            }
            else{
                localStorage.setItem("mpj-auto-speed", JSON.stringify(true));
                localStorage.setItem("mpj-saved-speed", JSON.stringify(corePlayer.playbackRate));
                this.style.borderColor = activeButtonColor;
            }
        }

        buttons.remBtn = remBtn;
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
            const listID = ytInterface.getPlaylistId();
            const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");
            const index = excludedList.indexOf(listID);
            if (index > -1) {
                excludedList.splice(index, 1);
                this.style.color = normalButtonColor;
            }
            else {
                excludedList.push(listID);
                this.style.color = "#ff0000";
            }
            localStorage.setItem("mpj-excluded-list", JSON.stringify(excludedList));
        }

        buttons.excludeBtn = excludeBtn;
        return excludeBtn;
    }


    function scriptMain() {
        // This function will carry out the script's main actions.

        // If the option is set, crop the bottom gradient.
        if (cropBottomGradient) {
            bottomGradient.style.maxHeight = bottomGradientMaxHeight;
            log("Cropped bottom gradient");
        }

        // If the option is set, modify the normal volume button.
        if (normalVolumeSliderStep != 10) {
            ytVolBtn.onwheel = function(event) {
                event.preventDefault();
                event.stopImmediatePropagation();
                // Find the new volume.
                const currVol = ytInterface.getVolume();
                let newVol;
                if (event.deltaY < 0) { newVol = Math.min(currVol + normalVolumeSliderStep, 100); }
                else { newVol = Math.max(currVol - normalVolumeSliderStep, 0); }
                // Set the new volume.
                setVol(newVol);
                const volBtn = buttons.volBtn;
                if (volBtn) { volBtn.innerHTML = newVol + "%"; }
            }
            log("Modified normal volume button");
        }

        // Add the buttons if they are not already present.
        if (!document.querySelector(".rem-button")) {
            log("Adding buttons");
            // If the option is enabled, first set the volume to the value stored in its cookie.
            // This code is placed here to ensure it only runs on a fresh YouTube player instance.
            if (improveVolumeConsistency) {
                // Additional condition that avoids un-doing the mute action by 'Mute YouTube Trailers' (one of my other scripts).
                const mutedTrailers = JSON.parse(localStorage.getItem("mpj-muted-trailers") || "[]");
                if (!mutedTrailers.some(trailer => trailer.id == JSON.parse(ytInterface.getDebugText()).debug_videoId)) { setVol("stored"); }
            }
            // Create the custom volume button if it is enabled.
            if (addVolumeButton) { ytRMenu.prepend(buttons.volBtn ? buttons.volBtn : makeVolBtn()); }
            // Create the scrollable playback speed button if it is enabled.
            if (addScrollableSpeedButton) { ytRMenu.prepend(buttons.sSpeedBtn ? buttons.sSpeedBtn : makeScrollableSpeedBtn()); }
            // Create the speed buttons.
            for (let i = buttonSpeeds.length - 1; i >= 0; i--) {
                const buttonSpeed = buttonSpeeds[i];
                if (buttonSpeed > 10 || buttonSpeed < 0.1) {
                    log("WARNING: Skipped adding a playback speed button because its speed is not between 0.1 and 10");
                    continue;
                }
                ytRMenu.prepend(buttons.speedBtns[buttonSpeed.toFixed(2)] ? buttons.speedBtns[buttonSpeed.toFixed(2)] : makeSpeedBtn(buttonSpeed));
            }
            // Once the speed buttons have been added, change their widths to fixed values to prevent them from shifting due to style changes.
            fixSpeedBtnWidth(maxAttempts);
            // Create the remember speed button.
            ytRMenu.prepend(buttons.remBtn ? buttons.remBtn : makeRemBtn());
        }
        // Update the value of the volume button if it was already present. This may be redundant, should be tested.
        else if (addVolumeButton) { buttons.volBtn.innerHTML = ytInterface.isMuted() ? "M" : (ytInterface.getVolume() + "%"); }

        // Add or remove the exclude playlist button.
        const excludeBtnSelector = document.querySelector(".exclude-button");
        // Check if the current page is a playlist.
        if (document.URL.includes("&list=")) {
            // If the button is not present, add the button.
            if (!excludeBtnSelector) { ytRMenu.prepend(buttons.excludeBtn ? buttons.excludeBtn : makeExcludeBtn()); }
        }
        // If the button is present but the current page is not a playlist, remove the button.
        else if (excludeBtnSelector) { excludeBtnSelector.remove(); }

        // Set the player speed according to the saved speed.
        const notLiveCheck = ytdPlayer.querySelector(".ytp-live") == null;
        const savedSpeed = JSON.parse(localStorage.getItem("mpj-saved-speed") || "1");
        const savedBtn = buttons.speedBtns[savedSpeed.toFixed(2)];
        const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");

        // If automatic playback speed is disabled, the script stops here.
        if (!JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
            log("Automatic playback speed disabled, skipping");
            selectNormalSpeedBtn();
            return;
        }
        log("Automatic playback speed enabled, attempting to set playback speed to " + savedSpeed.toFixed(2) + "x");
        buttons.remBtn.style.borderColor = activeButtonColor;
        // Check whether or not the current playlist is excluded.
        if (excludedList.includes(ytInterface.getPlaylistId())) {
            // If the current playlist is excluded, select the 1x button without changing the saved speed.
            log("Current playlist is excluded from automatic playback speed, skipping");
            selectNormalSpeedBtn();
            buttons.excludeBtn.style.color = "#ff0000";
            return;
        }
        // Only set speed if this is not a livestream.
        if (!notLiveCheck) {
            // If this is a livestream, select the 1x button without changing the saved speed.
            log("Detected livestream, not setting playback speed");
            selectNormalSpeedBtn();
            return;
        }
        // If the script has made it to this point, it is time to set the playback speed.
        if (savedBtn) { savedBtn.click(); }
        else {
            setSpeed(savedSpeed);
            resetBtns(savedSpeed);
            buttons.sSpeedBtn.style.color = activeButtonColor;
        }
        log("Set speed successfully");
    }


    // Code to start the above functions.
    log("YouTube Custom Playback Speed Buttons by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let checkedSettings = false, settings = {
        enableLogging: enableLogging,
        maxAttempts: maxAttempts,
        attemptDelay: attemptDelay,
        buttonSpeeds: buttonSpeeds,
        addScrollableSpeedButton: addScrollableSpeedButton,
        speedStep: speedStep,
        addVolumeButton: addVolumeButton,
        volumeStep: volumeStep,
        fineVolumeStepsThreshold: fineVolumeStepsThreshold,
        normalVolumeSliderStep: normalVolumeSliderStep,
        improveVolumeConsistency: improveVolumeConsistency,
        cropBottomGradient: cropBottomGradient,
        bottomGradientMaxHeight: bottomGradientMaxHeight,
        normalButtonColor: normalButtonColor,
        activeButtonColor: activeButtonColor
    };
    let buttons = { speedBtns: {} }, ytdPlayer, ytInterface, ytRMenu, corePlayer, bottomGradient, ytVolBtn;
    // Add an event listener for YouTube's built-in navigate-finish event.
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
