// ==UserScript==
// @name         Hololive Schedule Enhancer
// @namespace    MPJ_namespace
// @version      2024.03.08.01
// @description  TODO
// @author       MPJ
// @match        https://schedule.hololive.tv/*
// @icon         https://schedule.hololive.tv/dist/favicon.ico
// @grant        none
// @updateURL    TODO
// @downloadURL  TODO
// ==/UserScript==

/**
 * README
 * 
 * TODO
**/

(function () {
    'use strict';

    // Script settings

    let settings = {
        enableLogging: false,
        // Whether the script will log messages to the browser's console. Default: false
        maxAttempts: 10,
        // Number of times the script will attempt to run upon detecting a new watch page.
        // Increase this (or attemptDelay) if the script does not run due to slow page loading. Default: 10
        attemptDelay: 250,
        // Delay between attempts to run the script in milliseconds. Default: 250

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
    };

    // End of settings


    // WARNING: Making changes beyond this point is not recommended unless you know what you are doing.


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (settings.enableLogging) { console.log("[MPJ|HSE] " + message); }
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

        // Run some prechecks to ensure that all needed elements are present.
        dayNavbars = document.querySelectorAll(".navbar-inverse");
        if (dayNavbars.length) { log("Passed prechecks"); }
        else {
            log("Prechecks failed, attempts remaining: " + (attempts - 1));
            window.setTimeout(function () { keepTrying(attempts - 1); }, settings.attemptDelay);
            return;
        }

        // After prechecks have been passed, run the main function.
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
     * @param {Iterable.<Element>} elements - The iterable of elements to check.
     * @param {boolean} up - A boolean indicating whether to search upward or downward.
     * @param {number} [tolerance=5] - An element must be at least this many pixels away in the specified direction to qualify.
     * @returns {Element=} The element from elements that is vertically closest to the center of the viewport in the specified direction, or undefined if no element qualifies.
     */
    function findClosestElement(elements, up, tolerance = 5) {
        let closest, closestDistance = up ? -Infinity : Infinity;
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            const elementCenter = rect.top + (rect.height / 2);
            const distance = elementCenter - (window.visualViewport.height / 2);
            // log(`DEBUG: elementCenter = ${elementCenter}, distance = ${distance}`);

            if ((up && distance < -tolerance && distance > closestDistance) || (!up && distance > tolerance && distance < closestDistance)) {
                closest = element;
                closestDistance = distance;
            }
        }

        return closest;
    }


    function dayNavButtonClickHandler() {
        // Handle click events for the day navigation buttons.

        // Determine whether the UP or DOWN button was pressed, then scroll to the closest day in that direction.
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
    }


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
