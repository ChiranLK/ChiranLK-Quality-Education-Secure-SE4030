import mongoose from "mongoose";

// A one-time login code given to the frontend after Google sign-in.
// Only the hash of the code is stored. MongoDB deletes expired ones automatically.
const LoginTicketSchema = new mongoose.Schema({
  ticketHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
});

LoginTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LoginTicket ||
  mongoose.model("LoginTicket", LoginTicketSchema);