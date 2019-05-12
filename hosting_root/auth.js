"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase = require("firebase");
const firebaseui = require("firebaseui");
var ui = new firebaseui.auth.AuthUI(firebase.auth());
ui.start("#firebaseui-auth-container", {
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        firebase.auth.GithubAuthProvider.PROVIDER_ID
    ],
    signInFlow: "popup"
});
