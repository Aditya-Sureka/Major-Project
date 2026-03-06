import axios from "axios";

class GetAIInsights {

    async getAIClaimCheckLife(insuranceDoc) {
        try {
            // Convert Mongoose document to plain object
            const plainDoc = insuranceDoc.toObject ? insuranceDoc.toObject() : insuranceDoc;

            // Check if the document contains the fields expected by the Flask model
            const requiredFields = ["age", "sex", "bmi", "children", "smoker", "region", "charges"];
            const hasRequired = requiredFields.some((f) => Object.prototype.hasOwnProperty.call(plainDoc, f));

            if (!hasRequired) {
                console.warn("AI model payload mismatch: missing expected demographic fields for lifeinsurance. Skipping external AI call.");
                // Return a graceful fallback so callers can proceed without crashing
                return {
                    aiScore: null,
                    aiConfidence: null,
                    aiSuggestions: ["AI model not applicable for this policy data - required demographic features missing"]
                };
            }

            // Call Flask AI prediction endpoint
            const response = await axios.post(`${process.env.FLASK_API}/lifeinsurance/predict`, plainDoc);

            // Map the Flask response to the shape expected by the backend and normalize types
            const rawScore = response.data.fraud_probability ?? response.data.fraud_score ?? response.data.aiScore ?? null;
            const aiScore = rawScore == null ? null : Number(rawScore);
            const rawConfidence = response.data.fraud_probability ?? response.data.aiConfidence ?? null;
            const aiConfidence = rawConfidence == null ? null : Number(rawConfidence);

            const aiSuggestions = response.data.risk_level
                ? [String(response.data.risk_level)]
                : (Array.isArray(response.data.aiSuggestions) ? response.data.aiSuggestions : (response.data.aiSuggestions ? [String(response.data.aiSuggestions)] : []));

            return {
                aiScore,
                aiConfidence,
                aiSuggestions
            };
        } catch (err) {
            // Include response body if available to aid debugging, but return a graceful fallback to avoid throwing
            console.error("Flask API error (life):", err.response?.status, err.response?.data || err.message);
            return {
                aiScore: null,
                aiConfidence: null,
                aiSuggestions: ["AI analysis failed or unavailable"]
            };
        }
    }

    async evaluateRisk(insuranceDoc) {
        try {
            const plainDoc = insuranceDoc.toObject ? insuranceDoc.toObject() : insuranceDoc;
            const response = await axios.post(`${process.env.FLASK_API}/evaluateRisk`, plainDoc);
            return {
                risk_factors: response.data.risk_factors || [],
                suspicious_files: response.data.suspicious_files || []
            };
        } catch (err) {
            console.error("Flask API error (evaluateRisk):", err.response?.status, err.response?.data || err.message);
            // Graceful fallback
            return {
                risk_factors: [],
                suspicious_files: []
            };
        }
    }
}

const getAIInsights = new GetAIInsights();

export default getAIInsights;
