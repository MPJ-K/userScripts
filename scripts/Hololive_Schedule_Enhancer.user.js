// ==UserScript==
// @name         Hololive Schedule Enhancer
// @namespace    https://github.com/MPJ-K/userScripts
// @version      2025.10.04.01
// @description  Enhances the Hololive schedule page by adding day navigation buttons and making it remember the selected timezone. Script behavior is configurable.
// @icon         https://schedule.hololive.tv/dist/favicon.ico
// @grant        none
// @author       MPJ-K
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/logging_helpers.js#sha256-ddYDZR5bgGwvIGxF1w7xGaEI7UBMovYQJBrXLmyTtFs=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/storage_helpers.js#sha256-nSqlM59rXDE/NCDeSAuC1svjr7ooZpQl8aQIbdp+MzA=
// @require      https://raw.githubusercontent.com/MPJ-K/userScripts/25e04ec48899cb575105a859f3678ee1dc2bbd00/helpers/dom_helpers.js#sha256-pEZlv2TApVkBE5k1MMfjKVYgNFo2SyQSiCgF9TuHG0s=
// @match        https://schedule.hololive.tv/*
// @updateURL    https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Hololive_Schedule_Enhancer.user.js
// @downloadURL  https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Hololive_Schedule_Enhancer.user.js
// ==/UserScript==

