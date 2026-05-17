import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Claim",
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
    index: true,
  },
  senderRole: {
    type: String,
    enum: ["policyHolder", "insurer"],
    required: true,
  },
  recipientId: {
    type: String,
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ["text", "document_list", "status_update"],
    default: "text",
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Upload",
  }],
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
