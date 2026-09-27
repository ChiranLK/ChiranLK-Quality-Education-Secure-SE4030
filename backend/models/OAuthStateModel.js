import mongoose from "mongoose";

// One document per "Sign in with Google" attempt (OpenID Connect + PKCE).
// Deleted as soon as it is used, and expires after 10 minutes.
const OAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true }, // hash of `state`
  codeVerifier: { type: String, required: true },           // PKCE secret, never leaves the server
  nonce: { type: String, required: true },                  // must match the ID token
  role: { type: String, enum: ["user", "tutor"], default: "user" },
  expiresAt: { type: Date, required: true },
});

OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OAuthState ||
  mongoose.model("OAuthState", OAuthStateSchema);