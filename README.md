# userScripts
This repository stores user scripts I have worked on for the Tampermonkey browser extension.  
Detailed information about each script is usually included in the file itself. Feel free to try out my scripts.

# Brief script descriptions
## YouTube Playback Tweaks
Contains various tweaks to improve the YouTube experience, including customizable playback speed and volume controls.
Playback speed can be set much faster than YouTube's maximum of 2x.
The script also provides a button to remember the playback speed (playlists can be individually excluded from this).
Other optional features include:
- Automatic fixed video resolution
- Automatic theater mode
- Custom keyboard shortcuts for playback speed and volume

See the in-script settings section for more details.

## Redirect YouTube Shorts
A simple script that automatically redirects any YouTube Shorts video to a regular 'watch' page.  
In other words, it makes all YouTube Shorts content play in the normal YouTube video player.

## Auto Hide YouTube Live Chat
This script will automatically hide YouTube Live Chat if it is present on a video or stream.  
Live Chat can still be shown manually, this script will only try to hide it once when a watch page loads.  
As to why you would want to hide the YouTube Live Chat, it negatively impacts page performance.
While it is open, Live Chat can more than double the CPU usage of the page.
It also causes the page's RAM usage to slowly increase over time.  
Consider using this script if you only rarely interact with the YouTube Live Chat.

## Mute YouTube Trailers
NOTE: This script appears to be broken, I may fix it in the future.  
A simple script that automatically mutes the audio of trailers that play in YouTube live stream or premiere waiting rooms.

## Pin YouTube Comments
Adds a small 'Pin' button to every YouTube comment that will move the comment to the top of the list when clicked.
This can be useful for timestamp comments that are buried far down the list, saving time that would otherwise be spent scrolling back and forth.

## Hololive Schedule Enhancer
Improves the user experience on the Hololive schedule page (schedule.hololive.tv).  
This script currently offers the following features:
- Day navigation buttons - automatically scroll to the next or previous day in the schedule
- Timezone cookie expiration updates - prevent the schedule from forgetting the user's selected timezone by updating the expiration date of the corresponding cookie
- Improved channel icon display - prevent channel icons from becoming tiny for videos that link many channels

See the in-script settings section for more details.
