import mongoose from "mongoose";

const insurerSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        unique: true,
        required: true,
    },
    irdai: {
        type: String,
        sparse: true,  // Allows multiple null values
        unique: true   // But ensures uniqueness when value exists
    },
    orgName: String,
    companyCode: String,
    email: String,
    phone: Number,
    documents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Upload'
    }],
    pan: String,
    tan: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Insurer = mongoose.model("Insurer", insurerSchema);
export default Insurer;