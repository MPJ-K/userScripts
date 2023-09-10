// ==UserScript==
// @name         Mute YouTube Trailers
// @namespace    MPJ_namespace
// @version      2023.09.08.01
// @description  Quickly mutes trailers on live stream waiting rooms.
// @author       MPJ
// @match        https://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @updateURL    https://github.com/MPJ-K/userScripts/raw/main/Mute%20YouTube%20Trailers.user.js
// @downloadURL  https://github.com/MPJ-K/userScripts/raw/main/Mute%20YouTube%20Trailers.user.js
// ==/UserScript==

(function () {
    'use strict';

    // README
    // This simple script checks whether YouTube is playing a trailer and, if one is detected, mutes the trailer's sound.

    // Script settings

    const enableLogging = true;
    // Whether or not the script will log messages to the browser's console. Default: false

    // End of settings


    function log(message) {
        // This is a simple function that logs messages to the console.
        if (enableLogging) { console.log("[MPJ|MYTT] " + message); }
    }


    function retryMute() {
        // Attempts to mute the trailer every 250 milliseconds until successful.
        const ytInterface = document.getElementById("movie_player");
        if (ytInterface) {
            const mutedTrailers = JSON.parse(localStorage.getItem("mpj-muted-trailers") || "[]").filter(trailer => Date.now() - trailer.time < 864e5);
            mutedTrailers.push({ id: JSON.parse(ytInterface.getDebugText()).debug_videoId, time: Date.now() });
            localStorage.setItem("mpj-muted-trailers", JSON.stringify(mutedTrailers));
            ytInterface.setVolume(0);
            return;
        }
        log("Waiting for the player to finish loading");
        window.setTimeout(retryMute, 250);
    }


    function muteTrailer() {
        // The main function.
        let isTrailer = false;
        const overlays = document.querySelectorAll(".html5-ypc-overlay");
        if (!overlays) {
            log("No overlays found, stopping");
            return;
        }
        for (const overlay of overlays) {
            if (overlay.innerHTML == "Trailer") {
                isTrailer = true;
                break;
            }
        }
        if (isTrailer) {
            retryMute();
            log("Detected a trailer, muting playback");
            return;
        }
        log("No trailer found, stopping");
    }


    document.addEventListener("yt-navigate-finish", muteTrailer);
})();
