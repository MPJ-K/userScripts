// ==UserScript==
// @name         Redirect YouTube Shorts
// @namespace    MPJ_namespace
// @version      2025.06.21.01
// @description  Automatically redirects all YouTube Shorts videos to a regular 'watch' page.
// @author       MPJ
// @match        https://www.youtube.com/*
// @exclude      https://www.youtube.com/live_chat*
// @run-at       document-start
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Redirect_YouTube_Shorts.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Redirect_YouTube_Shorts.user.js
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
            window.location = URL.replace(shortsIdentifier, "/watch?v=");
        }
    }


    // Add an event listener that runs redirectShortsToWatch() whenever a new YouTube page loads.
    document.addEventListener("yt-navigate-start", redirectShortsToWatch);

    // When the script starts, call redirectShortsToWatch() directly to improve responsiveness.
    redirectShortsToWatch();
})();
