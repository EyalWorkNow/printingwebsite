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

/** Google / Apple popup → Firebase ID token (the server verifies it and opens our session). Firebase loads only on click.
 *  ponytail: no Analytics — it would need a cookie-consent banner; add with one. */
export async function firebaseIdToken(provider: "google" | "apple"): Promise<string> {
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut }] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const auth = getAuth(getApps()[0] ?? initializeApp(config));
  const apple = new OAuthProvider("apple.com");
  apple.addScope("email"); apple.addScope("name");
  const cred = await signInWithPopup(auth, provider === "google" ? new GoogleAuthProvider() : apple);
  const token = await cred.user.getIdToken();
  await signOut(auth); // our own cookie session takes over; Firebase keeps nothing in the browser
  return token;
}
