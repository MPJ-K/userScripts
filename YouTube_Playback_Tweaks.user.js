// ==UserScript==
// @name         YouTube Playback Tweaks
// @namespace    MPJ_namespace
// @version      2024.04.08.01
// @description  Contains various tweaks to improve the YouTube experience, including customizable playback speed and volume controls.
// @author       MPJ
// @match        https://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/YouTube_Playback_Tweaks.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/YouTube_Playback_Tweaks.user.js
// ==/UserScript==

/**
 * README
 * 
 * This script was originally based off "YouTube Faster Playback Speed Buttons" by Cihan Tuncer.
 * It retains some code and functions from the original script, in addition to the button styling (I know almost no CSS).
 * The script has since been heavily modified in the form of rewritten code, additional functionality and increased robustness.
 * I am an amateur JS programmer working on scripts as a hobby, this being one of my first projects. The code has many comments
 * explaining my implementation.
 * 
 * IMPORTANT
 * 
 * This script uses a system that can preserve the script's settings between script updates. Making changes to the settings
 * area below will cause a prompt to appear when the script is next executed, asking the user to confirm the changes to
 * the settings. A script update will reset the settings area, triggering the prompt. The user can then choose to dismiss
 * the changes to the settings (caused by the update) and load their previous settings instead. It is important to note that,
 * after dismissing any changes to the settings, the settings area will no longer match the settings actually used by the
 * script. If the user later wants to adjust their settings, they will need to reconfigure the entire settings area and
 * then confirm the changes on the next script start. This feature uses localStorage, which means that clearing site data
 * will also clear any saved settings.
**/

