// ==UserScript==
// @name         YouTube Playback Tweaks
// @namespace    https://github.com/MPJ-K/userScripts
// @version      2025.10.11.01
// @description  Contains various tweaks to improve the YouTube experience, including customizable playback rate and volume controls.
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @author       MPJ-K
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/logging_helpers.js#sha256-ddYDZR5bgGwvIGxF1w7xGaEI7UBMovYQJBrXLmyTtFs=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/storage_helpers.js#sha256-nSqlM59rXDE/NCDeSAuC1svjr7ooZpQl8aQIbdp+MzA=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/dom_helpers.js#sha256-pEZlv2TApVkBE5k1MMfjKVYgNFo2SyQSiCgF9TuHG0s=
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @updateURL    https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/YouTube_Playback_Tweaks.user.js
// @downloadURL  https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/YouTube_Playback_Tweaks.user.js
// ==/UserScript==

/**
 * README
 * 
 * YouTube Playback Tweaks aims to improve the user experience on YouTube through a variety of optional features.
 * The primary features of the script are customizable playback rate and volume controls, including new player buttons
 * and keyboard shortcuts. Many more tweaks are available through the script settings, which can be found below.
**/

// References for cross-file JSDoc in VS Code:
/// <reference path="../helpers/logging_helpers.js" />
/// <reference path="../helpers/storage_helpers.js" />
/// <reference path="../helpers/dom_helpers.js" />

