World Conflict
================

A multi-player, online, Risk-like strategy game.

The original version was created for [JS13k 2014](http://js13kgames.com/) by Jakub Wasilewski. This project modifies that code in order to support multi-player online games using [Google Apps Script](https://developers.google.com/apps-script) (GAS). GAS is essentially Javascript which runs on a server.

**Play the [Google Apps Script version](https://script.google.com/macros/s/AKfycbxM8hi7pTwGz5TwrYummeqWnpnKAa6SWEDCfIBAPK8TBjImVS8/exec)**

**Play the [original version](http://wasyl.eu/games/compact-conflict/play.html)**

![Example Game](images/game_middle.PNG)


## How to Run and Contribute

This is a [Google Apps Script](https://developers.google.com/apps-script) application. 
If you would like to contribute, first install [CLASP](https://github.com/google/clasp).
Next git clone this repository somewhere on your local machine. 

This project uses [Firestore](https://firebase.google.com/docs/firestore) to persist data. You will need your own instance to run. Firestore is free for low usage limits. Create an instance and put the private key in `server/persistence/firestorePrivateKey.txt`. This file should _not_ be checked into git. 

Now, from the WorldConflict directory within the cloned project directory, run the following commands:
* `clasp login`  using gmail account
* `clasp create --type webapp` this creates a script with this name in your Google Drive
   after you do this, you will have a .clasp.json file locally with contents that look something like this <br>
   ```{"scriptId":"13Py0mZIfz-mg5F7KA0HcUH9vL2g4Q8ep416zi6qJmMfD5CA9AUiZ969K"}```
* `./push.sh`  push all the files in the project directory into that script in the cloud. Note: you may need to do `chmod +x` first on this file if on *nix. Normally you would use `clasp push`, but this script will duplicate some files for use on client and server before dong the normal `clasp push`. Note: do not commit these files that get copied or generate.
  
Now you are good to go! Deploy the web-app from your script on Google Drive.
Make changes locally (in IntelliJ for example), do "clasp push", and refresh the deployed app script page to see the change. 
Do git commit, push, and create pull requests through Github when you have a feature or fix to contribute.


#### Thanks

Thanks to Jakub Wasilewski for the initial compact Javascript implementation of the game.