// Currently known bugs and/or planned changes:
// None

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether or not the script will log messages to the browser's console. Default: false
        maxAttempts: 20,
        // Number of times the script will attempt to run upon detecting a new watch page.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 20
        attemptDelay: 250,
        // Delay between attempts to run the script in milliseconds. Default: 250

        buttonSpeeds: [1, 1.75, 2, 2.5, 3],
        // Specifies the playback speed buttons added to the player. You can add as many buttons as you want,
        // but the speed must be between 0.1 and 10 (these limits are intrinsic to YouTube's video player).
        // The buttons will be added in the specified order. Values must be entered in array form.
        // Default: [1, 1.75, 2, 2.5, 3]
        addScrollableSpeedButton: false,
        // Enabling this option will add a special playback speed button that allows fine playback speed
        // control by scrolling over the button. Clicking the button sets the playback speed to 1x.
        // Regular speed buttons continue to work as normal, but can also be disabled entirely by setting
        // buttonSpeeds: [].
        // The playback speed step size can be customized using the 'speedStep' setting.
        // Default: false
        speedStep: 0.25,
        // The playback speed adjustment stepsize for the scrollable playback speed button. One scroll step
        // increases or decreases the playback speed by this amount. Default: 0.25
        resetSpeedOnNewSession: false,
        // When enabled, the playback speed will always be set to 1x at the beginning of a new browser
        // session. This does not affect the state of the remember playback speed button, but does
        // overwrite the saved speed to 1x. A browser session ends when all tabs have been closed.
        // Note: This setting uses a temporary cookie to function. The cookie is automatically deleted by
        // the browser whenever a session ends. Default: false
        automaticPlaybackSpeedMinimumVideoDuration: 0,
        // Saved playback speed will only be applied on videos with a duration greater than or equal to
        // this value. Must be given in seconds. Default: 0

        addVolumeButton: false,
        // If enabled, a custom volume button is added to the right of the playback speed buttons.
        // The button is different from YouTube's own in that it always displays the current volume.
        // Volume is adjusted by scrolling over the button and clicking it toggles mute.
        // The volume step size can be customized using the 'volumeStep' and 'fineStepsThreshold' settings.
        // This was added because I personally like discreet volume steps and YouTube's default 10% steps
        // are far too big. If you don't mind moving YouTube's slider then this option is of little value.
        // Default: false
        volumeStep: 2,
        // The volume adjustment step size for the custom volume button. One scroll step increases or
        // decreases the volume by this amount. Note: Must be an integer (1 equals 1%). Default: 2
        fineVolumeStepsThreshold: 10,
        // When using the custom volume button to adjust the volume below this threshold, the volume step
        // size is switched to 1%. This feature is intended to provide finer volume control when approaching
        // 0% volume. Note: Must be an integer (1 equals 1%). Default: 10
        normalVolumeSliderStep: 10,
        // This option determines the volume adjustment step size for YouTube's normal volume slider.
        // When the scroll wheel is used to move the slider, the volume will be adjusted by this amount.
        // Note: Must be an integer (1 equals 1%). Default: 10
        improveVolumeConsistency: false,
        // When enabled, this option improves the consistency of saved volume between different YouTube tabs.
        // For every new YouTube instance (e.g. a new browser tab), the first video that plays will have its
        // volume set to the value stored in localStorage.
        // This feature does NOT syncrhonize the volume at all times. It is useful for the following scenario:
        // When using 'open in new tab' to open two (or more) new YouTube watch pages back to back, changing
        // the volume on tab #1 will now also apply that change to tab #2 when opened for the first time.
        // Default: false (enabling recommended)
        maxInitialVolume: 100,
        // For every new YouTube instance (e.g. a new browser tab), the first video that plays will have its
        // volume capped to this value. Any following videos played in the same tab are not affected.
        // If improveVolumeConsistency is enabled, the volume it loads will also be capped.
        // Note: Must be an integer (1 equals 1%). Default: 100

        enableScrollToSkip: false,
        // When enabled, scrolling while hovering over the video time display will skip forwards and backwards
        // through the video, similar to using the left and right arrow keys. Default: false

        automaticFixedResolution: "",
        // If set, the script will automatically fix the specified resolution on the YouTube player, thereby
        // disabling 'Auto' resolution. For videos where the specified resolution is not available, the
        // script will fix the highest available resolution instead. Must be a valid resolution in string
        // format, for example: "1080p". To disable this feature, use the empty string ("").
        // The resolution can still be changed manually. Default: ""
        automaticTheaterMode: false,
        // When this option is enabled, the script will automatically turn on theater mode (a.k.a. cinema
        // mode). Theater mode can still be disabled manually. Default: false

        cropBottomGradient: false,
        // Setting this to true crops the darkening gradient at the bottom of the player that appears
        // when the bottom button bar is shown (mouse hovering over the player). Default: false
        bottomGradientMaxHeight: "21px",
        // When cropBottomGradient is enabled, this setting specifies the height to which the bottom gradient
        // will be cropped. Must be a string with a height value understood by style.maxHeight. Default: "21px"

        automaticallyDisableAutonav: false,
        // If enabled, the script will automatically ensure that autonav is disabled. Autonav is also known as
        // autoplay, referring to YouTube's feature that automatically plays another video when the current
        // one ends. Default: false

        enableKeyboardShortcuts: false,
        // When enabled, the playback speed and volume can be adjusted using keyboard shortcuts.
        // The playback speed and volume step sizes can be customized using the 'speedStep' and 'volumeStep'
        // settings respectively. The shortcuts also work with the 'fineVolumeStepsThreshold' setting.
        // The key combinations can be set in the settings below here. Default: false (enabling recommended)
        speedIncrementKey: "ArrowRight",
        speedDecrementKey: "ArrowLeft",
        speedModifierKeys: ["shiftKey"],
        volumeIncrementKey: "ArrowUp",
        volumeDecrementKey: "ArrowDown",
        volumeModifierKeys: ["shiftKey"],
        // These settings specify the key combinations used for the keyboard shortcuts.
        // See the following URL for valid key names:
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
        // Setting a key to the empty string ("") will disable that keyboard shortcut.
        // Modifier keys must be specified using an array. All modifier keys present in the array, and none
        // of the others, must be held down to activate their respective shortcuts. Valid modifiers are
        // "altKey", "ctrlKey", "shiftKey" or "metaKey". Use [] (the empty array) for no modifier.
        // Defaults:
        // speedIncrementKey: "ArrowRight", speedDecrementKey: "ArrowLeft", speedModifierKeys: ["shiftKey"],
        // volumeIncrementKey: "ArrowUp", volumeDecrementKey: "ArrowDown", volumeModifierKeys: ["shiftKey"]

        normalButtonColor: "",
        // The color to use for all buttons in their normal (inactive) state.
        // Must be some value understood by style.color. Default: ""
        activeButtonColor: "#3ea6ff"
        // The color to use for all buttons (except the exclude playlist button) in their active state.
        // Must be some value understood by style.color. Default: "#3ea6ff"
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (settings.enableLogging) { console.log("[MPJ|YTPT] " + message); }
    }


    function checkSettings(currSettings) {
        // This function allows the script settings to be kept between updates.
        const lastSettings = localStorage.getItem("mpj-ytpt-last-settings");
        if (!lastSettings) {
            // If the localStorage data for the previous settings does not exist, create it from the current settings.
            localStorage.setItem("mpj-ytpt-last-settings", JSON.stringify(currSettings));
            log("No settings history found, skipping the comparison");
            return currSettings;
        }
        // Define a method that will load the saved settings and ensure that they are compatible.
        const loadSettings = () => {
            const loadedSettings = JSON.parse(localStorage.getItem("mpj-ytpt-saved-settings") || JSON.stringify(currSettings));
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
        localStorage.setItem("mpj-ytpt-last-settings", JSON.stringify(currSettings));
        ytInterface.pauseVideo();
        const settingsConfirmationMsg = (
            `YouTube Playback Tweaks:\nDetected a change in the script's settings!\n\n` +
            `If you did not make this change, it was probably caused by a script update. YTPT has saved your previous settings.\n\n` +
            `Please select 'OK' to apply the changes to the settings, or select 'Cancel' to load your previous settings instead.`
        );
        if (confirm(settingsConfirmationMsg)) {
            // Overwrite the saved settings with the current settings.
            localStorage.setItem("mpj-ytpt-saved-settings", JSON.stringify(currSettings));
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

        // Find the watch page player ('ytd-player') as a base for future querySelector calls, and the YouTube interface.
        // This fixes a long-standing bug that caused the script to malfunction when the 'inline-player' (used for video previews on YouTube Home) was loaded.
        // Calls to document.querySelector would find the 'inline-player' instead of the 'ytd-player', causing the script to run on the wrong player.
        ytdPlayer = document.getElementById("ytd-player");
        ytInterface = document.getElementById("movie_player");
        if (!ytdPlayer || !ytInterface) {
            log("Could not find the YouTube player and/or interface, attempts remaining: " + (attempts - 1));
            window.setTimeout(function () { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }

        // Check for and load the correct script settings.
        if (!checkedSettings) { settings = checkSettings(settings); }
        checkedSettings = true;

        // Run some prechecks to ensure that all needed elements are present.
        ytRMenu = ytdPlayer.querySelector(".ytp-right-controls");
        corePlayer = ytdPlayer.querySelector("video");
        bottomGradient = settings.cropBottomGradient ? ytdPlayer.querySelector(".ytp-gradient-bottom") : true;
        ytVolPanel = (settings.addVolumeButton || settings.normalVolumeSliderStep != 10) ? ytdPlayer.querySelector(".ytp-volume-panel") : true;
        ytPageMgr = document.getElementsByTagName("ytd-watch-flexy")[0];
        liveBtn = ytdPlayer.querySelector(".ytp-live-badge.ytp-button");
        ytTimeDisplay = ytdPlayer.querySelector(".ytp-time-display");  // Doubles as a precheck for notLive!
        ytAutonavButton = document.querySelector(".ytp-autonav-toggle-button");
        const ytAutonavButtonPrecheck = (settings.automaticallyDisableAutonav && !getPlaylistId()) ? ytAutonavButton.checkVisibility() : true;
        const prechecks = [ytRMenu, corePlayer, bottomGradient, ytVolPanel, ytPageMgr, liveBtn, ytTimeDisplay, ytAutonavButtonPrecheck];
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

        // After prechecks have been passed, run the main function.
        scriptMain();
        // Create a session cookie if resetSpeedOnNewSession is enabled.
        if (settings.resetSpeedOnNewSession) { setCookie(sessionCookie, "true"); }

        // Check if the script ran successfully after a short delay.
        // This code is mostly redundant, but on very rare occasions it can save the script from a failed execution.
        // As of version 2023.11.16.01, this code has been disabled. If it is ever re-enabled, it must be adapted for
        // settings.automaticPlaybackSpeedMinimumVideoDuration!
        // window.setTimeout(function () {
        //     const currentSpeed = corePlayer.playbackRate;
        //     const autoSpeed = JSON.parse(localStorage.getItem("mpj-auto-speed") || "false");
        //     const savedSpeed = JSON.parse(localStorage.getItem("mpj-saved-speed") || "1");
        //     const notLiveCheck = ytdPlayer.querySelector(".ytp-live") == null;
        //     const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");
        //     if (currentSpeed == 1 && autoSpeed && savedSpeed != 1 && notLiveCheck && !excludedList.includes(getPlaylistId())) {
        //         log("Detected a potential execution failure, retrying just in case. Attempts remaining: " + (attempts - 1));
        //         keepTrying(attempts - 1);
        //     }
        // }, settings.attemptDelay);
    }


    function setCookie(name, value) {
        // Sets a cookie that expires immediately once the browser is closed.
        document.cookie = `${name}=${value};`;
    }


    function getCookie(name) {
        // Returns the value of the cookie with the specified name, or undefined if the cookie does not exist.
        const cookie = decodeURIComponent(document.cookie).split("; ").find(c => c.startsWith(name));
        if (!cookie) { return undefined; }
        return cookie.substring(cookie.indexOf("=") + 1);
    }


    function getPlaylistId() {
        // Returns the ID of the current playlist or the empty string if no playlist is loaded.
        const listId = new URL(document.location).searchParams.get("list");
        return listId ? listId : "";
    }


    function setSpeed(speed, relative = false, enforce = false) {
        // Sets the playback speed. Uses YouTube's built-in setPlaybackRate() function for speeds within its range.
        // The duration of closed captions or subtitles will be incorrect for speeds outside the standard range of 0.25x to 2x.

        // Avoid setting the playback speed during live playback.
        if (liveBtn.getAttribute("disabled") === "" && !enforce) {
            log("Blocked setSpeed because playback is currently live");
            return;
        }

        // When the 'relative' argument is true, the value passed in the 'speed' argument will be added to the current playback speed.
        const getRelativeSpeed = () => {
            const relativeSpeed = Math.max(Math.min(corePlayer.playbackRate + speed, 10), 0.1);
            // Convert floats with very small decimal values to integers.
            const relativeSpeedRounded = Math.round(relativeSpeed);
            return (Math.abs(relativeSpeed - relativeSpeedRounded) < 0.001 ? relativeSpeedRounded : relativeSpeed);
        }
        const newSpeed = relative ? getRelativeSpeed() : speed;

        // Due to funkiness in setPlaybackRate(), the below structure is required to ensure that the playback speed is set correctly.
        if (newSpeed < 0.25) {
            ytInterface.setPlaybackRate(0.25);
            corePlayer.playbackRate = newSpeed;
        }
        else if (newSpeed > 2) {
            ytInterface.setPlaybackRate(2);
            corePlayer.playbackRate = newSpeed;
        }
        else {
            corePlayer.playbackRate = newSpeed;
            ytInterface.setPlaybackRate(newSpeed);
        }
        // Save the new speed to localStorage.
        localStorage.setItem("mpj-saved-speed", JSON.stringify(newSpeed));
        // Visually update all present buttons.
        resetBtns(newSpeed);
        const speedBtn = buttons.speedBtns[newSpeed.toFixed(2)];
        if (speedBtn) {
            speedBtn.style.fontWeight = "800";
            speedBtn.style.color = settings.activeButtonColor;
        }
        else if (settings.addScrollableSpeedButton) { buttons.sSpeedBtn.style.color = settings.activeButtonColor; }
    }


    function setVol(volume, muted, relative = true) {
        // Sets the player volume and/or mute state. Also manually updates YouTube's volume localStorage entry.
        const raw = localStorage.getItem("yt-player-volume") || `{"data":"{\\"volume\\":20,\\"muted\\":false}","expiration":0,"creation":0}`;
        const entry = JSON.parse(raw);
        const data = JSON.parse(entry.data);
        // Only adjust the mute state or volume if the arguments are of the correct type.
        if (typeof muted == "boolean") {
            if (muted) { ytInterface.mute(); }
            else { ytInterface.unMute(); }
            data.muted = muted;
        }
        if (typeof volume == "number") {
            const getRelativeVolume = () => {
                const currVol = ytInterface.getVolume();
                if (volume > 0) { return Math.min(currVol + (currVol < settings.fineVolumeStepsThreshold ? 1 : volume), 100); }
                return Math.max(currVol + (currVol <= settings.fineVolumeStepsThreshold ? -1 : volume), 0);
            }
            const newVolume = relative ? getRelativeVolume() : volume;
            ytInterface.setVolume(newVolume);
            data.volume = newVolume;
        }
        else if (volume == "stored") {
            // If "stored" was passed in the 'volume' argument, set the volume and mute state to their stored values.
            if (data.muted) { ytInterface.mute(); }
            else { ytInterface.unMute(); }
            ytInterface.setVolume(Math.min(data.volume, settings.maxInitialVolume));
            // Exit the function, because the entry's data does not change in this case.
            return;
        }
        entry.data = JSON.stringify(data);
        entry.creation = Date.now();
        entry.expiration = entry.creation + 2592000000;
        localStorage.setItem("yt-player-volume", JSON.stringify(entry));
    }


    function keyPressHandler(event) {
        // This function interprets keypresses by performing actions related to specific key combinations.

        // First check if the correct modifier keys are active.
        const modifiers = ["altKey", "ctrlKey", "shiftKey", "metaKey"];
        const speedModifiers = modifiers.every(key => settings.speedModifierKeys.includes(key) ? event[key] : !event[key]);
        const volumeModifiers = modifiers.every(key => settings.volumeModifierKeys.includes(key) ? event[key] : !event[key]);

        // Now check if the pressed key matches one of the keys specified in the script settings.
        switch (event.key) {
            case settings.speedIncrementKey:
                if (!speedModifiers) { break; }
                setSpeed(settings.speedStep, true);
                ytInterface.wakeUpControls();
                event.preventDefault();
                event.stopImmediatePropagation();
                break;
            case settings.speedDecrementKey:
                if (!speedModifiers) { break; }
                setSpeed(-settings.speedStep, true);
                ytInterface.wakeUpControls();
                event.preventDefault();
                event.stopImmediatePropagation();
                break;
            case settings.volumeIncrementKey:
                if (!volumeModifiers) { break; }
                setVol(settings.volumeStep);
                ytInterface.wakeUpControls();
                event.preventDefault();
                event.stopImmediatePropagation();
                break;
            case settings.volumeDecrementKey:
                if (!volumeModifiers) { break; }
                setVol(-settings.volumeStep);
                ytInterface.wakeUpControls();
                event.preventDefault();
                event.stopImmediatePropagation();
                break;
        }
    }


    function setPlaybackQuality(resolution) {
        // This function sets the playback quality (resolultion) of the YouTube player.
        const qualityDict = {
            "144p": "tiny", "240p": "small", "360p": "medium", "480p": "large",
            "720p": "hd720", "1080p": "hd1080", "1440p": "hd1440", "2160p": "hd2160", "2880p": "hd2880", "4320p": "highres"
        };
        const quality = qualityDict[resolution];
        // If the desired quality is not available, then it must be higher than the maximum available quality.
        // In that case, set the best available quality level.
        const availableQualityLevels = ytInterface.getAvailableQualityLevels();
        ytInterface.setPlaybackQualityRange(availableQualityLevels.includes(quality) ? quality : availableQualityLevels[0]);
        log("Playback quality set to " + quality);
    }


    function setTheaterMode(state) {
        // This function either enables or disables theater mode according to the boolean 'state' argument.
        ytPageMgr.setTheaterModeRequested(state);
        log((state ? "Enabled" : "Disabled") + " theater mode");
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
        volBtn.innerHTML = ytInterface.isMuted() ? "M" : `${ytInterface.getVolume()}%`;

        volBtn.onmouseover = function () { this.style.opacity = 1; }
        volBtn.onmouseleave = function () { this.style.opacity = 0.5; }

        volBtn.onclick = function () {
            if (ytInterface.isMuted()) { setVol(undefined, false); }
            else { setVol(undefined, true); }
        }

        volBtn.onwheel = function (event) {
            event.preventDefault();
            ytInterface.wakeUpControls();
            // Do nothing if the volume is muted.
            if (ytInterface.isMuted()) { return; }
            // Determine the scroll direction and set the volume accordingly.
            if (event.deltaY < 0) { setVol(settings.volumeStep); }
            else { setVol(-settings.volumeStep); }
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

        sSpeedBtn.onmouseover = function () { this.style.opacity = 1; }
        sSpeedBtn.onmouseleave = function () { this.style.opacity = 0.5; }

        sSpeedBtn.onclick = function () { setSpeed(1); }

        sSpeedBtn.onwheel = function (event) {
            event.preventDefault();
            ytInterface.wakeUpControls();
            // Determine the scroll direction and set the playback speed accordingly.
            if (event.deltaY < 0) { setSpeed(settings.speedStep, true); }
            else { setSpeed(-settings.speedStep, true); }
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

        btn.onmouseover = function () { this.style.opacity = 1; }
        btn.onmouseleave = function () { this.style.opacity = 0.5; }

        btn.onclick = function () { setSpeed(speed); }

        buttons.speedBtns[speed.toFixed(2)] = btn;
        return btn;
    }


    function resetBtns(speed) {
        // This function resets the style of every speed button.
        for (const buttonSpeed of settings.buttonSpeeds) {
            const btn = buttons.speedBtns[buttonSpeed.toFixed(2)];
            btn.style.fontWeight = "normal";
            btn.style.color = settings.normalButtonColor;
        }
        if (settings.addScrollableSpeedButton) {
            const sSpeedBtn = buttons.sSpeedBtn;
            sSpeedBtn.innerHTML = speed < 10 ? speed.toFixed(2) + "x" : "10.0x";
            sSpeedBtn.style.color = settings.normalButtonColor;
        }
    }


    function selectNormalSpeedBtn() {
        // This function visually selects the normal (1x) speed button.
        resetBtns(1);
        const normalSpeedBtn = buttons.speedBtns["1.00"];
        if (normalSpeedBtn) {
            normalSpeedBtn.style.fontWeight = "800";
            normalSpeedBtn.style.color = settings.activeButtonColor;
        }
    }


    function fixSpeedBtnWidth(attempts) {
        // This function changes the width of every speed button to a fixed value.
        for (const buttonSpeed of settings.buttonSpeeds) {
            const btn = buttons.speedBtns[buttonSpeed.toFixed(2)];
            // If offsetWidth is undefined, retry after a short delay.
            if (!btn.offsetWidth) {
                // Stop if attempts have run out.
                if (attempts < 2) {
                    log("Ran out of attempts while trying to compute speed button widths");
                    return;
                }
                log("Unable to compute speed button widths. Attempts remaining: " + (attempts - 1));
                window.setTimeout(() => fixSpeedBtnWidth(attempts - 1), settings.attemptDelay);
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

        remBtn.onmouseover = function () { this.style.opacity = 1; }
        remBtn.onmouseleave = function () { this.style.opacity = 0.5; }

        remBtn.onclick = function () {
            if (JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
                localStorage.setItem("mpj-auto-speed", JSON.stringify(false));
                this.style.borderColor = "";
            }
            else {
                localStorage.setItem("mpj-auto-speed", JSON.stringify(true));
                localStorage.setItem("mpj-saved-speed", JSON.stringify(corePlayer.playbackRate));
                this.style.borderColor = settings.activeButtonColor;
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

        excludeBtn.onmouseover = function () { this.style.opacity = 1; }
        excludeBtn.onmouseleave = function () { this.style.opacity = 0.5; }

        excludeBtn.onclick = function () {
            const listId = getPlaylistId();
            const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");
            const index = excludedList.indexOf(listId);
            if (index > -1) {
                excludedList.splice(index, 1);
                this.style.color = settings.normalButtonColor;
            }
            else {
                excludedList.push(listId);
                this.style.color = "#ff0000";
            }
            localStorage.setItem("mpj-excluded-list", JSON.stringify(excludedList));
        }

        buttons.excludeBtn = excludeBtn;
        return excludeBtn;
    }


    function volumeObserverHandler(records, observer) {
        // Handle observations from the volumeObserver MutationObserver.
        buttons.volBtn.innerHTML = ytInterface.isMuted() ? "M" : `${ytInterface.getVolume()}%`;
    }


    function liveObserverHandler(records, observer) {
        // Handle observations from the liveObserver MutationObserver.
        if (records[0].oldValue == null) {
            setSpeed(1, false, true);
            log("Set playback speed to 1x because live playback was reached");
        }
    }


    function scrollToSkipHandler(e) {
        // Handle scroll to skip events, skipping forwards or backwards.
        e.preventDefault();
        ytInterface.wakeUpControls();
        // Determine the scroll direction and skip accordingly.
        let key, keyCode;
        if (e.deltaY < 0) {
            key = "ArrowRight";
            keyCode = 39;
        }
        else {
            key = "ArrowLeft";
            keyCode = 37;
        }
        ytdPlayer.dispatchEvent(
            new KeyboardEvent("keydown", { key: key, code: key, keyCode: keyCode, which: keyCode, bubbles: true })
        );
    }


    function scriptMain() {
        // This function will carry out the script's main actions.

        // If the option is set, crop the bottom gradient.
        if (settings.cropBottomGradient) {
            bottomGradient.style.maxHeight = settings.bottomGradientMaxHeight;
            log("Cropped the bottom gradient");
        }

        // If the option is set, configure event listeners for keyboard shortcuts.
        if (settings.enableKeyboardShortcuts) {
            ytdPlayer.addEventListener("keydown", keyPressHandler, true);
            log("Added keyboard shortcut event listeners");
        }

        // If the option is set, modify the normal volume button.
        if (settings.normalVolumeSliderStep != 10) {
            ytVolPanel.onwheel = function (event) {
                event.preventDefault();
                event.stopImmediatePropagation();
                // Determine the scroll direction and set the volume accordingly.
                if (event.deltaY < 0) { setVol(settings.normalVolumeSliderStep); }
                else { setVol(-settings.normalVolumeSliderStep); }
            }
            log("Modified the normal volume button");
        }

        // If the option is set, enable scroll to skip.
        if (settings.enableScrollToSkip) {
            ytTimeDisplay.addEventListener("wheel", scrollToSkipHandler);
            log("Enabled scroll to skip on the time display");
        }

        // If the option is set, fix the playback quality.
        if (settings.automaticFixedResolution) { setPlaybackQuality(settings.automaticFixedResolution); }

        // If the option is set, enable theater mode.
        if (settings.automaticTheaterMode) { setTheaterMode(true); }

        // If the option is set, ensure that autonav is disabled.
        if (settings.automaticallyDisableAutonav) {
            if (ytAutonavButton.getAttribute("aria-checked") === "true") {
                ytAutonavButton.click();
                log("Disabled autonav");
            }
        }

        // Add the buttons if they are not already present.
        if (!document.querySelector(".rem-button")) {
            log("Adding buttons");
            // If the option is enabled, first set the volume to the value stored in its localStorage entry.
            // This code is placed here to ensure it only runs on a fresh YouTube player instance.
            if (settings.improveVolumeConsistency) {
                // Additional condition that avoids un-doing the mute action by 'Mute YouTube Trailers' (one of my other scripts).
                const mutedTrailers = JSON.parse(localStorage.getItem("mpj-muted-trailers") || "[]");
                if (!mutedTrailers.some(trailer => trailer.id == JSON.parse(ytInterface.getDebugText()).debug_videoId)) {
                    setVol("stored");
                    log("Improved volume consistency by loading its most recent value");
                }
            }
            // If the current volume exceeds the set maximum initial volume, cap it to the maximum.
            else if (ytInterface.getVolume() > settings.maxInitialVolume) {
                setVol(settings.maxInitialVolume, undefined, false);
                log("Capped initial volume")
            }

            // Create the custom volume button if it is enabled.
            if (settings.addVolumeButton) {
                ytRMenu.prepend(buttons.volBtn ? buttons.volBtn : makeVolBtn());

                // Set up volumeObserver to ensure that the custom volume button remains synchronized with the player's volume.
                if (volumeObserver) { volumeObserver.disconnect(); }
                else {
                    volumeObserver = new MutationObserver(volumeObserverHandler);
                    log("Created MutationObserver instance: volumeObserver");
                }
                volumeObserver.observe(ytVolPanel, { attributes: true, attributeFilter: ["aria-valuetext"] });
                log("Enabled volumeObserver for changes in playback volume");
            }

            // Create the scrollable playback speed button if it is enabled.
            if (settings.addScrollableSpeedButton) { ytRMenu.prepend(buttons.sSpeedBtn ? buttons.sSpeedBtn : makeScrollableSpeedBtn()); }

            // Create the speed buttons.
            for (let i = settings.buttonSpeeds.length - 1; i >= 0; i--) {
                const buttonSpeed = settings.buttonSpeeds[i];
                if (buttonSpeed > 10 || buttonSpeed < 0.1) {
                    log("WARNING: Skipped adding a playback speed button because its speed is not between 0.1 and 10");
                    continue;
                }
                ytRMenu.prepend(buttons.speedBtns[buttonSpeed.toFixed(2)] ? buttons.speedBtns[buttonSpeed.toFixed(2)] : makeSpeedBtn(buttonSpeed));
            }
            // Once the speed buttons have been added, change their widths to fixed values to prevent them from shifting due to style changes.
            fixSpeedBtnWidth(settings.maxAttempts);

            // Create the remember speed button.
            ytRMenu.prepend(buttons.remBtn ? buttons.remBtn : makeRemBtn());
        }

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
        const excludedList = JSON.parse(localStorage.getItem("mpj-excluded-list") || "[]");

        // If the liveObserver MutationObserver exists, clear observers from previous pages.
        if (liveObserver) { liveObserver.disconnect(); }
        // If this is a livestream, set up liveObserver to detect the stream state.
        if (!notLiveCheck) {
            // Only create a new MutationObserver if it does not exist yet.
            if (!liveObserver) {
                liveObserver = new MutationObserver(liveObserverHandler);
                log("Created MutationObserver instance: liveObserver");
            }
            liveObserver.observe(liveBtn, { attributes: true, attributeFilter: ["disabled"], attributeOldValue: true });
            log("Enabled liveObserver for changes in stream state");
        }

        // If automatic playback speed is disabled, the script stops here.
        if (!JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
            log("Automatic playback speed is disabled, skipping");
            selectNormalSpeedBtn();
            return;
        }
        log("Automatic playback speed is enabled, attempting to set playback speed to " + savedSpeed.toFixed(2) + "x");
        buttons.remBtn.style.borderColor = settings.activeButtonColor;
        // If the option is enabled, check whether this is a new browser session and set the playback speed accordingly.
        if (settings.resetSpeedOnNewSession && !getCookie(sessionCookie)) {
            log("Detected a new browser session, setting playback speed to 1x");
            setSpeed(1);
            return;
        }
        // Check whether or not the current playlist is excluded.
        if (excludedList.includes(getPlaylistId())) {
            // If the current playlist is excluded, select the 1x button without changing the saved speed.
            log("The current playlist is excluded from automatic playback speed, skipping");
            selectNormalSpeedBtn();
            buttons.excludeBtn.style.color = "#ff0000";
            return;
        }
        // Only set speed if this is not a livestream.
        if (!notLiveCheck) {
            // If this is a livestream, select the 1x button without changing the saved speed.
            log("Detected a livestream, not setting playback speed");
            selectNormalSpeedBtn();
            return;
        }
        if (ytInterface.getDuration() < settings.automaticPlaybackSpeedMinimumVideoDuration) {
            log("The current video's duration is below the minimum, not setting playback speed");
            selectNormalSpeedBtn();
            return;
        }
        // If the script has made it to this point, it is time to set the playback speed.
        setSpeed(savedSpeed);
        log("Set playback speed successfully");
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
    log("YouTube Playback Tweaks by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let checkedSettings = false, buttons = { speedBtns: {} }, ytdPlayer, ytInterface;
    let ytRMenu, corePlayer, bottomGradient, ytVolPanel, ytPageMgr, liveBtn;
    let volumeObserver, liveObserver, ytTimeDisplay, ytAutonavButton;
    const sessionCookie = "mpj-ytpt-session";
    // Add an event listener for YouTube's built-in navigate-finish event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-navigate-finish", pageChangeHandler);
    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
})();