(function () {
    'use strict';

    // Script settings

    const settings = {
        logLevel: "disabled",
        // The maximum log level at which the script is allowed to log messages to the browser's console.
        // Unless you are a developer looking to debug, this option is of little value. Valid levels in ascending order
        // of verbosity are: "disabled", "error", "warn", "info", and "debug".
        // Default: "disabled"
        logDebugToInfo: false,
        // Whether to log "debug"-level messages using the console's 'log' method instead of its 'debug' method.
        // Enabling this option lets you view the script's debug messages without needing to enable verbose messages in
        // the browser's console.
        // Default: false

        playerButtons: ["r", "<", "s", ">"],
        // Specifies which buttons to add to the YouTube player.
        // The buttons will be added in the specified order. Duplicate buttons are NOT supported. Values must be entered
        // in array form. If you do not want any buttons, use the empty array: [].
        // A detailed explanation of valid button specifiers is given below.
        // Default: ["r", "<", "s", ">"]

        // Entering a number will add a button that, when clicked, sets the playback rate to the given value.
        // Note: The playback rate must be between 0.1 and 10 (these limits are intrinsic to YouTube's video player).

        // There are also some special buttons, which must be entered as a string:

        // - The remember playback rate button: "r"
        //   A toggle button that remembers the set playback rate when enabled.
        //   Normally, YouTube cannot remember playback rates outside of its supported range (0.25x to 2x), or outside
        //   of the current browser tab. Enabling this button fixes both of these issues.
        //   If this button is not present, the remember playback rate feature is disabled automatically.

        // - The scrollable playback rate button: "s"
        //   This button displays the current playback rate, which can be controlled by scrolling over the button.
        //   Clicking the button sets the playback rate to 1x. The playback rate adjustment step size can be
        //   customized using the 'playbackRateStep' setting.

        // - The playback rate increment button: ">"
        //   Increments the playback rate by the value specified in the 'playbackRateStep' setting when clicked.

        // - The playback rate decrement button: "<"
        //   Decrements the playback rate by the value specified in the 'playbackRateStep' setting when clicked.

        // - The volume button: "v"
        //   A custom volume button that always displays the current volume.
        //   The volume can be adjusted by scrolling over the button, and clicking the button toggles mute. The volume
        //   adjustment step size can be customized using the 'volumeStep' and 'fineVolumeStepsThreshold' settings.
        //   Note: This button was added because I personally like discreet volume steps, and because I find YouTube's
        //   default 10% steps far too large. If you don't mind moving YouTube's regular volume slider, then this button
        //   is of little value.

        // Here are some examples of valid button arrays:
        // - ["r", 1, 1.5, 2, 2.5, 3]
        // - ["r", 1, 2, "s"]
        // - ["r", "s", "v"]

        playbackRateStep: 0.25,
        // The step size for playback rate adjustments.
        // This setting only applies to the scrollable playback rate button, playback rate increment button and playback
        // rate decrement button.
        // Default: 0.25
        resetPlaybackRateOnNewSession: false,
        // When enabled, the playback rate will always be set to 1x at the beginning of a new browser session.
        // A browser session ends when all tabs have been closed. The state of the remember playback rate button is not
        // affected, but the saved playback rate will be set to 1x.
        // Note: This setting uses a temporary cookie to function. The cookie is automatically deleted by the browser
        // whenever a session ends.
        // Default: false
        automaticPlaybackRateMinimumVideoDuration: 0,
        // Saved playback rate will only be applied on videos with a duration greater than or equal to this value,
        // given in seconds.
        // Default: 0

        volumeStep: 2,
        // The step size for volume adjustments, given in percentage points.
        // This setting only applies to the custom volume button and keyboard shortcuts of the script.
        // Note: The specified value must be an integer!
        // Default: 2
        fineVolumeStepsThreshold: 10,
        // When adjusting the volume below this threshold, the volume step size is switched to 1%.
        // This allows for finer volume control when approaching 0% volume.
        // This setting only applies to the custom volume button and keyboard shortcuts of the script.
        // Note: The specified value must be an integer!
        // Default: 10
        nativeVolumeSliderStep: 10,
        // The step size for volume adjustments that are made by scrolling over YouTube's native volume slider.
        // Note: The specified value must be an integer!
        // Default: 10
        improveVolumeConsistency: false,
        // Improves the consistency of saved volume between different YouTube tabs.
        // For every new YouTube instance (e.g. a new browser tab), the first video that plays will have its volume set
        // to the most recently saved value. This feature does NOT synchronize the volume at all times.
        // The following scenario provides an example of this feature in action:
        // When using 'open in new tab' to open two (or more) YouTube videos back to back, changing the volume on tab #1
        // will also apply that change to tab #2 when it is opened for the first time.
        // Default: false
        maxInitialVolume: 100,
        // For every new YouTube instance (e.g. a new browser tab), the first video that plays will have its volume
        // capped to this value.
        // Note: This feature also limits volume values loaded by the improveVolumeConsistency setting.
        // Note: The specified value must be an integer!
        // Default: 100

        alwaysPauseAndUnpauseWithSpacebar: true,
        // This option ensures that pressing the spacebar will (almost) always pause or unpause playback.
        // Normally, when any of the YouTube player controls are clicked, they will gain focus and prevent spacebar
        // keystrokes from reaching the player. This leads to inconsistent behavior of the spacebar. This feature works
        // by automatically giving focus back to the player whenever a player control button gains focus.
        // Default: true

        enableScrollToSkip: false,
        // When enabled, scrolling while hovering over the video time display will skip forwards and backwards through
        // the video, as if using the left and right arrow keys.
        // Default: false

        automaticFixedResolution: "",
        // If set, the script will automatically fix the specified resolution on the YouTube player and disable 'Auto'
        // resolution.
        // The target resolution must be specified in string format, for example: "1080p". Either specify a fixed target
        // resolution, or enter "autodetect" to automatically remember the most recent resolution that was manually
        // selected through the player options. To disable this feature, use the empty string: "".
        // Note: When using a fixed target resolution, the resolution can still be changed manually during playback.
        // Note: For videos where the target resolution is not available, the script will fix the nearest available
        // resolution instead.
        // Default: ""
        automaticTheaterMode: false,
        // Whether to automatically enable theater mode (a.k.a. cinema mode).
        // Theater mode can still be disabled manually.
        // Default: false

        cropBottomGradient: false,
        // Whether to crop the darkening gradient at the bottom of the player that appears behind the player controls.
        // The gradient will be cropped to the height specified in the 'bottomGradientMaxHeight' setting.
        // Default: false
        bottomGradientMaxHeight: "21px",
        // The height to which the bottom gradient should be cropped when the 'cropBottomGradient' setting is enabled.
        // Note: This must be a string containing a valid CSS <length> value.
        // Default: "21px"

        automaticallyDisableAutonav: false,
        // If enabled, the script will automatically ensure that autonav is disabled.
        // Autonav is also known as autoplay, referring to YouTube's feature that automatically plays another video when
        // the current one ends.
        // Default: false

        automaticallyDismissIdleConfirmationPopups: false,
        // Whether to automatically dismiss YouTube's idle confirmation pop-ups.
        // Idle confirmation pop-ups occur when watching a playlist for a long time without interacting with the player.
        // When the playlist advances to a different video, YouTube will pause playback and display a pop-up that reads:
        // "Video paused. Continue watching?". This pop-up is intended to save bandwidth by stopping playback in case
        // the viewer is no longer actively watching.
        // If this option is enabled, the script will automatially detect and dismiss these pop-ups so that playback can
        // continue without manual intervention from the user.
        // Default: false

        muteTrailers: false,
        // Whether to automatically mute the audio of the trailers that may play in live stream waiting rooms.
        // Audio can still be unmuted manually, and will also be automatically unmuted once the live stream begins.
        // Default: false

        enableKeyboardShortcuts: false,
        // Whether to enable custom keyboard shortcuts that can control playback rate and volume.
        // The key combinations can be customized below. The step sizes for playback rate and volume can be customized
        // using the 'playbackRateStep' and 'volumeStep' settings respectively. The 'fineVolumeStepsThreshold' setting
        // also applies to these shortcuts.
        // Default: false
        playbackRateIncrementShortcut: "Shift >",
        playbackRateDecrementShortcut: "Shift <",
        playbackRateResetShortcut: "",
        playbackRatePreservesPitchShortcut: "",
        volumeIncrementShortcut: "ArrowUp",
        volumeDecrementShortcut: "ArrowDown",
        // These settings specify the key combinations used for the custom keyboard shortcuts.
        // Shortcuts must end in exactly one valid key, preceeded by any number of valid modifier keys separated by
        // spaces. Valid modifiers are 'ctrl', 'alt', 'shift' and 'meta'. The input is not case-sensitive and the order
        // of the modifiers does not matter. To disable a shortcut, use the empty string: "".
        // See the following URL for valid names of special keys:
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
        // Defaults (these are identical to YouTube's native shortcuts):
        // playbackRateIncrementShortcut: "Shift >", playbackRateDecrementShortcut: "Shift <",
        // playbackRateResetShortcut: "", playbackRatePreservesPitchShortcut: "",
        // volumeIncrementShortcut: "ArrowUp", volumeDecrementShortcut: "ArrowDown"

        normalButtonColor: "#eeeeee",
        // The color to use for all custom buttons in their normal (inactive) state.
        // Note: This must be a string containing a valid CSS <color> value.
        // Default: "#eeeeee"
        activeButtonColor: "#3ea6ff",
        // The color to use for all custom buttons (except the exclude playlist button) in their active state.
        // Note: This must be a string containing a valid CSS <color> value.
        // Default: "#3ea6ff"
        buttonOpacity: 0.67,
        // The opacity to use for all custom buttons when the cursor is not hovering over the button.
        // Note: This value must be a number ranging from 0 to 1.
        // Default: 0.67
        buttonBackgroundOpacity: 0.67,
        // The opacity to use for the dark button background that appears when hovering over any custom button.
        // This can significantly improve the readability of button text when the underlying video content is bright.
        // Note: This value must be a number ranging from 0 to 1.
        // Default: 0.67
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Visually select the playback rate button matching the specified playback rate.
     * If the playback rate is not specified, the current playback rate is assumed.
     * If there are no buttons matching the specified playback rate, all buttons are deselected.
     * @param {number=} rate - The playback rate for which to match and select a button.
     */
    function selectPlaybackRateButton(rate) {
        const targetRate = rate || state.playbackRate;

        // Reset the style of every playback rate button.
        for (const button of Object.values(buttons.playbackRateButtons)) { button.deactivate(); }
        if (buttons.scrollablePlaybackRateButton) {
            buttons.scrollablePlaybackRateButton.setTextContent(targetRate < 10 ? targetRate.toFixed(2) + "x" : "10.0x");
            buttons.scrollablePlaybackRateButton.deactivate();
        }

        const button = buttons.playbackRateButtons[targetRate.toFixed(2)];
        if (button) { button.activate(); }
        else if (buttons.scrollablePlaybackRateButton) { buttons.scrollablePlaybackRateButton.activate(); }
    }


    /**
     * Listen for and handle `ratechange` events on the `corePlayer`.
     */
    function listenForPlaybackRateChanges() {
        // Set up a handler function for 'ratechange' events.
        function ratechangeHandler() {
            state.playbackRate = pageElements.get("corePlayer").playbackRate;
            selectPlaybackRateButton();
        }

        pageElements.get("corePlayer").addEventListener("ratechange", ratechangeHandler);
        logger.info("Added a listener for changes in playback rate.");
    }


    /**
     * Set the playback rate to the specified value.
     * This function uses YouTube's built-in `setPlaybackRate()` function for playback rates within its allowed range of
     * 0.25x to 2x, which adjusts the durations of closed captions to match the playback rate. For playback rates
     * outside of this range, the durations of closed captions will not match the playback rate. Fortunately, this does
     * not desynchronize the closed captions, but it can cause them to overlap.
     * @param {number} rate - The playback rate to set.
     * @param {Object} [options={}] - An `Object` containing configuration options for this function.
     * @param {boolean} [options.relative=false] - Whether the specified playback rate should be added to the current playback rate. Defaults to `false` if not specified.
     * @param {boolean} [options.saveRate=true] - Whether to save the new playback rate for the purposes of automatic playback rate. Defaults to `true` if not specified.
     * @param {boolean} [options.enforce=false] - Whether to set the playback rate regardless of whether playback is currently live. Defaults to `false` if not specified.
     */
    function setPlaybackRate(rate, options = {}) {
        // Parse the 'options' object.
        const defaultOptions = {
            relative: false,
            saveRate: true,
            enforce: false
        };

        const parsedOptions = { ...defaultOptions, ...options };

        // Avoid setting the playback rate during live playback.
        if (state.isLive && !parsedOptions.enforce) {
            logger.info("The playback rate cannot be adjusted because playback is currently live!");
            return;
        }

        // When the 'relative' option is true, the value passed in the 'rate' argument will be added to the current playback rate.
        let newRate = rate;
        if (parsedOptions.relative) {
            newRate = Math.max(Math.min(state.playbackRate + rate, 10), 0.1);
            // Convert floats with very small decimal values to integers.
            const newRateRounded = Math.round(newRate);
            if (Math.abs(newRate - newRateRounded) < 0.001) { newRate = newRateRounded; }
        }

        // Due to funkiness in setPlaybackRate(), the following structure is required to ensure that the playback rate is set correctly.
        if (newRate < 0.25) {
            pageElements.get("ytInterface").setPlaybackRate(0.25);
            pageElements.get("corePlayer").playbackRate = newRate;
        }
        else if (newRate > 2) {
            pageElements.get("ytInterface").setPlaybackRate(2);
            pageElements.get("corePlayer").playbackRate = newRate;
        }
        else {
            pageElements.get("corePlayer").playbackRate = newRate;
            pageElements.get("ytInterface").setPlaybackRate(newRate);
        }

        // Save the new playback rate.
        if (parsedOptions.saveRate) { storage.setValue(constants.storageKeys.savedPlaybackRate, newRate); }
    }


    /**
     * Set the volume and/or mute state.
     * This function also manually updates YouTube's `yt-player-volume` entry in `localStorage`.
     * @param {Object} volume - An `Object` containing the desired volume state and configuration options for this function.
     * @param {number} [volume.volume] - The desired volume level. If not specified, the volume will remain unchanged.
     * @param {boolean} [volume.muted] - The desired mute state. If not specified, the mute state will remain unchanged.
     * @param {boolean} [volume.relative] - Whether the specified volume should be added to the current volume. Defaults to `false` if not specified.
     * @param {boolean} [volume.fromStored] - If `true`, the volume and mute state will be loaded from `localStorage`. Defaults to `false` if not specified.
     */
    function setVolume(volume = {}) {
        // Parse the 'volume' object.
        const defaultOptions = {
            volume: undefined,
            muted: undefined,
            relative: false,
            fromStored: false
        };

        const parsedVolume = { ...defaultOptions, ...volume };

        // Read the localStorage entry that YouTube uses to store volume data.
        const entry = JSON.parse(localStorage.getItem("yt-player-volume") || `{"data":null}`);
        const data = entry.data === null ? { volume: pageElements.get("ytInterface").getVolume(), muted: pageElements.get("ytInterface").isMuted() } : JSON.parse(entry.data);

        // If 'fromStored' is true, set the volume and mute state to their stored values.
        if (parsedVolume.fromStored) {
            if (data.muted) { pageElements.get("ytInterface").mute(); }
            else { pageElements.get("ytInterface").unMute(); }
            pageElements.get("ytInterface").setVolume(Math.min(data.volume, settings.maxInitialVolume));
            // Exit the function, because the localStorage entry does not change in this case.
            return;
        }

        // Only adjust the volume or mute state if their values have been provided.

        if (typeof parsedVolume.volume === "number") {
            let newVolume = parsedVolume.volume;
            if (parsedVolume.relative) {
                const currentVolume = pageElements.get("ytInterface").getVolume();
                if (newVolume > 0) {
                    newVolume = Math.min(currentVolume + (currentVolume < settings.fineVolumeStepsThreshold ? 1 : newVolume), 100);
                }
                else {
                    newVolume = Math.max(currentVolume + (currentVolume <= settings.fineVolumeStepsThreshold ? -1 : newVolume), 0);
                }
            }

            pageElements.get("ytInterface").setVolume(newVolume);
            data.volume = newVolume;
        }

        if (typeof parsedVolume.muted === "boolean") {
            if (parsedVolume.muted) { pageElements.get("ytInterface").mute(); }
            else { pageElements.get("ytInterface").unMute(); }
            data.muted = parsedVolume.muted;
        }

        // Update the localStorage entry that YouTube uses to store volume data.
        entry.data = JSON.stringify(data);
        entry.creation = Date.now();
        entry.expiration = entry.creation + 2592000000;
        localStorage.setItem("yt-player-volume", JSON.stringify(entry));
    }


    /**
     * Allow the script to observe the live state of the current page, if the current page is a live stream.
     */
    async function observeLiveStateChanges() {
        // Set up a handler function for the 'liveStateObserver' MutationObserver.
        function liveStateObserverHandler() {
            const isLive = pageElements.get("ytInterface").isAtLiveHead();
            if (state.isLive === isLive) { return; }

            state.isLive = isLive;

            if (isLive) {
                // YouTube will set the playback rate to 1x on its own, but only once the stream buffers.
                // Setting the playback rate to 1x a little earlier will prevent the stream from buffering.
                setPlaybackRate(1, { saveRate: false, enforce: true });
                logger.info("Playback is now live. The playback rate has been set to 1x.");
            }
            else {
                logger.debug("Playback is no longer live.");
            }
        }

        if (observers.liveStateObserver) { observers.liveStateObserver.disconnect(); }

        if (!state.isLiveStream) {
            state.isLive = false;
            return;
        }

        state.isLive = true;
        const ytpLiveBadge = await pageElements.await("ytpLiveBadge");
        observers.liveStateObserver = new MutationObserver(liveStateObserverHandler);
        observers.liveStateObserver.observe(ytpLiveBadge, { attributes: true, attributeFilter: ["disabled"] });
        logger.info("Enabled liveStateObserver for changes in stream state.");
    }


    /**
     * Set the state of theater mode.
     * @param {boolean} state - A `boolean` indicating the desired theater mode state.
     */
    async function setTheaterMode(state) {
        // const ytdPageManager = await pageElements.await("ytdPageManager");
        // ytdPageManager.setTheaterModeRequested(state);
        const ytpSizeButton = await pageElements.await("ytpSizeButton");
        const currentState = ytpSizeButton.title.startsWith("D");
        if (state !== currentState) { ytpSizeButton.click(); }
        logger.info(`${state ? "Enabled" : "Disabled"} theater mode.`);
    }


    /**
     * Listen for `focusin` events on the YouTube player controls and ensure that they do not hold focus.
     */
    async function listenForPlayerControlsFocusin() {
        // Set up a handler function for 'focusin' events on the player controls.
        function playerControlsFocusinHandler() {
            // After focus was given to one of the player controls, focus the player.
            pageElements.get("ytInterface").focus({ preventScroll: true });
        }

        const ytpChromeBottom = await helpers.Dom.PageElementManager.awaitElement(() => pageElements.get("ytdPlayer").querySelector(".ytp-chrome-bottom"));
        ytpChromeBottom.addEventListener("focusin", playerControlsFocusinHandler);
        logger.info("Ensured that the spacebar always pauses and unpauses playback.");
    }


    /**
     * Create and return a wrapper for the player buttons of the script.
     * @returns {HTMLDivElement} The created wrapper.
     */
    function createButtonWrapper() {
        const wrapper = document.createElement("div");
        wrapper.className = "mpj-button-wrapper";
        wrapper.style.display = "inline-flex";
        wrapper.style.flexDirection = "row";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.height = "100%";
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


    /**
     * Apply a set of common style properties to the given button.
     * @param {HTMLButtonElement} button - The button to modify.
     */
    function applyCommonButtonStyle(button) {
        // button.style.boxSizing = "content-box";
        button.style.color = settings.normalButtonColor;
        button.style.padding = "0px";

        if (settings.buttonOpacity < 1) {
            button.style.opacity = settings.buttonOpacity;
            button.onmouseover = function () { this.style.opacity = 1; };
            button.onmouseleave = function () { this.style.opacity = settings.buttonOpacity; };
        }
    }


    /**
     * Add the specified text to the given button.
     * If `fixed` is `false`, this function also adds a `setTextContent()` method to the button that allows the text to
     * be modified easily.
     * @param {HTMLButtonElement} button - The button to modify.
     * @param {string} text - The text to add.
     * @param {boolean} [fixed=true] - Whether the text is not expected to be modified. Defaults to `true` if not specified.
     */
    function addTextToButton(button, text, fixed = true) {
        button.style.fontSize = "116%";
        button.style.textAlign = "center";

        const span = document.createElement("span");
        span.textContent = text;
        button.appendChild(span);

        if (!fixed) { button.setTextContent = function (text) { this.firstChild.textContent = text; }; }
    }


    /**
     * Represent the given playback rate as a `string` with at most two decimal places.
     * @param {number} rate - The playback rate to stringify.
     * @returns {string} The specified playback rate converted to a `string` with at most two decimal places.
     */
    function stringifyButtonPlaybackRate(rate) {
        const numString = String(rate);
        const parts = numString.split(".");
        if (parts.length < 2) { return numString; }
        if (parts[1].length < 3) { return numString; }
        return rate.toFixed(2);
    }


    /**
     * Create and return a fixed playback rate button for the specified playback rate.
     * @param {number} rate - The playback rate to set when the button is clicked.
     * @returns {HTMLButtonElement} The created button.
     */
    function createFixedPlaybackRateButton(rate) {
        const button = document.createElement("button");
        button.className = "mpj-playback-rate-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, stringifyButtonPlaybackRate(rate) + "x");
        button.style.width = "auto";
        button.style.padding = "0px 3px";

        button.activate = function () { this.style.color = settings.activeButtonColor; };
        button.deactivate = function () { this.style.color = settings.normalButtonColor; };

        button.onclick = function () { setPlaybackRate(rate); };

        return button;
    }


    /**
     * Create and return the remember playback rate button.
     * @returns {HTMLButtonElement} The created button.
     */
    function createRememberButton() {
        const button = document.createElement("button");
        button.className = "mpj-remember-button ytp-button";

        applyCommonButtonStyle(button);
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.width = "auto";
        button.style.padding = "0px 3px";
        button.title = "Remember Playback Rate";

        const span = document.createElement("span");
        span.style.height = "round(21.5%, 1px)";
        span.style.aspectRatio = "1 / 1";
        span.style.border = `2px solid ${settings.normalButtonColor}`;
        span.style.borderRadius = "50%";
        button.appendChild(span);

        button.activate = function () { this.firstChild.style.borderColor = settings.activeButtonColor; };
        button.deactivate = function () { this.firstChild.style.borderColor = settings.normalButtonColor; };

        button.onclick = function () {
            if (storage.getValue(constants.storageKeys.autoPlaybackRate, false)) {
                storage.setValue(constants.storageKeys.autoPlaybackRate, false);
                this.deactivate();
            }
            else {
                storage.setValue(constants.storageKeys.autoPlaybackRate, true);
                storage.setValue(constants.storageKeys.savedPlaybackRate, state.playbackRate);
                this.activate();
            }
        };

        return button;
    }


    /**
     * Create and return the scrollable playback rate button.
     * @returns {HTMLButtonElement} The created button.
     */
    function createScrollablePlaybackRateButton() {
        const button = document.createElement("button");
        button.className = "mpj-scrollable-playback-rate-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, "1.00x", false);

        button.activate = function () { this.style.color = settings.activeButtonColor; };
        button.deactivate = function () { this.style.color = settings.normalButtonColor; };

        button.onclick = function () { setPlaybackRate(1); };

        button.onwheel = function (event) {
            event.preventDefault();
            pageElements.get("ytInterface").wakeUpControls();
            // Determine the scroll direction and set the playback rate accordingly.
            setPlaybackRate(Math.sign(-event.deltaY) * settings.playbackRateStep, { relative: true });
        };

        return button;
    }


    /**
     * Create and return a playback rate step button with the specified multiplier.
     * @param {number} multiplier - A multiplier for the playback rate adjustment step size `settings.playbackRateStep`.
     * @returns {HTMLButtonElement} The created button.
     */
    function createPlaybackRateStepButton(multiplier) {
        const button = document.createElement("button");
        button.className = "mpj-playback-rate-step-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, multiplier < 0 ? "<<" : ">>");
        button.style.width = "auto";
        button.style.padding = "0px 3px";

        button.onclick = function () { setPlaybackRate(multiplier * settings.playbackRateStep, { relative: true }); };

        return button;
    }


    /**
     * Create and return the custom volume button.
     * @returns {HTMLButtonElement} The created button.
     */
    function createVolumeButton() {
        const button = document.createElement("button");
        button.className = "mpj-volume-button ytp-button";

        applyCommonButtonStyle(button);
        addTextToButton(button, pageElements.get("ytInterface").isMuted() ? "M" : `${pageElements.get("ytInterface").getVolume()}%`, false);
        button.title = "Volume";

        button.onclick = function () {
            if (pageElements.get("ytInterface").isMuted()) { setVolume({ muted: false }); }
            else { setVolume({ muted: true }); }
        };

        button.onwheel = function (event) {
            event.preventDefault();
            pageElements.get("ytInterface").wakeUpControls();

            // Do nothing if the volume is muted.
            if (pageElements.get("ytInterface").isMuted()) { return; }
            // Determine the scroll direction and set the volume accordingly.
            setVolume({ volume: Math.sign(-event.deltaY) * settings.volumeStep, relative: true });
        };

        return button;
    }


    /**
     * Listen for and handle `volumechange` events on the `corePlayer`.
     */
    function listenForVolumeChanges() {
        // Set up a handler function for 'volumechange' events.
        function volumechangeHandler() {
            buttons.volumeButton.setTextContent(pageElements.get("ytInterface").isMuted() ? "M" : `${pageElements.get("ytInterface").getVolume()}%`);
        }

        pageElements.get("corePlayer").addEventListener("volumechange", volumechangeHandler);
        logger.info("Added a listener for changes in playback volume.");
    }


    /**
     * Add buttons to the YouTube player according to the player button cofiguration in `settings.playerButtons`.
     */
    async function addButtons() {
        logger.debug("Parsing the player buttons...");

        // First create the button wrapper.
        const wrapper = createButtonWrapper();

        // Parse the buttons from the script settings.
        for (const button of settings.playerButtons) {
            // If this button is a number, create a fixed playback rate button.
            const rate = parseFloat(button);
            if (!isNaN(rate)) {
                // Skip this button if the playback rate is invalid.
                if (rate < 0.1 || rate > 10) {
                    logger.warn("Skipped adding a playback rate button because its playback rate is not between 0.1 and 10!");
                    continue;
                }
                // Create a fixed playback rate button for the given playback rate.
                const rateId = rate.toFixed(2);
                buttons.playbackRateButtons[rateId] = buttons.playbackRateButtons[rateId] || createFixedPlaybackRateButton(rate);
                wrapper.appendChild(buttons.playbackRateButtons[rateId]);
                continue;
            }

            // If this button is not a number, check whether it matches any special button specifier.
            switch (String(button).trim().toLowerCase()) {
                case "r":
                    // Create the remember playback rate button.
                    buttons.rememberButton = buttons.rememberButton || createRememberButton();
                    wrapper.appendChild(buttons.rememberButton);
                    break;
                case "s":
                    // Create the scrollable rate button.
                    buttons.scrollablePlaybackRateButton = buttons.scrollablePlaybackRateButton || createScrollablePlaybackRateButton();
                    wrapper.appendChild(buttons.scrollablePlaybackRateButton);
                    break;
                case "<":
                    // Create the playback rate decrement button.
                    buttons.playbackRateDecrementButton = buttons.playbackRateDecrementButton || createPlaybackRateStepButton(-1);
                    wrapper.appendChild(buttons.playbackRateDecrementButton);
                    break;
                case ">":
                    // Create the playback rate increment button.
                    buttons.playbackRateIncrementButton = buttons.playbackRateIncrementButton || createPlaybackRateStepButton(1);
                    wrapper.appendChild(buttons.playbackRateIncrementButton);
                    break;
                case "v":
                    // Create the volume button.
                    buttons.volumeButton = buttons.volumeButton || createVolumeButton();
                    wrapper.appendChild(buttons.volumeButton);
                    listenForVolumeChanges();
                    break;
                default:
                    logger.warn(`Skipped adding a player button because its specifier '${button}' is not valid!`);
            }
        }

        buttons.wrapper = wrapper;
        logger.debug("Parsed the player buttons. Adding the player buttons to the DOM...");

        // Add the wrapper to the DOM.
        const ytpRightControls = await pageElements.await("ytpRightControls");
        ytpRightControls.prepend(wrapper);
        // Visually select the playback rate button that matches the current playback rate, if any.
        selectPlaybackRateButton();
        logger.info("Added the player buttons to the DOM.");
    }


    /**
     * Return the ID of the current playlist, or the empty string if no playlist is loaded.
     * @returns {string} The ID of the current playlist, or the empty string if no playlist is loaded.
     */
    function getPlaylistId() {
        // const listId = new URL(document.location).searchParams.get("list");
        // return listId ? listId : "";
        return pageElements.get("ytInterface").getPlaylistId() || "";
    }


    /**
     * Create and return the exclude current playlist button.
     * @returns {HTMLButtonElement} The created button.
     */
    function createExcludeButton() {
        const button = document.createElement("button");
        button.className = "mpj-exclude-button ytp-button";

        applyCommonButtonStyle(button);
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.width = "auto";
        button.style.padding = "0px 2px";
        button.title = "Exclude Current Playlist";

        // Create an X-shape using some span elements.
        // First, create a square span that scales with the height of the button.
        const span = document.createElement("span");
        span.style.position = "relative";
        span.style.height = "round(33%, 1px)";
        span.style.aspectRatio = "1 / 1";
        button.appendChild(span);

        // Add two lines to form the X-shape using absolute positioning.
        button.style.setProperty("--mpj-exclude-button-color", settings.normalButtonColor);
        const lineWidth = 2;
        for (const rotation of ["rotate(45deg)", "rotate(-45deg)"]) {
            const line = document.createElement("span");
            line.style.position = "absolute";
            line.style.width = `${lineWidth}px`;
            line.style.height = "100%";
            line.style.backgroundColor = "var(--mpj-exclude-button-color)";
            line.style.top = "0px";
            line.style.left = `calc(50% - ${lineWidth / 2}px)`;
            line.style.transform = rotation;
            span.appendChild(line);
        }

        button.activate = function () { this.style.setProperty("--mpj-exclude-button-color", "#ff0000"); };
        button.deactivate = function () { this.style.setProperty("--mpj-exclude-button-color", settings.normalButtonColor); };

        button.onclick = function () {
            const excludedList = storage.getValue(constants.storageKeys.excludedPlaylists, []);
            const index = excludedList.indexOf(state.playlistId);
            if (index > -1) {
                excludedList.splice(index, 1);
                this.deactivate();
            }
            else {
                excludedList.push(state.playlistId);
                this.activate();
            }
            storage.setValue(constants.storageKeys.excludedPlaylists, excludedList);
        }

        return button;
    }


    /**
     * Handle `wheel` events by skipping the current video forwards or backwards depending on the scroll direction.
     * @param {WheelEvent} event - The `wheel` event to handle.
     */
    function scrollToSkipHandler(event) {
        event.preventDefault();
        pageElements.get("ytInterface").wakeUpControls();

        // Determine the scroll direction and skip accordingly.
        let key, keyCode;
        if (event.deltaY < 0) {
            key = "ArrowRight";
            keyCode = 39;
        }
        else {
            key = "ArrowLeft";
            keyCode = 37;
        }

        pageElements.get("ytdPlayer").dispatchEvent(
            new KeyboardEvent("keydown", { key: key, code: key, keyCode: keyCode, which: keyCode, bubbles: true })
        );
    }


    /**
     * Modify YouTube's native volume button by adjusting the volume step size for when scrolling over the button.
     */
    async function modifyNativeVolumeButton() {
        const ytpVolumePanel = await pageElements.await("ytpVolumePanel");
        ytpVolumePanel.onwheel = function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            pageElements.get("ytInterface").wakeUpControls();

            // Do nothing if the volume is muted.
            if (pageElements.get("ytInterface").isMuted()) { return; }
            // Determine the scroll direction and set the volume accordingly.
            setVolume({ volume: Math.sign(-event.deltaY) * settings.nativeVolumeSliderStep, relative: true });
        }
        logger.info("Modified the native volume button.");
    }


    /**
     * Return a parsed version of the specified playback quality label.
     * The label is parsed by taking every character up to and including the first lower case 'p'. If the label does
     * not include a lower case 'p', the entire label is taken. The resulting value is then converted to lower case.
     * @param {string} label - The playback quality label to parse.
     * @returns {string} A parsed version of the specified playback quality label.
     */
    function parsePlaybackQualityLabel(label) {
        const sliceIndex = label.indexOf("p");
        return (sliceIndex !== -1 ? label.slice(0, sliceIndex + 1) : label).toLowerCase();
    }


    /**
     * Listen for and handle trusted `click` events on the YouTube playback quality controls.
     * In other words, detect user-initiated playback quality changes. The target playback quality is stored in
     * `state.targetPlaybackQuality` and in the persistent data storage of the script.
     */
    function listenForUserPlaybackQualityChanges() {
        // Set up a handler function for 'click' events.
        function clickHandler(event) {
            if (event.isTrusted && event.target.closest(".ytp-quality-menu") && event.target.closest(".ytp-menuitem")) {
                // These clicks can only be reliably identified before they bubble to their target.
                // Hence, the new quality must be parsed from the text content of the menu item that was clicked.
                const quality = parsePlaybackQualityLabel(event.target.textContent);

                state.targetPlaybackQuality = quality;
                storage.setValue(constants.storageKeys.targetPlaybackQuality, quality);
                logger.debug(`Detected a user-initiated playback quality change! The new quality is '${quality}'.`);
            }
        }

        document.addEventListener("click", clickHandler, true);
        logger.info("Added a listener for user-initiated playback quality changes.");
    }


    /**
     * Attempt to set the playback quality of the YouTube player to the specified resolution.
     * If the desired resolution is not available, attempt to select the nearest higher available resolution.
     * If there is no higher resolution available, select the highest available resolution.
     * @param {string} resolution - The desired resolution in `string` format, for example `"1080p"`.
     */
    function setPlaybackQuality(resolution) {
        // Do nothing if the target playback quality is 'auto'.
        if (resolution === "auto") {
            logger.debug("Skipped setting the playback quality because the target quality is 'auto'.");
            return;
        }

        logger.debug(`Attempting to set the playback quality to ${resolution}.`);

        // Ensure that the desired playback quality is valid.
        const qualityLabels = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "2880p", "4320p"];
        let qualityLabelIndex = qualityLabels.findIndex(label => label === resolution);
        if (qualityLabelIndex === -1) {
            logger.error(`The specified playback quality '${resolution}' is invalid!`);
            return;
        }

        // Check whether the desired playback quality is available.
        const availableQualityData = pageElements.get("ytInterface").getAvailableQualityData();
        if (availableQualityData.length < 1) {
            logger.error("Failed to set the playback quality because ytInterface did not return any quality data!");
            return;
        }
        function getQualityIndex(label) { return availableQualityData.findIndex(data => data.qualityLabel.startsWith(label)); }
        let qualityIndex = getQualityIndex(qualityLabels[qualityLabelIndex]);

        // If the desired quality is not available, select either the nearest higher available quality or the highest available quality.
        if (qualityIndex === -1) {
            logger.debug(`The specified playback quality '${resolution}' is not available! Selecting the nearest available quality.`);
            const highestAvailableQualityLabelIndex = qualityLabels.findIndex(label => availableQualityData[0].qualityLabel.startsWith(label));
            qualityLabelIndex++;

            // If there is no available quality that is higher than the desired quality, select the highest available quality.
            if (qualityLabelIndex >= highestAvailableQualityLabelIndex) { qualityIndex = 0; }
            // Otherwise, select the nearest higher available quality.
            else {
                do {
                    qualityIndex = getQualityIndex(qualityLabels[qualityLabelIndex]);
                    qualityLabelIndex++;
                } while (qualityIndex === -1 && qualityLabelIndex <= highestAvailableQualityLabelIndex);

                // Safety check to ensure that the while loop resulted in an available quality. This should never execute.
                if (qualityIndex === -1) {
                    logger.error("Expected at least one available playback quality between the desired and maximum quality, but no such quality was found!");
                    return;
                }
            }
        }

        // Apply the selected playback quality.
        const quality = availableQualityData[qualityIndex].quality;
        pageElements.get("ytInterface").setPlaybackQualityRange(quality);
        logger.info(`Playback quality has been set to ${quality}.`);
    }


    /**
     * Listen for and handle changes in playback quality, ensuring that the target playback quality is applied.
     * The target playback quality is read from `state.targetPlaybackQuality`.
     */
    function listenForPlaybackQualityChanges() {
        // Set up a handler function for 'onPlaybackQualityChange' events.
        function onPlaybackQualityChangeHandler() {
            const newQuality = parsePlaybackQualityLabel(pageElements.get("ytInterface").getPlaybackQualityLabel());
            logger.debug(`Detected a playback quality change! The new quality is '${newQuality}'.`);

            // If the new playback quality does not match the target quality, apply the target quality.
            if (state.targetPlaybackQuality !== newQuality) {
                logger.warn("Overwriting a playback quality change that was not user-initiated!");
                setPlaybackQuality(state.targetPlaybackQuality);
            }
        }

        // Apply the target playback quality at the start of the script.
        if (constants.autoDetectPlaybackQuality) { state.targetPlaybackQuality = storage.getValue(constants.storageKeys.targetPlaybackQuality, "auto"); }
        setPlaybackQuality(state.targetPlaybackQuality);

        pageElements.get("ytInterface").addEventListener("onPlaybackQualityChange", onPlaybackQualityChangeHandler);
        logger.info("Added a listener for changes in playback quality.");
    }


    /**
     * Crop the darkening gradient that appears at the bottom of the YouTube player, limiting its height.
     */
    async function cropBottomGradient() {
        const ytpGradientBottom = await pageElements.await("ytpGradientBottom");
        ytpGradientBottom.style.maxHeight = settings.bottomGradientMaxHeight;
        logger.info("Cropped the bottom gradient.");
    }


    /**
     * Disable YouTube's autonav feature, also known as autoplay.
     */
    async function disableAutonav() {
        // Exit the function if the current page has an active playlist, since autonav is always disabled for playlists.
        if (state.playlistId) { return; }

        const ytpAutonavButton = await helpers.Dom.PageElementManager.awaitElement(() => {
            // The autonav button element is only valid once its checkVisibility() method returns true.
            const element = pageElements.get("ytdPlayer").querySelector(".ytp-autonav-toggle-button");
            if (element && element.checkVisibility()) { return element; }
            return null;
        });

        if (ytpAutonavButton.getAttribute("aria-checked") === "true") {
            ytpAutonavButton.click();
            logger.info("Disabled autonav.");
        }
    }


    /**
     * Allow the script to observe YouTube's pop-up container element for new pop-ups.
     * Currently, this function only handles the automatic dismissal of idle confirmation pop-ups.
     */
    async function observePopups() {
        // Set up a handler function for the 'popupObserver' MutationObserver.
        async function popupObserverHandler(mutationList) {
            // Set up a local function to dismiss the idle confirmation pop-up.
            async function dismissIdleConfirmationPopup(popup) {
                const confirmButton = await helpers.Dom.PageElementManager.awaitElement(() => popup.querySelector("#confirm-button"), 0, popup);
                confirmButton.click();
                logger.info("Automatically dismissed an idle confirmation pop-up.");

                // When the pop-up is dismissed, playback does not automatically resume unless the browser tab is open.
                // Hence, the script should attempt to resume playback after dismissing the pop-up.
                pageElements.get("ytInterface").playVideo();
            }

            // Set up a handler function for the 'idleConfirmationPopupObserver' MutationObserver.
            function idleConfirmationPopupObserverHandler(mutationList) {
                for (const mutation of mutationList) {
                    if (mutation.target.getAttribute("aria-hidden") !== "true") {
                        dismissIdleConfirmationPopup(mutation.target);
                    }
                }
            }

            // Handle childList mutations from the pop-up container element.
            for (const mutation of mutationList) {
                for (const node of mutation.addedNodes) {
                    // Skip any node that does not match an idle confirmation pop-up.
                    if (node.tagName !== "TP-YT-PAPER-DIALOG") { continue; }

                    // Wait for the textContent of the pop-up to load.
                    const textContentNode = await helpers.Dom.PageElementManager.awaitElement(() => node.querySelector("yt-formatted-string.line-text.style-scope.yt-confirm-dialog-renderer"), 5000, node);

                    // Check whether the textContent matches an idle confirmation pop-up.
                    if (textContentNode.textContent !== "Video paused. Continue watching?") { continue; }

                    // Automatically click the confirm button on the confirmation message.
                    dismissIdleConfirmationPopup(node);

                    // When dismissed, the pop-up is not deleted from the DOM but instead becomes hidden.
                    // Hence, a new MutationObserver is required to catch future occurrences.
                    observers.idleConfirmationPopupObserver = new MutationObserver(idleConfirmationPopupObserverHandler);
                    observers.idleConfirmationPopupObserver.observe(node, { attributes: true, attributeFilter: ["aria-hidden"] });
                    logger.info("Enabled idleConfirmationPopupObserver to catch further occurrences of the idle confirmation pop-up.");
                }
            }
        }

        const ytdPopupContainer = await helpers.Dom.PageElementManager.awaitElement(() => document.querySelector("ytd-popup-container"));
        observers.popupObserver = new MutationObserver(popupObserverHandler);
        observers.popupObserver.observe(ytdPopupContainer, { childList: true, subtree: false });
        logger.info("Enabled popupObserver for pop-up detection.");
    }


    /**
     * Allow the script to observe YouTube's `movie_player` element.
     * Currently, this function only handles trailer detection.
     */
    function observeMoviePlayer() {
        const ytInterface = pageElements.get("ytInterface");

        // Set up a handler function for the 'moviePlayerObserver' MutationObserver.
        function moviePlayerObserverHandler() {
            // Determine whether a trailer is currently loaded.
            const overlays = ytInterface.querySelectorAll(".html5-ypc-overlay");
            for (const overlay of overlays) {
                if (overlay.textContent !== "Trailer") { continue; }

                // If a trailer is loaded and has not yet been muted, mute its audio.
                if (state.trailerMuted) { return; }
                ytInterface.mute();
                state.trailerMuted = true;
                logger.info("Muted a trailer's audio.");
                return;
            }

            // If no trailer is loaded but one was muted previously, unmute the audio.
            if (!state.trailerMuted) { return; }
            ytInterface.unMute();
            state.trailerMuted = false;
            logger.info("Unmuted the audio because no trailer is present anymore.");
        }

        observers.moviePlayerObserver = new MutationObserver(moviePlayerObserverHandler);
        observers.moviePlayerObserver.observe(ytInterface, { childList: true, subtree: false });
        logger.info("Enabled moviePlayerObserver for trailer detection.");

        // Run moviePlayerObserverHandler manually to avoid race conditions.
        moviePlayerObserverHandler();
    }


    /**
     * Attempt to apply the saved playback rate.
     */
    function applySavedPlaybackRate() {
        // Check whether automatic playback rate is enabled.
        if (!buttons.rememberButton || !storage.getValue(constants.storageKeys.autoPlaybackRate, false)) {
            logger.info("Automatic playback rate is disabled.");
            return;
        }

        const savedRate = storage.getValue(constants.storageKeys.savedPlaybackRate, 1);
        logger.info(`Automatic playback rate is enabled, attempting to set the playback rate to ${savedRate.toFixed(2)}x...`);
        buttons.rememberButton.activate();

        // If the option is enabled, check whether this is a new browser session and set the playback rate accordingly.
        if (settings.resetPlaybackRateOnNewSession && !storage.getCookie(constants.sessionCookieName)) {
            // Set a new session cookie to ensure that this only executes once per session.
            storage.setCookie(constants.sessionCookieName, true);

            logger.info("Detected a new browser session, setting playback rate to 1x.");
            setPlaybackRate(1);
            return;
        }

        // Check whether the current page is a playlist. If so, check whether the playlist is excluded.
        if (storage.getValue(constants.storageKeys.excludedPlaylists, []).includes(state.playlistId)) {
            // If the current playlist is excluded, do not set the playback rate.
            logger.info("Playback rate cannot be set because the current playlist is excluded from automatic playback rate.");
            buttons.excludeButton.activate();
            return;
        }

        // If the current page is a live stream, set the playback rate to 1x without changing the saved playback rate.
        // YouTube does not set the playback rate to 1x on its own when moving from a video to a stream until it buffers.
        if (state.isLiveStream) {
            logger.info("Playback rate cannot be set because the current page is a live stream.");
            setPlaybackRate(1, { saveRate: false, enforce: true });
            return;
        }

        // If a minimum video duration for automatic playback rate is set, check if the current video is long enough.
        if (pageElements.get("ytInterface").getDuration() < settings.automaticPlaybackRateMinimumVideoDuration) {
            logger.info("Playback rate cannot be set because the current video's duration is below the specified minimum.");
            return;
        }

        // If none of the above conditions have triggered, apply the saved playback rate.
        setPlaybackRate(savedRate, { saveRate: false });
        logger.info(`Set the playback rate to ${savedRate.toFixed(2)}x successfully.`);
    }


    /**
     * The main function of the script.
     */
    async function scriptMain() {
        if (!state.isInitialized) {
            // Initialize the required page elements.
            await pageElements.initialize();

            // Listen for changes in playback rate.
            listenForPlaybackRateChanges();
            state.playbackRate = pageElements.get("corePlayer").playbackRate;

            state.isInitialized = true;
        }

        // Determine whether the current page is a live stream.
        // NOTE: This could be obtained from ytInterface.getVideoData() instead.
        state.isLiveStream = pageElements.get("ytpTimeDisplay").classList.contains("ytp-live");
        await observeLiveStateChanges();

        // Get the ID of the current playlist, if any.
        state.playlistId = getPlaylistId();

        logger.debug("Initial script state:", state);

        // Perform any actions that are only required to run for the first video in the current browser tab.
        // The most important actions are executed first.
        if (state.isFirstVideo) {
            state.isFirstVideo = false;

            // Set the volume to the value stored in its localStorage entry, if the option is enabled.
            if (settings.improveVolumeConsistency) {
                setVolume({ fromStored: true });
                logger.info("Improved volume consistency by loading its most recent value.");
            }
            // If the current volume exceeds the set maximum initial volume, cap it to the maximum.
            else if (pageElements.get("ytInterface").getVolume() > settings.maxInitialVolume) {
                setVolume({ volume: settings.maxInitialVolume });
                logger.info("Capped the initial volume.")
            }

            // Enable theater mode, if the option is enabled.
            if (settings.automaticTheaterMode) { setTheaterMode(true); }

            // Ensure that the spacebar always pauses and unpauses playback, if the option is enabled.
            if (settings.alwaysPauseAndUnpauseWithSpacebar) { listenForPlayerControlsFocusin(); }

            // Add the player buttons of the script.
            addButtons();

            // Configure event listeners for keyboard shortcuts, if the option is enabled.
            if (settings.enableKeyboardShortcuts) {
                logger.debug("Enabling custom keyboard shortcuts with the following shortcut map:", shortcutManager.shortcutMap);
                shortcutManager.connect();
                logger.info("Enabled custom keyboard shortcuts.");
            }

            // Enable scroll to skip, if the option is enabled.
            if (settings.enableScrollToSkip) {
                pageElements.get("ytpTimeDisplay").addEventListener("wheel", scrollToSkipHandler);
                logger.info("Enabled scroll to skip on the time display.");
            }

            // Modify YouTube's native volume button, if the option requires it.
            if (settings.nativeVolumeSliderStep != 10) { modifyNativeVolumeButton(); }

            // Listen for playback quality changes, if automatic playback quailty is enabled.
            if (settings.automaticFixedResolution) { listenForPlaybackQualityChanges(); }

            // Crop the bottom gradient, if the option is enabled.
            if (settings.cropBottomGradient) { cropBottomGradient(); }

            // Ensure that autonav is disabled, if the option is enabled.
            if (settings.automaticallyDisableAutonav) { disableAutonav(); }

            // Automatically dismiss idle confirmation pop-ups, if the option is enabled.
            if (settings.automaticallyDismissIdleConfirmationPopups) { observePopups(); }

            // Automatically mute trailers, if the option is enabled.
            if (settings.muteTrailers) { observeMoviePlayer(); }
        }

        // Add or remove the exclude playlist button depending on whether the current page is a playlist.
        const excludeButtonExists = document.body.contains(buttons.excludeButton || null);
        if (state.playlistId) {
            // Add the exclude button if: the button is not yet present, the current page is a playlist, and the remember playback rate button exists.
            if (!excludeButtonExists && buttons.rememberButton) {
                buttons.excludeButton = buttons.excludeButton || createExcludeButton();
                buttons.wrapper.prepend(buttons.excludeButton);
                logger.debug("Added the exclude playlist button to the DOM.");
            }
        }
        // If the exclude button is present but the current page is not a playlist, remove the button.
        else if (excludeButtonExists) {
            buttons.excludeButton.remove();
            logger.debug("Removed the exclude playlist button from the DOM.");
        }

        // Finally, attempt to apply the saved playback rate.
        applySavedPlaybackRate();
    }


    // Execution of the script starts here.

    // Create convenient aliases for the script's helper functions.
    const helpers = window.MpjHelpers;
    const storage = helpers.Storage;

    // Set up a logger.
    const logger = new helpers.Logging.Logger(settings.logLevel, "[MPJ|YTPT]", settings.logDebugToInfo);

    logger.info("Starting userScript 'YouTube Playback Tweaks' by MPJ-K...");

    // Set up an object to hold the global constants of the script.
    const constants = {
        sessionCookieName: "mpj-ytpt-session",

        storageKeys: {
            autoPlaybackRate: "mpj-ytpt-auto-playback-rate",
            savedPlaybackRate: "mpj-ytpt-saved-playback-rate",
            excludedPlaylists: "mpj-ytpt-excluded-playlists",
            targetPlaybackQuality: "mpj-ytpt-target-playback-quality",
        },

        autoDetectPlaybackQuality: settings.automaticFixedResolution === "autodetect",
    };

    // Set up an object to hold the global state of the script.
    const state = {
        playbackRate: NaN,

        isInitialized: false,
        isFirstVideo: true,

        isLiveStream: false,
        isLive: false,

        playlistId: "",

        targetPlaybackQuality: settings.automaticFixedResolution,

        trailerMuted: false,
    };

    // Set up a PageElementManager to help acquire page elements that are required by the script.
    const pageElements = new helpers.Dom.PageElementManager({
        ytdPlayer: () => document.getElementById("ytd-player"),
        ytInterface: () => document.getElementById("movie_player"),

        corePlayer: () => pageElements.get("ytdPlayer").querySelector("video"),
        ytpTimeDisplay: () => pageElements.get("ytdPlayer").querySelector(".ytp-time-display"),

        ytpLiveBadge: () => pageElements.get("ytdPlayer").querySelector(".ytp-live-badge.ytp-button"),
        ytpSizeButton: () => pageElements.get("ytdPlayer").querySelector(".ytp-size-button.ytp-button"),
        // ytdPageManager: () => document.getElementsByTagName("ytd-watch-flexy")[0],
        ytpRightControls: () => pageElements.get("ytdPlayer").querySelector(".ytp-right-controls"),
        ytpVolumePanel: () => pageElements.get("ytdPlayer").querySelector(".ytp-volume-panel"),
        ytpGradientBottom: () => pageElements.get("ytdPlayer").querySelector(".ytp-gradient-bottom"),
        // ytpAutonavButton: () => pageElements.get("ytdPlayer").querySelector(".ytp-autonav-toggle-button"),
    });

    // Implement the PageElementManager's initialize() method.
    pageElements.initialize = async function () {
        logger.info("Initializing the required page elements...");

        // First of all, ensure that the script has access to the 'ytd-player' and 'movie_player' elements.
        logger.debug("Awaiting ytd-player and movie_player...");
        await Promise.all([this.await("ytdPlayer"), this.await("ytInterface")]);
        logger.debug("Acquired ytd-player and movie_player.");

        // Await any elements that are essential to the initialization of the script.
        logger.debug("Awaiting essential elements...");
        await Promise.all([this.await("corePlayer"), this.await("ytpTimeDisplay")]);
        logger.debug("Acquired essential elements.");

        logger.info("Finished initializing the required page elements.");
    };

    // Set up an object to hold the MutationObservers that are used by the script.
    const observers = {};

    // Set up an object to hold the buttons that are created by the script.
    const buttons = { playbackRateButtons: {} };

    // Listen for user-initiated playback quality changes if automatic playback quality is enabled.
    if (settings.automaticFixedResolution) { listenForUserPlaybackQualityChanges(); }

    // Set up a KeyboardShortcutManager if keyboard shortcuts are enabled.
    const shortcutManager = settings.enableKeyboardShortcuts ? new helpers.Dom.KeyboardShortcutManager(
        {
            "playbackRateIncrementShortcut": {
                keyCombination: settings.playbackRateIncrementShortcut,
                trigger: () => setPlaybackRate(settings.playbackRateStep, { relative: true })
            },
            "playbackRateDecrementShortcut": {
                keyCombination: settings.playbackRateDecrementShortcut,
                trigger: () => setPlaybackRate(-settings.playbackRateStep, { relative: true })
            },
            "playbackRateResetShortcut": {
                keyCombination: settings.playbackRateResetShortcut,
                trigger: () => setPlaybackRate(1)
            },
            "playbackRatePreservesPitchShortcut": {
                keyCombination: settings.playbackRatePreservesPitchShortcut,
                trigger: () => {
                    const corePlayer = pageElements.get("corePlayer");
                    corePlayer.preservesPitch = !corePlayer.preservesPitch;
                }
            },
            "volumeIncrementShortcut": {
                keyCombination: settings.volumeIncrementShortcut,
                trigger: () => setVolume({ volume: settings.volumeStep, relative: true })
            },
            "volumeDecrementShortcut": {
                keyCombination: settings.volumeDecrementShortcut,
                trigger: () => setVolume({ volume: -settings.volumeStep, relative: true })
            },
        },
        () => pageElements.get("ytInterface").wakeUpControls()
    ) : undefined;

    // Listen for page changes and run scriptMain() on every watch page.
    const pageChangeManager = new helpers.Dom.PageChangeManager(
        scriptMain,
        URL => URL.startsWith("https://www.youtube.com/watch"),
        true,
        logger
    );
    pageChangeManager.connect("yt-page-data-updated");
})();
