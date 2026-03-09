import mongoose from "mongoose";

const lifeInsuranceSchema = mongoose.Schema({
    firebaseUid : {
        type : String,
        ref : 'User',
        required : true
    },
    insuranceClaimForm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Upload'
    },
    uin: String,
    policyNumber: String,
    policyHolderName: String,
    dob: Date,
    nominee: {
        name: String, 
        relation: String,
        email: String,
        phone: Number,
        govtId: String,
        accountNo: Number,
        IFSC: String,
        bankName: String,
        passBook : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Upload'
        }
    },
    dateOfDeath : Date,
    causeOfDeath : String,
    policyDocument : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Upload'
    },
    deathCert : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Upload'
    },
    hospitalDocument : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Upload'
    },
    fir : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Upload'
    },
    // ML Model Features for Fraud Detection
    age: {
        type: Number,
        min: 0,
        max: 120
    },
    sex: {
        type: Number,
        enum: [0, 1] // 0 = female, 1 = male
    },
    bmi: {
        type: Number,
        min: 0,
        max: 100
    },
    children: {
        type: Number,
        min: 0,
        default: 0
    },
    smoker: {
        type: Number,
        enum: [0, 1], // 0 = non-smoker, 1 = smoker
        default: 0
    },
    region: {
        type: Number,
        enum: [0, 1, 2, 3], // 0 = northeast, 1 = northwest, 2 = southeast, 3 = southwest
        default: 0
    },
    charges: {
        type: Number,
        min: 0 // Claim amount in rupees
    }
})

const LifeInsurance = new mongoose.model("LifeInsurance", lifeInsuranceSchema);
export default LifeInsurance;