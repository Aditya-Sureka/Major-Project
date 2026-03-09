import LifeInsurance from "../models/lifeInsurance.model.js";
import CheckPolicyCoverage from "../models/checkPolicyCoverage.model.js";
import handleMultipleUploads from "../utils/handleFileUpload.js";
import getAIInsights from "../services/getAIInsights.service.js";


class CheckCoverageController {

    // Vehicle and Health check endpoints removed — only Life Insurance supported

    async checkLifeInsurance(req, res) {
        try {
            const fileMetaMap = await handleMultipleUploads(req);
            const firebaseUid = req.user.firebaseUid;

            const {
                uin,
                policyNumber,
                policyHolderName,
                dob,
                dateOfDeath,
                causeOfDeath,
                nomineeName,
                nomineeRelation,
                nomineeEmail,
                nomineePhone,
                nomineeGovtId,
                nomineeAccountNo,
                nomineeIFSC,
                nomineeBankName,
                // ML Model Features
                age,
                sex,
                bmi,
                children,
                smoker,
                region,
                charges
            } = req.body;

            const newLifeInsurance = await LifeInsurance.create({
                firebaseUid,
                uin,
                policyNumber,
                policyHolderName,
                dob,
                dateOfDeath,
                causeOfDeath,
                insuranceClaimForm: fileMetaMap?.insuranceClaimForm?.[0]?._id || null,
                policyDocument: fileMetaMap?.policyDocument?.[0]?._id || null,
                deathCert: fileMetaMap?.deathCert?.[0]?._id || null,
                hospitalDocument: fileMetaMap?.hospitalDocument?.[0]?._id || null,
                fir: fileMetaMap?.fir?.[0]?._id || null,
                nominee: {
                    name: nomineeName,
                    relation: nomineeRelation,
                    email: nomineeEmail,
                    phone: nomineePhone,
                    govtId: nomineeGovtId,
                    accountNo: nomineeAccountNo,
                    IFSC: nomineeIFSC,
                    bankName: nomineeBankName,
                    passBook: fileMetaMap?.passBook?.[0]?._id || null
                },
                // ML Model Features
                age: age ? Number(age) : null,
                sex: sex !== undefined ? Number(sex) : null,
                bmi: bmi ? Number(bmi) : null,
                children: children !== undefined ? Number(children) : 0,
                smoker: smoker !== undefined ? Number(smoker) : 0,
                region: region !== undefined ? Number(region) : 0,
                charges: charges ? Number(charges) : null
            });

            const newClaimCheck = await CheckPolicyCoverage.create({
                firebaseUid,
                policyType: 'life-insurance',
                details: newLifeInsurance._id,
                policyModel: 'LifeInsurance',
            })

            return res.status(201).json({
                message: "Life insurance claim successfully created",
                data: {
                    lifeInsurance: newLifeInsurance,
                    checkPolicyCoverage: newClaimCheck
                }
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: "Failed to create life insurance claim",
                error: err.message
            });
        }
    }

    // Health check endpoint removed — only Life Insurance supported


    async getScore(req, res) {
        const { id } = req.params;

        try {
            console.log("=== getScore Debug ===");
            console.log("Looking for CheckPolicyCoverage with ID:", id);
            console.log("User firebaseUid:", req.user.firebaseUid);
            
            const claimRecord = await CheckPolicyCoverage.findById(id);

            console.log("Found claimRecord:", claimRecord);

            if (!claimRecord) {
                console.log("No CheckPolicyCoverage record found with ID:", id);
                return res.status(404).json({ message: "No record of claims found" });
            }

            console.log("Claim record found:", {
                id: claimRecord._id,
                firebaseUid: claimRecord.firebaseUid,
                policyType: claimRecord.policyType,
                policyModel: claimRecord.policyModel,
                details: claimRecord.details
            });

            let aiResponse = null;

            // Only LifeInsurance is supported in this deployment
            if (claimRecord.policyModel !== "LifeInsurance") {
                return res.status(400).json({ message: "Unsupported policy model" });
            }

            const Model = LifeInsurance;
            const populateFields = ["insuranceClaimForm", "policyDocument", "deathCert", "hospitalDocument", "fir", "nominee.passBook"];

            // Fetch and populate insurance document
            const insureDoc = await Model.findById(claimRecord.details).populate(populateFields);

            if (!insureDoc) {
                return res.status(404).json({ message: "Insurance Data not found" });
            }

            console.log(insureDoc);

            // Only LifeInsurance supported for AI analysis
            aiResponse = await getAIInsights.getAIClaimCheckLife(insureDoc);
            
            console.log("ai res ->", aiResponse);
            
            // Check if AI response is valid
            if (!aiResponse) {
                return res.status(500).json({ message: "AI analysis failed - no response received" });
            }
            
            // Normalize and save AI results
            const normalizedAI = {
                aiScore: aiResponse.aiScore == null ? null : Number(aiResponse.aiScore),
                aiConfidence: aiResponse.aiConfidence == null ? null : Number(aiResponse.aiConfidence),
                aiSuggestions: Array.isArray(aiResponse.aiSuggestions) ? aiResponse.aiSuggestions : (aiResponse.aiSuggestions ? [String(aiResponse.aiSuggestions)] : [])
            };

            claimRecord.aiScore = normalizedAI.aiScore;
            claimRecord.aiConfidence = normalizedAI.aiConfidence;
            claimRecord.aiSuggestions = normalizedAI.aiSuggestions;

            await claimRecord.save();
            return res.status(200).json({
                message: "AI analysis completed",
                data: aiResponse
            });

        } catch (err) {
            console.error("AI Analysis Error:", err.message);
            return res.status(500).json({ message: "AI processing failed", error: err.message });
        }
    }


    async getAllClaimCheckData(req, res) {
        try {
            const firebaseUid = req.user.firebaseUid;

            let claimCheckArray = [];

            const claimCheckRecords = await CheckPolicyCoverage.find({ firebaseUid });

            if (!claimCheckRecords || claimCheckRecords.length === 0) {
                return res.status(200).json({ claimChecks: [] });
            }

            for (const claimCheck of claimCheckRecords) {

                const insuranceId = claimCheck.details;

                // Only LifeInsurance supported
                if (claimCheck.policyModel !== "LifeInsurance") continue;

                const insuranceDetails = await LifeInsurance.findById(insuranceId);

                claimCheckArray.push({
                    claimCheck,
                    insuranceDetails
                });
            }
            return res.status(200).json({
                claimCheckArray
            });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to fetch claim check record",
                error: err.message
            });
        }

    }

    async getClaim(req, res) {
        try {
            const { id } = req.params;

            const claimRecord = await CheckPolicyCoverage.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim Not found" });
            }

            const insuranceId = claimRecord.details;

            if (claimRecord.policyModel !== "LifeInsurance") {
                return res.status(400).json({ message: "Unsupported policy model" });
            }

            const insuranceDetails = await LifeInsurance.findById(insuranceId);

            if (!insuranceDetails) {
                return res.status(404).json({ message: "Insurance of this claim Not found" });
            }


            return res.status(200).json({
                claimRecord,
                insuranceDetails
            });

        } catch (err) {
            console.error(err.message);
            return res.status(500).json({
                message: "Failed to fetch claim records",
                error: err.message
            });
        }
    }

}

const checkCoverageController = new CheckCoverageController();
export default checkCoverageController;