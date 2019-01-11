/***
 * @Author Jhordan Lima <jhordan.lima@niduu.com>
 * @Company Niduu
 * @Year 2018
 *
 * **/

const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vitaltests-1c0bd.firebaseio.com"
});

const compressVideo = require('./lib/compress_video');

exports.compressVideo = functions.https.onCall(async (data, context) => {
    try {
        return await compressVideo(data, context.auth);
    } catch (err) {
        return {
            error: err.message
        }
    }
});