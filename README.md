World Conflict
================

A multi-player, online, Risk-like strategy game. Up to 4 players can play.

The original version was created for [JS13k 2014](http://js13kgames.com/) by Jakub Wasilewski. This project modifies that code in order to support multi-player online games using [Google Apps Script](https://developers.google.com/apps-script) (GAS). GAS is essentially Javascript which runs on a server.

**Play the [Google Apps Script version](https://script.google.com/macros/s/AKfycbzCRTNvYT-Nben2-LQtTHLh9wIANBvfVYKs3_eB58Ft7rVLxyPgiwOPsUqlUgas3p0u/exec)**

**Play the [original version](http://wasyl.eu/games/compact-conflict/play.html)**

![Example Game](images/game_middle.PNG)


## How to Run and Contribute

This is a [Google Apps Script](https://developers.google.com/apps-script) application. 
If you would like to contribute, first install [CLASP](https://github.com/google/clasp).
Next git clone this repository somewhere on your local machine. 

This project uses [Firestore](https://firebase.google.com/docs/firestore) to persist data. You will need your own instance to run. Firestore is free for low usage limits. 
Create an instance and put the private key in `server/persistence/firestorePrivateKey.txt`. 
This file should _not_ be checked into git. 

Now, from the `WorldConflict` directory within the cloned project directory, run the following commands (first time only):
* `clasp login`  using gmail account
* `clasp create --type webapp` this creates a script with this name in your Google Drive
   after you do this, you will have a .clasp.json file locally with contents that look something like this <br>
   ```{"scriptId":"13Py0mZIfz-mg5F7KA0HcUH9vL2g4Q8ep416zi6qJmMfD5CA9AUiZ969K"}```
* `./push.sh` push all the files in the project directory into that script in the cloud. Note: you may need to do `chmod +x` first on this file if on *nix. 
* Normally you would use `clasp push`, but this script will duplicate some files for use on client and server before dong the normal `clasp push`. 
* Note: do not commit the files that get copied or generated.
  
Now you are good to go! Deploy the web-app from your script on Google Drive.
![Deployment Dialog](images/deployment-dlg.PNG)</br>
Make changes locally (in IntelliJ for example), do `./push.sh` (as described above), and refresh the deployed app script page to see the change. 
Do git commit, push, and create pull requests through Github when you have a feature or fix to contribute. If you do not actively use the project for a while, you may need to do the clasp login again.

#### Test

To run the server unit tests, append `?test=true` to the URL.
To run the server unit tests, append `?clientTest=true` to the URL.

#### Thanks

Thanks to Jakub Wasilewski for the initial compact Javascript implementation of the game.
 

