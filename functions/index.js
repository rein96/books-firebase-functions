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
        for(let key in data){
            if(!validKeys[key] || typeof data[key] !== validKeys[key]){
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
