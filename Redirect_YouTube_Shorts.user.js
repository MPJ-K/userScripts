// ==UserScript==
// @name         Redirect YouTube Shorts
// @namespace    MPJ_namespace
// @version      2023.09.08.01
// @description  Redirects any YouTube Shorts video to a watch page with the normal player
// @author       MPJ
// @match        https://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Redirect%20YouTube%20Shorts.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Redirect%20YouTube%20Shorts.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Add an event listener that runs attemptRedirect() whenever a new YouTube page loads.
    document.addEventListener("yt-navigate-finish", attemptRedirect);

    // The main function that detects Shorts pages and redirects them to a watch page.
    function attemptRedirect() {
        const URL = document.URL;
        const shortsID = "/shorts/";
        if (URL.includes(shortsID)) { window.location = URL.replace(shortsID, "/watch?v="); }
    }
})();