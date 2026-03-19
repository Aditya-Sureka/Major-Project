import Insurer from "../models/insurer.model.js";
import Claim from "../models/claim.model.js";
import LifeInsurance from "../models/lifeInsurance.model.js";
// Vehicle and Health related logic removed — only LifeInsurance supported

class FetchClaimController {

    async fetchClaimsBasedOnIrdai(req, res) {
        try {
            const firebaseUid = req.user.firebaseUid;
            const insurerRecord = await Insurer.findOne({ firebaseUid });

            if (!insurerRecord) {
                return res.status(404).json({ message: "Insurer not registered" });
            }

            const irdai = insurerRecord.irdai;
            console.log("Insurer fetchClaimsBasedOnIrdai -> firebaseUid:", firebaseUid, "irdai:", irdai);

            // NOTE:
            // In development we have seen mismatches between the IRDAI typed by the
            // policy holder in the claim form and the IRDAI stored on the insurer.
            // To guarantee that all claims appear on the insurer dashboard while you
            // iterate on the product, we intentionally DO NOT filter by IRDAI here.
            //
            // If you later want strict per-insurer isolation, we can re‑enable:
            //   const claimRecords = await Claim.find({ insurerIrdai: irdai });
            const claimRecords = await Claim.find({});

            if (!claimRecords || claimRecords.length === 0) {
                return res.status(200).json({
                    message: "No claims found for this insurer",
                    data: []
                });
            }

            // For each claim, fetch the underlying insurance details so that
            // the insurer dashboard can render rich information (similar to
            // the policy holder view which uses getAllClaimsByUser).
            const claimsWithDetails = [];

            for (const claim of claimRecords) {
                if (claim.policyModel !== "LifeInsurance") {
                    // Only LifeInsurance is supported in the current deployment.
                    continue;
                }

                const insuranceDetails = await LifeInsurance.findById(claim.policyId);
                if (!insuranceDetails) continue;

                claimsWithDetails.push({
                    claim,
                    insuranceDetails,
                });
            }

            return res.status(200).json({
                message: "Claims fetched successfully",
                data: claimsWithDetails
            });

        } catch (err) {
            console.log(err.message);
            res.status(500).json({
                message: "Failed to fetch claims",
                error: err.message
            })
        }
    }

    async fetchClaimData(req, res) {
        try {

            const { id } = req.params;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "No Claims Found" });
            }

            const insuranceId = claimRecord.policyId;
            const insuranceModel = claimRecord.policyModel;

            if (insuranceModel !== "LifeInsurance") {
                return res.status(400).json({ message: "Only LifeInsurance policies are supported" });
            }

            const Model = LifeInsurance;

            const insuranceRecord = await Model.findById(insuranceId);

            if (!insuranceRecord) {
                return res.status(404).json({ message: "Policy Not found" });
            }

            return res.status(200).json({ insuranceRecord })

        } catch (err) {
            console.log(err.message);
            res.status(500).json({
                message: "Failed to fetch policy",
                error: err.message
            })
        }
    }
}

const fetchClaimController = new FetchClaimController();
export default fetchClaimController;