/**
 * README
 * 
 * Hololive Schedule Enhancer aims to improve the user experience on the Hololive schedule page (schedule.hololive.tv).
 * The script currently offers the following optional features:
 * - Day navigation buttons
 * - Timezone cookie expiration updates
 * - Improved channel icon display
 * 
 * The script settings section located below this README contains a more detailed description for each feature.
 * 
 * I am by no means a professional programmer, but I have done my best to properly document the implementation of the
 * script. If you have any feedback or suggestions, please open an issue on GitHub.
 * 
 * Thank you for trying out my scripts!
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

        addDayNavigationButtons: true,
        // Whether to add a pair of custom day navigation buttons to the Hololive schedule.
        // The buttons are fixed to the bottom right corner of the page and take the form of an up and down arrow.
        // When the corresponding button is clicked, the page will scroll to the start of the next or previous day in
        // the schedule.
        // Default: true

        updateTimezoneCookieExpirationDate: false,
        // Whether to refresh the expiration date of the Hololive schedule's timezone cookie.
        // The schedule page remembers your selected timezone using a cookie with an expiration date of one week.
        // However, because the page never updates the expiration date, it forgets your timezone selection every week.
        // If this option is enabled, the script will refresh the expiration date of the cookie whenever you load the
        // schedule page. That way, the page should never forget your selected timezone.
        // This setting is disabled by default because some users may not be comfortable with scripts that set cookies.
        // Nevertheless, enabling this option is strongly recommended.
        // See also the timezoneCookieExpirationTime setting below.
        // Default: false
        timezoneCookieExpirationTime: 604800000,
        // The expiration time to set for the timezone cookie in milliseconds.
        // If the updateTimezoneCookieExpirationDate setting is enabled, the script will set the expiration date of the
        // timezone cookie to this many milliseconds from the time at which the schedule page was loaded.
        // The value for this setting can be calculated by multiplying down from your desired duration to milliseconds.
        // Here is an example calculation for the default value of one week:
        // 7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds = 604,800,000 milliseconds
        // Default: 604800000

        fixChannelIconDisplay: true,
        // Whether to improve the way channel icons are displayed on the Hololive schedule.
        // If a video links many different YouTube channels, the channel icons displayed on the schedule can become
        // tiny since they all have to fit in one row. When this option is enabled, the script will calculate and apply
        // the optimal row count to maximize the size of the channel icons while still fitting in the available space.
        // Additionally, the script will ensure that all channel icons are centered within their row.
        // Default: true

        enableKeyboardShortcuts: false,
        // Whether to enable custom keyboard shortcuts for navigating between schedule days.
        // The key combinations can be customized below.
        // Default: false
        previousDayShortcut: "ArrowUp",
        nextDayShortcut: "ArrowDown",
        // These settings specify the key combinations used for the custom keyboard shortcuts.
        // Shortcuts must end in exactly one valid key, preceeded by any number of valid modifier keys separated by
        // spaces. Valid modifiers are 'ctrl', 'alt', 'shift' and 'meta'. The input is not case-sensitive and the order
        // of the modifiers does not matter. To disable a shortcut, use the empty string: "".
        // See the following URL for valid names of special keys:
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
        // Defaults:
        // previousDayShortcut: "ArrowUp", nextDayShortcut: "ArrowDown"
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Update the expiration date of the cookie with the specified name to the given expiration date.
     * If the cookie does not exist, this function has no effect.
     * @param {string} name - The name of the cookie.
     * @param {Date} expirationDate - The expiration date to set.
     */
    function updateCookieExpiration(name, expirationDate) {
        const value = storage.getCookie(name);
        if (value) { storage.setCookie(name, value, expirationDate); }
    }


    /**
     * Return the element from elements that is vertically closest to the center of the viewport, searching upward if up is true and downward otherwise.
     * If no element qualifies, return undefined.
     * @param {Iterable.<Element>} elements - The iterable of elements to check.
     * @param {boolean} up - Whether to search upwards or downwards.
     * @param {number} [deadzone=50] - An element must be at least this many pixels away in the specified direction to qualify.
     * @returns {Element=} The resulting element, or undefined if none qualify.
     */
    function findClosestElement(elements, up, deadzone = 50) {
        let closest, closestDistance = up ? -Infinity : Infinity;
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            const elementCenter = rect.top + (rect.height / 2);
            const distance = elementCenter - (window.visualViewport.height / 2);
            // logger.debug(`elementCenter = ${elementCenter}, distance = ${distance}`);

            if ((up && distance < -deadzone && distance > closestDistance) || (!up && distance > deadzone && distance < closestDistance)) {
                closest = element;
                closestDistance = distance;
            }
        }

        return closest;
    }


    /**
     * Find the closest day separator of the Hololive schedule in the specified direction and scroll it into view.
     * When attempting to scroll down from the last day separator, scroll to the bottom of the page.
     * @param {boolean} up - Whether to search upwards or downwards.
     */
    async function scrollToClosestDay(up) {
        const closest = findClosestElement(await pageElements.await("dayNavbars"), up);
        if (closest) {
            closest.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            logger.info(`Navigated ${up ? "up" : "down"} to the nearest day.`);
        }
        // If no day separator can be found below, scroll to the bottom of the page.
        else if (!up) {
            window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" });
            logger.info("Navigated down to the bottom of the page.");
        }
    }


    /**
     * Handle click events for the day navigation buttons.
     * Determine whether the up or down button was pressed, then scroll to the closest day in that direction.
     */
    function dayNavButtonClickHandler() {
        scrollToClosestDay(this.textContent === "▲");
    }


    /**
     * Return a day navigation button with the given text and attach the given handler function for click events.
     * @param {string} text - The textContent to set for the button.
     * @param {Function} handler - The click event handler function for the button.
     * @returns {HTMLButtonElement} The created day navigation button.
     */
    function createDayNavButton(text, handler) {
        const button = document.createElement("button");
        button.style.position = "fixed";
        button.style.right = "20px";
        button.style.width = "40px";
        button.style.height = "40px";
        button.style.backgroundColor = "#303030";
        button.style.border = "2px solid #87ceeb";
        button.style.borderRadius = "8px";
        button.style.color = "#87ceeb";
        button.style.fontSize = "20px";
        button.style.outline = "none";

        button.textContent = text;
        button.addEventListener("click", handler);
        return button;
    }


    /**
     * When fitting N square elements into the area given by width x height, return the number of rows in which to organize the elements such that the size of the elements is maximum.
     * @param {number} N - The number of square elements to fit.
     * @param {number} width - The width of the area in which to fit the elements.
     * @param {number} height - The height of the area in which to fit the elements.
     * @returns {number} The number of rows in which to organize the elements such that the size of the elements is maximum.
     */
    function getOptimalRowCount(N, width, height) {
        const widthPerItem = width / N;
        // As far as I know, there is no general solution to this problem. Therefore, the easiest option is to apply brute force.
        // That said, for the purposes of this script, the while loop should stop within 3 or less iterations.
        // The while loop should be safe. It must terminate eventually because its condition is false for rows = Infinity.
        let rows = 1;
        while (rows * widthPerItem <= height / (rows + 1)) { rows += 1; }
        return rows;
    }


    /**
     * Create and return a div, with the given style.height property, that matches the existing channel icon rows of the Hololive schedule.
     * @param {string} height - The style.height property of the icon row.
     * @returns {HTMLDivElement} The created icon row.
     */
    function createNewIconRow(height) {
        const row = document.createElement("div");
        row.className = "row no-gutters justify-content-between";
        row.style.height = height;
        row.style.overflow = "hidden";
        return row;
    }


    /**
     * Create and return a div, with the given style.flex property, that matches the existing channel icon cells of the Hololive schedule.
     * @param {*} flex - The style.flex property of the icon row.
     * @returns {HTMLDivElement} The created icon cell.
     */
    function createNewIconCell(flex) {
        const cell = document.createElement("div");
        cell.className = "col col-sm col-md col-lg col-xl";
        cell.style.flex = flex;
        return cell;
    }


    /**
     * For each channel icon row on the Hololive schedule, calculate the optimal number of rows to maximize icon size.
     * If the optimal number of rows is greater than 1, insert new rows and move icons into them.
     * Otherwise, ensure that the icons are centered within their row.
     */
    async function fixChannelIcons() {
        logger.info("Attempting to fix the channel icon display...");

        const channelIconRows = await pageElements.await("channelIconRows");
        let centerCount = 0;
        let reorganizeCount = 0;

        for (const iconRow of channelIconRows) {
            // Find the optimal number of rows to maximize icon size.
            const iconCount = iconRow.children.length;
            const iconRowRect = iconRow.getBoundingClientRect();
            const rows = getOptimalRowCount(iconCount, iconRowRect.width, iconRowRect.height);

            // If the optimal number of rows is 1, there is no need to reorganize the icons.
            if (rows < 2) {
                // Center the icons if necessary.
                if (iconRowRect.width / iconCount < iconRowRect.height) {
                    for (const icon of iconRow.children) {
                        const img = icon.firstElementChild;
                        img.style.position = "absolute";
                        img.style.top = "50%";
                        img.style.left = "50%";
                        img.style.transform = "translate(-50%, -50%)";
                    }
                    centerCount++;
                }

                // Proceed to the next icon row.
                continue;
            }

            // Calculate the new row and column parameters.
            const cols = Math.ceil(iconCount / rows);
            const rowHeight = `${iconRowRect.height / rows}px`;
            const imgSize = `${Math.min(iconRowRect.height / rows, iconRowRect.width / cols)}px`;

            // Modify the style of the icons to fit the new grid.
            for (const icon of iconRow.children) {
                icon.style.height = rowHeight;
                const img = icon.firstElementChild;
                img.style.width = imgSize;
                img.style.position = "absolute";
                img.style.top = "50%";
                img.style.left = "50%";
                img.style.transform = "translate(-50%, -50%)";
            }

            // Add new rows and move icons into them.
            iconRow.style.height = rowHeight;
            for (let i = 1; i < rows; i++) {
                const newRow = createNewIconRow(rowHeight);
                iconRow.parentElement.appendChild(newRow);
                const iconsToMove = Array.from(iconRow.children).slice(cols, 2 * cols);
                iconsToMove.forEach(icon => { newRow.appendChild(icon); });
            }

            // Account for the case where the last row is not full.
            const missing = cols - (iconCount % cols);
            if (missing < cols) {
                const flex = missing / 2;
                const lastRow = iconRow.parentElement.children[rows - 1];
                lastRow.prepend(createNewIconCell(flex));
                lastRow.append(createNewIconCell(flex));
            }

            reorganizeCount++;
        }

        logger.info(`Centered ${centerCount} of ${channelIconRows.length} icon rows.`);
        logger.info(`Reorganized ${reorganizeCount} of ${channelIconRows.length} icon rows.`);
    }


    /**
     * The main function of the script.
     */
    async function scriptMain() {
        // Set up and add the day navigation buttons if the option is enabled.
        if (settings.addDayNavigationButtons) {
            pageElements.await("dayNavbars");
            buttons.dayNavButtonUp = createDayNavButton("▲", dayNavButtonClickHandler);
            buttons.dayNavButtonDown = createDayNavButton("▼", dayNavButtonClickHandler);
            buttons.dayNavButtonUp.style.bottom = "70px";
            buttons.dayNavButtonDown.style.bottom = "20px";

            document.body.appendChild(buttons.dayNavButtonUp);
            document.body.appendChild(buttons.dayNavButtonDown);
            logger.info("Added the day navigation buttons.");
        }

        // Update the expiration date of the timezone cookie if the option is enabled.
        if (settings.updateTimezoneCookieExpirationDate) {
            updateCookieExpiration("timezone", new Date(Date.now() + settings.timezoneCookieExpirationTime));
            logger.info("Updated the expiration date of the timezone cookie.");
        }

        // Fix channel icon display where necessary, if the option is enabled.
        if (settings.fixChannelIconDisplay) { fixChannelIcons(); }

        // Configure event listeners for keyboard shortcuts, if the option is enabled.
        if (settings.enableKeyboardShortcuts) {
            logger.debug("Enabling custom keyboard shortcuts with the following shortcut map:", shortcutManager.shortcutMap);
            shortcutManager.connect();
            logger.info("Enabled custom keyboard shortcuts.");
        }
    }


    // Execution of the script starts here.

    // Create convenient aliases for the script's helper functions.
    const helpers = window.MpjHelpers;
    const storage = helpers.Storage;

    // Set up a logger.
    const logger = new helpers.Logging.Logger(settings.logLevel, "[MPJ|HSE]", settings.logDebugToInfo);

    logger.info("Starting userScript 'Hololive Schedule Enhancer' by MPJ-K...");

    // Set up a PageElementManager to help acquire page elements that are required by the script.
    const pageElements = new helpers.Dom.PageElementManager({
        dayNavbars: () => document.querySelectorAll(".navbar-inverse"),
        channelIconRows: () => document.querySelectorAll(".row.no-gutters.justify-content-between"),
    });

    // Set up an object to hold the buttons that are created by the script.
    const buttons = {
        dayNavButtonUp: undefined,
        dayNavButtonDown: undefined,
    };

    // Set up a KeyboardShortcutManager if keyboard shortcuts are enabled.
    const shortcutManager = settings.enableKeyboardShortcuts ? new helpers.Dom.KeyboardShortcutManager({
        "previousDayShortcut": {
            keyCombination: settings.previousDayShortcut,
            trigger: () => scrollToClosestDay(true)
        },
        "nextDayShortcut": {
            keyCombination: settings.nextDayShortcut,
            trigger: () => scrollToClosestDay(false)
        },
    }) : undefined;

    // Run the main function.
    scriptMain();
})();
