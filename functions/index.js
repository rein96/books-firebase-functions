const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

exports.createPublicProfile = functions.https.onCall(async (data, context) => {
    checkAuthentication(context)

    dataValidator(data, { username: 'string' })   // email and password is created in firebase.js in gatsby FE

    // check userId == uid
    const userProfile = await db.collection('publicProfiles')
        .where('userId', '==', context.auth.uid).limit(1).get()

    if (!userProfile.empty) {
        throw new functions.https.HttpsError(
            'already-exists',
            'This username already has a public profile'
        )
    }

    // check username in docs
    const publicProfile = await db.collection('publicProfiles').doc(data.username).get()
    if (publicProfile.exists) {
        throw new functions.https.HttpsError(
            'already-exists',
            'This username already belongs to an existing user'
        )
    }

    // Check if the user === admin
    const user = await auth.getUser(context.auth.uid)
    if(user.email === functions.config().accounts.admin){
        await auth.setCustomUserClaims(context.auth.uid, { admin: true })
    }

    // Success
    return db.collection('publicProfiles').doc(data.username).set({
        userId: context.auth.uid
    })

})


exports.postComment = functions.https.onCall((data, context) => {
    checkAuthentication(context)

    dataValidator(data, {
        text: 'string',
        bookId: 'string'
    })

    return db.collection('publicProfiles').where('userId', '==', context.auth.uid)
        .limit(1)
        .get()
        .then(snapshot => {
            return db.collection('comments').add({
                text: data.text,
                username: snapshot.docs[0].id,
                dateCreated: new Date(),
                book: db.collection('books').doc(data.bookId),
            })
        })
})

function dataValidator(data, validKeys) {
    if (Object.keys(data).length !== Object.keys(validKeys).length) {
        throw new functions.https.HttpsError(
            'invalid-argument', // argument list in here https://firebase.google.com/docs/reference/functions/providers_https_.httpserror
            'Data object contains invalid number of properties'
        )
    } else {
        for (let key in data) {
            if (!validKeys[key] || typeof data[key] !== validKeys[key]) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Data object contains invalid properties'
                )
            }
        }
    }
}

function checkAuthentication(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be signed in to use this feature'
        )
    }
}

// firebase deploy --only functions
// firebase functions:config:set accounts.admin="admin@gmail.com"
// firebase functions:config:get
