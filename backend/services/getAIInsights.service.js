import axios from "axios";

class GetAIInsights {

    getFlaskBaseUrl() {
        const raw = (process.env.FLASK_API || "").trim();
        const fallback = "http://localhost:5000";
        if (!raw) return fallback;

        // If someone sets FLASK_API like "localhost:5000", axios will throw "Invalid URL"
        if (!/^https?:\/\//i.test(raw)) return `http://${raw}`;

        return raw.replace(/\/+$/, "");
    }

    async getAIClaimCheckLife(insuranceDoc) {
        try {
            // Convert Mongoose document to plain object
            const plainDoc = insuranceDoc.toObject ? insuranceDoc.toObject() : insuranceDoc;

            // Check if the document contains ALL required fields expected by the Flask model
            const requiredFields = ["age", "sex", "bmi", "children", "smoker", "region", "charges"];
            const missingFields = requiredFields.filter((f) => !Object.prototype.hasOwnProperty.call(plainDoc, f) || plainDoc[f] == null);

            if (missingFields.length > 0) {
                console.warn(`AI model payload mismatch: missing required demographic fields for lifeinsurance: ${missingFields.join(", ")}. Skipping external AI call.`);
                // Return a graceful fallback so callers can proceed without crashing
                return {
                    aiScore: null,
                    aiConfidence: null,
                    aiSuggestions: [`AI model not applicable for this policy data - required demographic features missing: ${missingFields.join(", ")}`]
                };
            }

            // Prepare payload with only the required ML features
            const mlPayload = {
                age: Number(plainDoc.age),
                sex: Number(plainDoc.sex),
                bmi: Number(plainDoc.bmi),
                children: Number(plainDoc.children),
                smoker: Number(plainDoc.smoker),
                region: Number(plainDoc.region),
                charges: Number(plainDoc.charges)
            };

            console.log("Calling Flask API with ML payload:", mlPayload);

            // Call Flask AI prediction endpoint
            const flaskBaseUrl = this.getFlaskBaseUrl();
            const response = await axios.post(`${flaskBaseUrl}/lifeinsurance/predict`, mlPayload);

            console.log("Flask API response:", response.data);

            // Map the Flask response to the shape expected by the backend
            // fraud_probability is 0.0-1.0, convert to aiScore (0-100 scale)
            const fraudProbability = response.data.fraud_probability ?? null;
            const aiScore = fraudProbability != null ? Math.round(Number(fraudProbability) * 100) : null;
            
            // aiConfidence is the same as fraud_probability (0.0-1.0 scale)
            const aiConfidence = fraudProbability != null ? Number(fraudProbability) : null;

            // Build suggestions array with risk level and prediction
            const suggestions = [];
            if (response.data.risk_level) {
                suggestions.push(`Risk Level: ${response.data.risk_level}`);
            }
            if (response.data.fraud_prediction !== undefined) {
                suggestions.push(`Fraud Prediction: ${response.data.fraud_prediction === 1 ? 'FRAUD DETECTED' : 'LEGITIMATE'}`);
            }
            if (fraudProbability != null) {
                suggestions.push(`Fraud Probability: ${(fraudProbability * 100).toFixed(2)}%`);
            }

            const aiSuggestions = suggestions.length > 0 
                ? suggestions 
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
            const flaskBaseUrl = this.getFlaskBaseUrl();
            const response = await axios.post(`${flaskBaseUrl}/evaluateRisk`, plainDoc);
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
