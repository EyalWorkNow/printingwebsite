"use client";

// Firebase web config — public by design (Firebase docs); access is controlled by Authorized domains in the Firebase console.
const config = {
  apiKey: "AIzaSyAxbME2f9Ns3DbJrlXx5869fzyIeplr8wg",
  projectId: "printing-89be5",
  storageBucket: "printing-89be5.firebasestorage.app",
  messagingSenderId: "529022576701",
  appId: "1:529022576701:web:faba85b78e3fbad288a254",
};

/** Google / Apple popup → Firebase ID token (the server verifies it and opens our session). Firebase loads only on click.
 *  ponytail: no Analytics — it would need a cookie-consent banner; add with one. */
const load = () => Promise.all([import("firebase/app"), import("firebase/auth")]);
/** Load the SDK ahead of the click. */
export const warmFirebase = () => void load();

async function authOf() {
  const [{ initializeApp, getApps }, a] = await load();
  return { a, auth: a.getAuth(getApps()[0] ?? initializeApp({ ...config, authDomain: location.host })) };
}

/** Same-tab sign-in (Google / Apple): leaves for the provider and comes back to this page. The handler runs on our
 *  own domain (/__/auth proxy), so it works with Chrome's storage partitioning and on iPhone (no popup). */
export async function startSignIn(provider: "google" | "apple") {
  const { a, auth } = await authOf();
  const apple = new a.OAuthProvider("apple.com");
  apple.addScope("email"); apple.addScope("name");
  await a.signInWithRedirect(auth, provider === "google" ? new a.GoogleAuthProvider() : apple);
}

/** Back from the provider: its ID token (null when this page load isn't a sign-in return). */
export async function finishSignIn(): Promise<string | null> {
  const { a, auth } = await authOf();
  const cred = await a.getRedirectResult(auth);
  if (!cred) return null;
  const token = await cred.user.getIdToken();
  await a.signOut(auth); // our own cookie session takes over; Firebase keeps nothing in the browser
  return token;
}
