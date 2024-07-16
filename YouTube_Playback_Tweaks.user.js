// ==UserScript==
// @name         YouTube Playback Tweaks
// @namespace    MPJ_namespace
// @version      2024.07.16.02
// @description  Contains various tweaks to improve the YouTube experience, including customizable playback speed and volume controls.
// @author       MPJ
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
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

        playerButtons: ["r", "<", "s", ">"],
        // Specifies which buttons to add to the YouTube player.
        // The buttons will be added in the specified order. Duplicate buttons are NOT supported.
        // Values must be entered in array form. If you do not want any buttons, use the empty array '[]'.
        // A detailed explanation of valid button specifiers is given below. Default: ["r", "<", "s", ">"]

        // Entering a number will add a button that sets the playback speed to the given value.
        // The speed must be between 0.1 and 10 (these limits are intrinsic to YouTube's video player).

        // There are also some special buttons, which must be entered as a string:

        // - The remember playback speed button: "r"
        //   A toggle button that remembers the set playback speed when enabled.
        //   Normally, YouTube cannot remember playback speeds outside of its supported range (0.25x to 2x),
        //   or outside of the current browser tab. Enabling this button fixes both of these issues.
        //   If this button is not present, the remember playback speed feature is disabled automatically.

        // - The scrollable speed button: "s"
        //   This button displays the current playback speed, which can be controlled by scrolling over the
        //   button. Clicking the button sets the playback speed to 1x. The playback speed step size can be
        //   customized using the 'speedStep' setting below.

        // - The speed increment button: ">"
        //   Increments the playback speed by the value specified in the 'speedStep' setting when clicked.

        // - The speed decrement button: "<"
        //   Decrements the playback speed by the value specified in the 'speedStep' setting when clicked.

        // - The volume button: "v"
        //   A custom volume button, which is different from YouTube's own in that it always displays the
        //   current volume. The volume can be adjusted by scrolling over the button, and clicking the
        //   button toggles mute. The volume adjustment step size can be customized using the 'volumeStep'
        //   and 'fineVolumeStepsThreshold' settings below.
        //   This was added because I personally like discreet volume steps, and because I find YouTube's
        //   default 10% steps far too large. If you don't mind moving YouTube's regular volume slider,
        //   this button is of little value.

        // Here are some examples of valid button arrays:
        // - ["r", 1, 1.5, 2, 2.5, 3]
        // - ["r", 1, 2, "s"]
        // - ["r", "s", "v"]

        speedStep: 0.25,
        // The playback speed adjustment step size. Only applies to the scrollable speed button, speed
        // increment button and speed decrement button. Default: 0.25
        resetSpeedOnNewSession: false,
        // When enabled, the playback speed will always be set to 1x at the beginning of a new browser
        // session. This does not affect the state of the remember playback speed button, but does
        // overwrite the saved speed to 1x. A browser session ends when all tabs have been closed.
        // Note: This setting uses a temporary cookie to function. The cookie is automatically deleted by
        // the browser whenever a session ends. Default: false
        automaticPlaybackSpeedMinimumVideoDuration: 0,
        // Saved playback speed will only be applied on videos with a duration greater than or equal to
        // this value. Must be given in seconds. Default: 0

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

        alwaysPauseAndUnpauseWithSpacebar: true,
        // This option ensures that pressing the spacebar will (almost) always pause or unpause playback.
        // Normally, when any of the YouTube player controls are clicked, they will gain focus and prevent
        // spacebar keystrokes from reaching the player. This leads to inconsistent behavior of the
        // spacebar, which may annoy unaware users. If this option is enabled, the script will give focus
        // back to the player whenever it detects that a player control button gains focus.
        // Default: true

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
        // The key combinations can be customized below. Default: false (enabling recommended)
        speedIncrementShortcut: "Shift >",
        speedDecrementShortcut: "Shift <",
        speedResetShortcut: "",
        volumeIncrementShortcut: "ArrowUp",
        volumeDecrementShortcut: "ArrowDown",
        // These settings specify the key combinations used for the keyboard shortcuts.
        // Shortcuts must end in exactly one valid key, preceeded by any number of valid modifier keys
        // separated by spaces. Valid modifiers are 'ctrl', 'alt', 'shift' and 'meta'.
        // The input is not case-sensitive and the order of the modifiers does not matter.
        // To disable a shortcut, use the empty string ("").
        // See the following URL for valid names of special keys:
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
        // Defaults (identical to YouTube's native shortcuts):
        // speedIncrementShortcut: "Shift >", speedDecrementShortcut: "Shift <", speedResetShortcut: "",
        // volumeIncrementShortcut: "ArrowUp", volumeDecrementShortcut: "ArrowDown"

        normalButtonColor: "#eeeeee",
        // The color to use for all buttons in their normal (inactive) state.
        // Must be some value understood by style.color. Default: "#eeeeee"
        activeButtonColor: "#3ea6ff",
        // The color to use for all buttons (except the exclude playlist button) in their active state.
        // Must be some value understood by style.color. Default: "#3ea6ff"
        buttonOpacity: 0.67,
        // The opacity to use for all buttons when the cursor is not hovering over the button.
        // Must be a number ranging from 0 to 1. Default: 0.67
        buttonBackgroundOpacity: 0.67,
        // The opacity to use for the dark button background that appears when hovering over any button.
        // This background significantly improves the readability of button text when the underlying video
        // content is bright. Must be a number ranging from 0 to 1. Default: 0.67
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
        ytVolPanel = (settings.playerButtons.some(button => String(button).trim().toLowerCase() == "v") || settings.normalVolumeSliderStep != 10) ? ytdPlayer.querySelector(".ytp-volume-panel") : true;
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


    function setSpeed(speed, relative = false, save = true, enforce = false) {
        // Sets the playback speed. Uses YouTube's built-in setPlaybackRate() function for speeds within its range.
        // The duration of closed captions or subtitles will be incorrect for speeds outside the standard range of 0.25x to 2x.

        // Avoid setting the playback speed during live playback.
        if (liveBtn.getAttribute("disabled") === "" && ytdPlayer.querySelector(".ytp-live") && !enforce) {
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
        if (save) { localStorage.setItem("mpj-saved-speed", JSON.stringify(newSpeed)); }
        // Visually update all present buttons.
        selectSpeedButton(newSpeed);
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


    function parseKeyboardShortcuts() {
        // Parse the keyboard shortcuts specified in the script settings.
        const shortcuts = ["speedIncrementShortcut", "speedDecrementShortcut", "speedResetShortcut", "volumeIncrementShortcut", "volumeDecrementShortcut"];
        const shortcutMap = {};
        for (const shortcut of shortcuts) {
            const [key, ...modifiers] = settings[shortcut].trim().toLowerCase().split(/\s+/).reverse();
            shortcutMap[shortcut] = { key: key, modifiers: modifiers.map(modifier => modifier + "Key") };
        }

        return shortcutMap;
    }


    function keyPressHandler(event) {
        // This function interprets keypresses by performing actions related to specific key combinations.

        // Skip this event if the current active element is some form of text input.
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === "INPUT" || activeElement.tagName == "TEXTAREA" || activeElement.isContentEditable;
        if (isInput) { return; }

        // Define a function that checks whether the correct modifier keys are active for a given shortcut.
        function checkModifiers(shortcut) {
            const modifiers = ["altKey", "ctrlKey", "shiftKey", "metaKey"];
            return modifiers.every(key => shortcutMap[shortcut].modifiers.includes(key) ? event[key] : !event[key]);
        }

        // Check if the pressed key matches one of the keys specified in the script settings.
        let handledKeypress = false;
        switch (event.key.toLowerCase()) {
            case shortcutMap.speedIncrementShortcut.key:
                if (checkModifiers("speedIncrementShortcut")) {
                    setSpeed(settings.speedStep, true);
                    handledKeypress = true;
                }
                break;
            case shortcutMap.speedDecrementShortcut.key:
                if (checkModifiers("speedDecrementShortcut")) {
                    setSpeed(-settings.speedStep, true);
                    handledKeypress = true;
                }
                break;
            case shortcutMap.speedResetShortcut.key:
                if (checkModifiers("speedResetShortcut")) {
                    setSpeed(1);
                    handledKeypress = true;
                }
                break;
            case shortcutMap.volumeIncrementShortcut.key:
                if (checkModifiers("volumeIncrementShortcut")) {
                    setVol(settings.volumeStep);
                    handledKeypress = true;
                }
                break;
            case shortcutMap.volumeDecrementShortcut.key:
                if (checkModifiers("volumeDecrementShortcut")) {
                    setVol(-settings.volumeStep);
                    handledKeypress = true;
                }
                break;
        }

        // If a valid keypress was handled, wake up the player controls and stop the event from propagating further.
        if (handledKeypress) {
            ytInterface.wakeUpControls();
            event.preventDefault();
            event.stopPropagation();
        }
    }


    function setPlaybackQuality(resolution) {
        // This function sets the playback quality (resolultion) of the YouTube player.

        // Ensure that the desired quality level is valid.
        const qualityLevels = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "2880p", "4320p"];
        let qualityLevel = qualityLevels.findIndex(level => level == resolution);
        if (qualityLevel == -1) {
            log(`ERROR: Could not set playback quality, because the specified quality '${resolution}' is invalid!`);
            return;
        }

        // Check whether the desired quality is available.
        const availableQualityData = ytInterface.getAvailableQualityData();
        function getQualityIndex(quality) { return availableQualityData.findIndex(data => data.qualityLabel.startsWith(quality)); }
        let qualityIndex = getQualityIndex(qualityLevels[qualityLevel]);

        // If the desired quality is not available, select either the nearest higher available quality or the highest available quality.
        if (qualityIndex == -1) {
            const maximumAvailableQualityLevel = qualityLevels.findIndex(level => availableQualityData[0].qualityLabel.startsWith(level));
            qualityLevel++;
            // If there is no available quality that is higher than the desired quality, select the highest available quality.
            if (qualityLevel >= maximumAvailableQualityLevel) { qualityIndex = 0; }
            // Otherwise, select the nearest higher available quality.
            else {
                do {
                    qualityIndex = getQualityIndex(qualityLevels[qualityLevel]);
                    qualityLevel++;
                } while (qualityIndex == -1 && qualityLevel <= maximumAvailableQualityLevel);

                // Safety check to ensure that the while loop resulted in an available quality. This should never execute.
                if (qualityIndex == -1) {
                    log("ERROR: Expected at least one available playback quality between the desired and maximum quality, but no such quality was found!");
                    return;
                }
            }
        }

        // Apply the selected playback quality.
        const quality = availableQualityData[qualityIndex].quality;
        ytInterface.setPlaybackQualityRange(quality);
        log(`Playback quality set to ${quality}`);
    }


    function setTheaterMode(state) {
        // This function either enables or disables theater mode according to the boolean 'state' argument.
        ytPageMgr.setTheaterModeRequested(state);
        log((state ? "Enabled" : "Disabled") + " theater mode");
    }


    function resetSpeedButtons(speed) {
        // This function resets the style of every speed button.
        for (const button of Object.values(buttons.speedButtons)) { button.style.color = settings.normalButtonColor; }
        if (buttons.scrollableSpeedButton) {
            buttons.scrollableSpeedButton.firstChild.textContent = speed < 10 ? speed.toFixed(2) + "x" : "10.0x";
            buttons.scrollableSpeedButton.style.color = settings.normalButtonColor;
        }
    }


    function selectSpeedButton(speed) {
        // This function visually selects the speed button matching the given or current playback speed.
        // If the playback speed does not match with any button, no button is selected.
        const targetSpeed = speed || corePlayer.playbackRate;
        resetSpeedButtons(targetSpeed);

        const button = buttons.speedButtons[targetSpeed.toFixed(2)];
        if (button) { button.style.color = settings.activeButtonColor; }
        else if (buttons.scrollableSpeedButton) { buttons.scrollableSpeedButton.style.color = settings.activeButtonColor; }
    }


    function createButtonWrapper() {
        // Create and return a wrapper for the script's buttons.
        const wrapper = document.createElement("div");
        wrapper.className = "mpj-button-wrapper";
        wrapper.style.display = "inline-flex";
        wrapper.style.flexDirection = "row";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.position = "relative";
        wrapper.style.verticalAlign = "top";

        if (settings.buttonBackgroundOpacity > 0) {
            wrapper.style.borderRadius = "6px";
            wrapper.style.transition = "background-color 0.1s ease-in";
            wrapper.onmouseover = function () { this.style.backgroundColor = `rgba(0, 0, 0, ${settings.buttonBackgroundOpacity})`; }
            wrapper.onmouseleave = function () { this.style.backgroundColor = "transparent"; }
        }

        return wrapper;
    }


    function applyCommonButtonStyle(button) {
        // Apply common style properties to the given button.
        button.style.color = settings.normalButtonColor;
        button.style.opacity = settings.buttonOpacity;
        button.style.fontSize = "116%";
        button.style.textAlign = "center";
        button.style.boxSizing = "content-box";
        button.style.padding = "0px";

        if (settings.buttonOpacity < 1) {
            button.onmouseover = function () { this.style.opacity = 1; };
            button.onmouseleave = function () { this.style.opacity = settings.buttonOpacity; };
        }
    }


    function addTextToButton(button, text, getWidth = false) {
        const span = document.createElement("span");
        span.textContent = text;
        button.appendChild(span);

        // The following code is considered deprecated...
        let width = undefined;
        if (getWidth) {
            button.style.visibility = "hidden";
            document.body.appendChild(button);
            width = span.offsetWidth;
            document.body.removeChild(button);
            button.style.visibility = "";
        }

        return width;
    }


    function createRememberButton() {
        // This function creates the remember playback speed button.
        const button = document.createElement("button");
        button.className = "mpj-remember-button ytp-button";

        applyCommonButtonStyle(button);
        button.style.width = "10px";
        button.style.height = "10px";
        button.style.border = "2px solid white";
        button.style.borderRadius = "10px";
        button.style.margin = "0px 3px";
        button.title = "Remember Playback Speed";

        button.onclick = function () {
            if (JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
                localStorage.setItem("mpj-auto-speed", JSON.stringify(false));
                this.style.borderColor = "";
            }
            else {
                localStorage.setItem("mpj-auto-speed", JSON.stringify(true));
                localStorage.setItem("mpj-saved-speed", JSON.stringify(corePlayer.playbackRate));
                this.style.borderColor = settings.activeButtonColor;
            }
        };

        return button;
    }


    function stringifyButtonSpeed(speed) {
        // Represent the given button speed as a string with at most two decimal places.
        const numString = String(speed);
        const parts = numString.split(".");
        if (parts.length < 2) { return numString; }
        if (parts[1].length < 3) { return numString; }
        return speed.toFixed(2);
    }


    function createSpeedButton(speed) {
        // This function creates a speed button.
        const button = document.createElement("button");
        button.className = "mpj-speed-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, stringifyButtonSpeed(speed) + "x");
        button.style.width = "auto";
        button.style.padding = "0px 3px";

        button.onclick = function () { setSpeed(speed); };

        return button;
    }


    function createScrollableSpeedButton() {
        // This function creates the scrollable speed button.
        const button = document.createElement("button");
        button.className = "mpj-scrollable-speed-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, "1.00x");

        button.onclick = function () { setSpeed(1); };

        button.onwheel = function (event) {
            event.preventDefault();
            ytInterface.wakeUpControls();
            // Determine the scroll direction and set the playback speed accordingly.
            if (event.deltaY < 0) { setSpeed(settings.speedStep, true); }
            else { setSpeed(-settings.speedStep, true); }
        };

        return button;
    }


    function createSpeedStepButton(multiplier) {
        // Create a speed step button with the given multiplier.
        const button = document.createElement("button");
        button.className = "mpj-speed-step-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, multiplier < 0 ? "<<" : ">>");
        button.style.width = "auto";
        button.style.padding = "0px 3px";

        button.onclick = function () { setSpeed(multiplier * settings.speedStep, true); };

        return button;
    }


    function createVolumeButton() {
        // This function creates the custom volume button.
        const button = document.createElement("button");
        button.className = "mpj-volume-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, ytInterface.isMuted() ? "M" : `${ytInterface.getVolume()}%`);
        button.title = "Volume";

        button.onclick = function () {
            if (ytInterface.isMuted()) { setVol(undefined, false); }
            else { setVol(undefined, true); }
        };

        button.onwheel = function (event) {
            event.preventDefault();
            ytInterface.wakeUpControls();
            // Do nothing if the volume is muted.
            if (ytInterface.isMuted()) { return; }
            // Determine the scroll direction and set the volume accordingly.
            if (event.deltaY < 0) { setVol(settings.volumeStep); }
            else { setVol(-settings.volumeStep); }
        };

        return button;
    }


    function addButtons() {
        // Add buttons to the player according to the script settings.

        // First create the button wrapper.
        const wrapper = createButtonWrapper();

        // Parse the buttons from the script settings.
        for (const button of settings.playerButtons) {
            // If this button is a number, create a regular speed button.
            const speed = parseFloat(button);
            if (!isNaN(speed)) {
                // Skip this button if the speed is invalid.
                if (speed < 0.1 || speed > 10) {
                    log("WARNING: Skipped adding a playback speed button because its speed is not between 0.1 and 10!");
                    continue;
                }
                // Create a speed button for the given speed.
                const speedId = speed.toFixed(2);
                buttons.speedButtons[speedId] = buttons.speedButtons[speedId] || createSpeedButton(speed);
                wrapper.append(buttons.speedButtons[speedId]);
                continue;
            }

            // If this button is not a number, check whether it matches any special button specifier.
            switch (String(button).trim().toLowerCase()) {
                case "r":
                    // Create the remember playback speed button.
                    buttons.rememberButton = buttons.rememberButton || createRememberButton();
                    wrapper.append(buttons.rememberButton);
                    break;
                case "s":
                    // Create the scrollable speed button.
                    buttons.scrollableSpeedButton = buttons.scrollableSpeedButton || createScrollableSpeedButton();
                    wrapper.append(buttons.scrollableSpeedButton);
                    break;
                case "<":
                    // Create the speed decrement button.
                    buttons.speedDecrementButton = buttons.speedDecrementButton || createSpeedStepButton(-1);
                    wrapper.append(buttons.speedDecrementButton);
                    break;
                case ">":
                    // Create the speed increment button.
                    buttons.speedIncrementButton = buttons.speedIncrementButton || createSpeedStepButton(1);
                    wrapper.append(buttons.speedIncrementButton);
                    break;
                case "v":
                    // Create the volume button.
                    buttons.volumeButton = buttons.volumeButton || createVolumeButton();
                    wrapper.append(buttons.volumeButton);

                    // Set up volumeObserver to ensure that the custom volume button remains synchronized with the player's volume.
                    if (volumeObserver) { volumeObserver.disconnect(); }
                    else {
                        volumeObserver = new MutationObserver(volumeObserverHandler);
                        log("Created MutationObserver instance: volumeObserver");
                    }
                    volumeObserver.observe(ytVolPanel, { attributes: true, attributeFilter: ["aria-valuetext"] });
                    log("Enabled volumeObserver for changes in playback volume");
                    break;
                default:
                    log(`WARNING: Skipped adding a player button because its specifier '${button}' is not valid!`);
            }
        }

        // Add the wrapper to the DOM.
        buttons.wrapper = wrapper;
        ytRMenu.prepend(wrapper);
    }


    function createExcludeButton() {
        // This function creates the exclude current playlist button.
        const button = document.createElement("button");
        button.className = "mpj-exclude-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, "✖");
        button.style.width = "auto";
        button.style.margin = "0px 3px";
        button.style.fontSize = "17px";
        button.title = "Exclude Current Playlist";

        button.onclick = function () {
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

        return button;
    }


    function volumeObserverHandler(records, observer) {
        // Handle observations from the volumeObserver MutationObserver.
        buttons.volumeButton.firstChild.textContent = ytInterface.isMuted() ? "M" : `${ytInterface.getVolume()}%`;
    }


    function liveObserverHandler(records, observer) {
        // Handle observations from the liveObserver MutationObserver.
        if (records[0].oldValue == null) {
            setSpeed(1, false, false, true);
            log("Set playback speed to 1x because live playback was reached");
        }
    }


    function playerControlsFocusinHandler() {
        // After focus was given to one of the player controls, focus the player.
        ytInterface.focus({ preventScroll: true });
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
            shortcutMap = parseKeyboardShortcuts();
            document.addEventListener("keydown", keyPressHandler, true);
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

        // If the option is set, ensure that the spacebar always pauses and unpauses playback.
        if (settings.alwaysPauseAndUnpauseWithSpacebar) {
            ytRMenu.parentElement.parentElement.addEventListener("focusin", playerControlsFocusinHandler);
            log("Ensured that the spacebar always pauses and unpauses playback");
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
        if (!document.body.contains(buttons.wrapper || null)) {
            log("Adding buttons");
            addButtons();

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
        }

        // Add or remove the exclude playlist button.
        const excludeButtonExists = document.body.contains(buttons.excludeButton || null);
        // Check if the current page is a playlist.
        if (document.URL.includes("&list=")) {
            // If the button is not present, add the button.
            if (!excludeButtonExists) {
                buttons.excludeButton = buttons.excludeButton || createExcludeButton();
                buttons.wrapper.prepend(buttons.excludeButton);
            }
        }
        // If the button is present but the current page is not a playlist, remove the button.
        else if (excludeButtonExists) { buttons.excludeButton.remove(); }

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
        if (!buttons.rememberButton || !JSON.parse(localStorage.getItem("mpj-auto-speed") || "false")) {
            log("Automatic playback speed is disabled, skipping");
            selectSpeedButton();
            return;
        }
        log("Automatic playback speed is enabled, attempting to set playback speed to " + savedSpeed.toFixed(2) + "x");
        buttons.rememberButton.style.borderColor = settings.activeButtonColor;
        // If the option is enabled, check whether this is a new browser session and set the playback speed accordingly.
        if (settings.resetSpeedOnNewSession && !getCookie(sessionCookie)) {
            log("Detected a new browser session, setting playback speed to 1x");
            setSpeed(1);
            return;
        }
        // Check whether or not the current playlist is excluded.
        if (excludedList.includes(getPlaylistId())) {
            // If the current playlist is excluded, do not set the playback speed.
            log("The current playlist is excluded from automatic playback speed, skipping");
            selectSpeedButton();
            buttons.excludeButton.style.color = "#ff0000";
            return;
        }
        // Only set speed if this is not a livestream.
        if (!notLiveCheck) {
            // If this is a livestream, set the playback speed to 1x without changing the saved speed.
            log("Detected a livestream, not setting playback speed");
            setSpeed(1, false, false, true);
            return;
        }
        if (ytInterface.getDuration() < settings.automaticPlaybackSpeedMinimumVideoDuration) {
            log("The current video's duration is below the minimum, not setting playback speed");
            selectSpeedButton();
            return;
        }
        // If the script has made it to this point, it is time to set the playback speed.
        setSpeed(savedSpeed);
        log("Set playback speed successfully");
    }


    function pageChangeHandler() {
        const URL = document.URL.split("&", 1)[0];
        if (URL == previousURL) { return; }
        previousURL = URL;
        if (URL.startsWith("https://www.youtube.com/watch")) {
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
    let previousURL = "";
    let checkedSettings = false, buttons = { speedButtons: {} }, ytdPlayer, ytInterface;
    let ytRMenu, corePlayer, bottomGradient, ytVolPanel, ytPageMgr, liveBtn;
    let volumeObserver, liveObserver, ytTimeDisplay, ytAutonavButton, shortcutMap;
    const sessionCookie = "mpj-ytpt-session";
    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", visibilityChangeHandler);
    // Add an event listener for YouTube's built-in yt-page-data-updated event.
    // This will run keepTrying() whenever the page changes to a target (watch) page.
    document.addEventListener("yt-page-data-updated", pageChangeHandler);
    // Run pageChangeHandler() manually, just in case the event listener misses the first occurence of yt-page-data-updated.
    pageChangeHandler();
})();
