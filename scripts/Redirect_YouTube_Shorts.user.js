// ==UserScript==
// @name         Redirect YouTube Shorts
// @namespace    https://github.com/MPJ-K/userScripts
// @version      2025.09.25.01
// @description  Automatically redirects all YouTube Shorts videos to a regular 'watch' page.
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @author       MPJ-K
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Redirect_YouTube_Shorts.user.js
// @downloadURL  https://raw.githubusercontent.com/MPJ-K/userScripts/main/scripts/Redirect_YouTube_Shorts.user.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Redirect all YouTube Shorts videos to a regular 'watch' page.
     */
    function redirectShortsToWatch() {
        const URL = document.URL;
        const shortsIdentifier = "/shorts/";
        if (URL.includes(shortsIdentifier)) {
            console.info("[MPJ|RYTS] Detected a YouTube Shorts page! Redirecting to a regular watch page...");
            window.location = URL.replace(shortsIdentifier, "/watch?v=");
        }
    }


    // Add an event listener that runs redirectShortsToWatch() whenever a new YouTube page loads.
    document.addEventListener("yt-navigate-start", redirectShortsToWatch);

    // When the script starts, call redirectShortsToWatch() directly to improve responsiveness.
    redirectShortsToWatch();
})();
