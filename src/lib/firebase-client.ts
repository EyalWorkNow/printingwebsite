"use client";

// Firebase web config — public by design (Firebase docs); access is controlled by Authorized domains in the Firebase console.
const config = {
  apiKey: "AIzaSyAxbME2f9Ns3DbJrlXx5869fzyIeplr8wg",
  authDomain: "printing-89be5.firebaseapp.com",
  projectId: "printing-89be5",
  storageBucket: "printing-89be5.firebasestorage.app",
  messagingSenderId: "529022576701",
  appId: "1:529022576701:web:faba85b78e3fbad288a254",
};

/** Google popup → Firebase ID token (the server verifies it and opens our session). Firebase loads only on click.
 *  ponytail: no Analytics — it would need a cookie-consent banner; add with one. */
export async function googleIdToken(): Promise<string> {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const auth = getAuth(getApps()[0] ?? initializeApp(config));
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const token = await cred.user.getIdToken();
  await signOut(auth); // our own cookie session takes over; Firebase keeps nothing in the browser
  return token;
}
