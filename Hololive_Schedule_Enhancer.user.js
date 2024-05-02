// ==UserScript==
// @name         Hololive Schedule Enhancer
// @namespace    MPJ_namespace
// @version      2024.05.02.01
// @description  Enhances the Hololive schedule page by adding day navigation buttons and making it remember the selected timezone. Script behavior is configurable.
// @author       MPJ
// @match        https://schedule.hololive.tv/*
// @icon         https://schedule.hololive.tv/dist/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Hololive_Schedule_Enhancer.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Hololive_Schedule_Enhancer.user.js
// ==/UserScript==

/**
 * README
 * 
 * Hololive Schedule Enhancer aims to improve the user experience of the Hololive schedule page (schedule.hololive.tv).
 * The script currently offers two optional features: day navigation buttons and timezone cookie expiration updates.
 * The scipt settings located below this README contain an extensive description for each feature.
 * 
 * Thank you for trying out my script!
 * I am by no means a professional programmer, but I have done my best to properly document the implementation of the
 * script. If you have any feedback or suggestions, please open an issue on my GitHub.
**/

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether the script will log messages to the browser's console. Default: false
        maxAttempts: 10,
        // The maximum number of times that the script will attempt to run upon page load.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
        attemptDelay: 250,
        // The delay in milliseconds between attempts to run the script. Default: 250

        addDayNavigationButtons: true,
        // Whether to add a pair of custom day navigation buttons to the Hololive schedule.
        // The buttons are fixed to the bottom right corner of the page and take the form of an up and down arrow.
        // When the corresponding button is clicked, the page will scroll to the start of the next or previous day in
        // the schedule. Default: true

        updateTimezoneCookieExpirationDate: false,
        // Whether to refresh the expiration date of the Hololive schedule's timezone cookie.
        // The schedule page remembers your selected timezone using a cookie with an expiration date of one week.
        // However, because the page never updates the expiration date, it forgets your timezone selection every week.
        // If this option is enabled, the script will refresh the expiration date of the cookie whenever you load the
        // schedule page. That way, the page should never forget your selected timezone.
        // This is disabled by default because some people dislike messing with cookies, but enabling it is strongly
        // recommended. See also the timezoneCookieExpirationTime setting below. Default: false

        timezoneCookieExpirationTime: 604800000,
        // The expiration time to set for the timezone cookie in milliseconds.
        // If updateTimezoneCookieExpirationDate is true, the script will set the expiration date of the timezone cookie
        // to this many milliseconds from the time at which you opened the schedule page. You can calculate this value
        // by multiplying from milliseconds up to your desired duration. The default value is one week:
        // 1000 milliseconds * 60 seconds * 60 minutes * 24 hours * 7 days = 604,800,000

        fixChannelIconDisplay: true,
        // Whether to improve the way channel icons are displayed on the Hololive schedule.
        // If a video links many different YouTube channels, the channel icons displayed on the schedule can become
        // tiny since they all have to fit in one row. When this option is enabled, the script will calculate and apply
        // the optimal row count to maximize the size of the channel icons while still fitting in the available space.
        // Default: true
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    /**
     * Log a message to the browser's developer console if settings.enableLogging is true.
     * Otherwise, this function has no effect. The message is prefixed with a script identifier.
     * @param {*} message - The message to log.
     */
    function log(message) {
        if (settings.enableLogging) { console.log("[MPJ|HSE] " + message); }
    }


    /**
     * Recursively run prechecks until successful or until attempts run out. If prechecks pass, run scriptMain().
     * @param {number} attempts - The remaining number of attempts.
     */
    function keepTrying(attempts) {
        // Stop when attempts run out.
        if (attempts < 1) { return; }

        // The following check prevents the script from executing until the user switches to the browser tab it is running in.
        // This does not consume attempts, preventing the situation where all attempts fail because the tab has not yet been opened.
        if (document.hidden) {
            waitingForUnhide = true;
            log("Waiting for the user to switch to the target tab");
            return;
        }

        // Run prechecks to ensure that all needed elements are present.
        dayNavbars = document.querySelectorAll(".navbar-inverse");
        const prechecks = [dayNavbars.length];
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

        // If all prechecks pass, run the main function.
        scriptMain();
    }


    /**
     * Return the value of the cookie with the specified name, or undefined if a cookie with that name does not exist.
     * @param {string} name - The name of the cookie.
     * @returns {string=} The value of the cookie, or undefined if a cookie with the specified name does not exist.
     */
    function getCookie(name) {
        const cookie = decodeURIComponent(document.cookie).split("; ").find(c => c.startsWith(name));
        return cookie ? cookie.split("=")[1] : undefined;
    }


    /**
     * Update the expiration date of the cookie with the specified name to the given expiration date.
     * If the cookie does not exist, this function has no effect.
     * @param {string} name - The name of the cookie.
     * @param {string} expirationDate - The expiration date to set. Must be a UTCString.
     */
    function updateCookieExpiration(name, expirationDate) {
        const value = getCookie(name);
        if (value) { document.cookie = `${name}=${value}; expires=${expirationDate}; path=/`; }
    }


    /**
     * Return the element from elements that is vertically closest to the center of the viewport, searching upward if up is true and downward otherwise.
     * If no element qualifies, return undefined.
     * @param {Iterable.<Element>} elements - The iterable of elements to check.
     * @param {boolean} up - A boolean indicating whether to search upward or downward.
     * @param {number} [deadzone=50] - An element must be at least this many pixels away in the specified direction to qualify.
     * @returns {Element=} The resulting element, or undefined if none qualify.
     */
    function findClosestElement(elements, up, deadzone = 50) {
        let closest, closestDistance = up ? -Infinity : Infinity;
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            const elementCenter = rect.top + (rect.height / 2);
            const distance = elementCenter - (window.visualViewport.height / 2);
            // log(`DEBUG: elementCenter = ${elementCenter}, distance = ${distance}`);

            if ((up && distance < -deadzone && distance > closestDistance) || (!up && distance > deadzone && distance < closestDistance)) {
                closest = element;
                closestDistance = distance;
            }
        }

        return closest;
    }


    /**
     * Handle click events for the day navigation buttons.
     * Determine whether the UP or DOWN button was pressed, then scroll to the closest day in that direction.
     */
    function dayNavButtonClickHandler() {
        const up = this.textContent == "▲";
        const closest = findClosestElement(dayNavbars, up);
        if (closest) {
            closest.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            log(`Navigated ${up ? "UP" : "DOWN"} to the nearest day`);
        }
        // If no day can be found below, scroll all the way down.
        else if (!up) {
            window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" });
            log(`Navigated DOWN to the bottom of the page`);
        }
    }


    /**
     * Return a day navigation button with the given text and attach the given handler function for click events.
     * @param {string} text - The textContent to set for the button.
     * @param {Function} handler - The click event handler function for the button.
     * @returns {HTMLButtonElement} The created day navigation button.
     */
    function createDayNavButton(text, handler) {
        const btn = document.createElement("button");
        btn.style.position = "fixed";
        btn.style.right = "20px";
        btn.style.width = "40px";
        btn.style.height = "40px";
        btn.style.backgroundColor = "#303030";
        btn.style.border = "2px solid #87ceeb";
        btn.style.borderRadius = "8px";
        btn.style.color = "#87ceeb";
        btn.style.fontSize = "20px";
        btn.style.outline = "none";

        btn.textContent = text;
        btn.addEventListener("click", handler);
        return btn;
    }


    function getOptimalRowCount(width, height, N) {
        const widthPerItem = width / N;
        let rows = 1;
        while (rows * widthPerItem <= height / (rows + 1)) { rows += 1; }
        return rows;
    }


    function makeNewIconRow(height) {
        const row = document.createElement("div");
        row.className = "row no-gutters justify-content-between";
        row.style.height = height;
        row.style.overflow = "hidden";
        return row;
    }


    function fixChannelIcons() {
        let fixCount = 0;

        const iconRows = document.querySelectorAll(".row.no-gutters.justify-content-between");
        for (const iconRow of iconRows) {
            // Find the optimal number of rows to maximize icon size.
            const iconRowRect = iconRow.getBoundingClientRect();
            const rows = getOptimalRowCount(iconRowRect.width, iconRowRect.height, iconRow.children.length);
            if (rows < 2) { continue; }

            // Calculate the new row and column parameters.
            const cols = Math.ceil(iconRow.children.length / rows);
            const rowHeight = `${iconRowRect.height / rows}px`;

            // Modify the style of the icons to fit the new grid.
            for (const icon of iconRow.children) {
                icon.style.height = rowHeight;
                const img = icon.firstElementChild;
                img.style.width = `${Math.min(iconRowRect.height / rows, iconRowRect.width / cols)}px`;
                img.style.position = "absolute";
                img.style.top = "50%";
                img.style.left = "50%";
                img.style.transform = "translate(-50%, -50%)";
            }

            // Add new rows and move icons into them.
            iconRow.style.height = rowHeight;
            for (let i = 1; i < rows; i++) {
                const newRow = makeNewIconRow(rowHeight);
                iconRow.parentElement.appendChild(newRow);
                const iconsToMove = Array.from(iconRow.children).slice(cols, 2 * cols);
                iconsToMove.forEach(icon => { newRow.appendChild(icon); });
            }

            fixCount += 1;
        }
        log(`Fixed ${fixCount} of ${iconRows.length} icon rows`);
    }


    /**
     * The main function of the script.
     */
    function scriptMain() {
        // Set up and add the day navigation buttons if the option is enabled.
        if (settings.addDayNavigationButtons) {
            dayNavButtonUp = createDayNavButton("▲", dayNavButtonClickHandler);
            dayNavButtonDown = createDayNavButton("▼", dayNavButtonClickHandler);
            dayNavButtonUp.style.bottom = "70px";
            dayNavButtonDown.style.bottom = "20px";

            document.body.appendChild(dayNavButtonUp);
            document.body.appendChild(dayNavButtonDown);
            log("Added day navigation buttons");
        }

        // Update the expiration date of the timezone cookie if the option is enabled.
        if (settings.updateTimezoneCookieExpirationDate) {
            updateCookieExpiration("timezone", new Date(Date.now() + settings.timezoneCookieExpirationTime).toUTCString());
            log("Updated the expiration date of the timezone cookie");
        }

        // Fix channel icon display where necessary, if the option is enabled.
        if (settings.fixChannelIconDisplay) {
            log("Attempting to fix channel icon display");
            fixChannelIcons();
        }
    }


    /**
     * Handle visibilitychange events.
     * Run keepTrying() if the tab that the script is running in is opened while the script is waiting.
     */
    function visibilityChangeHandler() {
        if (!document.hidden && waitingForUnhide) {
            waitingForUnhide = false;
            keepTrying(settings.maxAttempts);
        }
    }


    // Code to start the above functions.
    log("Hololive Schedule Enhancer by MPJ starting execution");
    // Create some variables that are accessible from anywhere in the script.
    let dayNavbars, dayNavButtonUp, dayNavButtonDown;

    // Add an event listener used to detect when the tab the script is running on is shown on screen.
    let waitingForUnhide = false;
    document.addEventListener("visibilitychange", visibilityChangeHandler);

    // Start the script.
    keepTrying(settings.maxAttempts);
})();
