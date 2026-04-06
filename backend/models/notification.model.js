import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userFirebaseUid: {
    type: String,
    required: true,
    index: true,
  },
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Claim",
    required: true,
  },
  type: {
    type: String,
    enum: ["claim_submitted", "claim_under_review", "claim_approved", "claim_rejected", "documents_requested"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
