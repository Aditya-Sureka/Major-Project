import getAIInsights from "../services/getAIInsights.service.js";
import Claim from "../models/claim.model.js";
import LifeInsurance from "../models/lifeInsurance.model.js";

// Vehicle and Health related logic removed — only LifeInsurance supported

class RiskEngineController {

    async evaluateRiskByAI(req, res) {
        try {
            const { id } = req.params;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "No Claims Found" });
            }

            if (claimRecord.policyModel !== 'LifeInsurance') {
                return res.status(400).json({ message: 'Only Life Insurance supported for risk evaluation' });
            }

            const populateFields = [
                'insuranceClaimForm',
                'nominee.passBook',
                'policyDocument',
                'deathCert',
                'hospitalDocument',
                'fir'
            ];

            const insuranceDoc = await LifeInsurance.findById(claimRecord.policyId).populate(populateFields);

            if (!insuranceDoc) {
                return res.status(404).json({ message: "Policy Not found" });
            }

            const insuranceRecord = {
                ...insuranceDoc.toObject(),
                policyModel: 'LifeInsurance'
            }

            const responseFromAi = await getAIInsights.evaluateRisk(insuranceRecord);

            if (!responseFromAi) {
                return res.status(404).json({ message: "Failed to fetch Ai predictions" });
            }

            claimRecord.aiScore = responseFromAi.aiScore;
            claimRecord.aiConfidence = responseFromAi.aiConfidence;
            claimRecord.riskFactors = responseFromAi.riskFactors || [];
            claimRecord.aiSuggestions = Array.isArray(responseFromAi.aiSuggestions) ? responseFromAi.aiSuggestions : (responseFromAi.aiSuggestions ? [String(responseFromAi.aiSuggestions)] : []);

            await claimRecord.save();

            return res.status(200).json({ responseFromAi });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "AI Evaluation is not working now",
                error: err.message
            })
        }
    }


    async fraudDetectionByAI(req, res) {
        try {
            const { id } = req.params;

            const claimRecord = await Claim.findById(id);
            if (!claimRecord) {
                return res.status(404).json({ message: "No claim found with that ID" });
            }

            if (claimRecord.policyModel !== 'LifeInsurance') {
                return res.status(400).json({ message: 'Unsupported policy model for fraud detection' });
            }

            const populateFields = [
                'insuranceClaimForm',
                'nominee.passBook',
                'policyDocument',
                'deathCert',
                'hospitalDocument',
                'fir'
            ];

            let query = LifeInsurance.findById(claimRecord.policyId);

            for (const field of populateFields) {
                query = query.populate(field);
            }

            const insuranceDoc = await query;

            if (!insuranceDoc) {
                return res.status(404).json({ message: "Policy data not found" });
            }

            const insuranceRecord = {
                ...insuranceDoc.toObject(),
                policyModel: 'LifeInsurance'
            };

            console.log(insuranceRecord);

            const responseFromAi = await getAIInsights.evaluateRisk(insuranceRecord);
            if (!responseFromAi) {
                return res.status(500).json({ message: "Failed to get response from AI service" });
            }

            claimRecord.aiScore = responseFromAi.aiScore || null;
            claimRecord.aiConfidence = responseFromAi.aiConfidence || null;
            claimRecord.aiSuggestions = responseFromAi.aiSuggestions || [];
            claimRecord.riskFactors = responseFromAi.riskFactors || [];

            await claimRecord.save();

            return res.status(200).json({ message: "AI Evaluation completed", responseFromAi });

        } catch (err) {
            console.error("AI Evaluation Error:", err.message);
            return res.status(500).json({
                message: "AI Evaluation failed due to server error",
                error: err.message
            });
        }
    }
}

const riskEngineController = new RiskEngineController();
export default riskEngineController;