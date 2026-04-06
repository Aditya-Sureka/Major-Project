import Insurer from "../models/insurer.model.js";
import Claim from "../models/claim.model.js";
import LifeInsurance from "../models/lifeInsurance.model.js";
// Vehicle and Health related logic removed — only LifeInsurance supported

class FetchClaimController {

    constructor() {
        this.fetchClaimsBasedOnIrdai = this.fetchClaimsBasedOnIrdai.bind(this);
        this.fetchClaimData = this.fetchClaimData.bind(this);
        this.buildInsurerClaimView = this.buildInsurerClaimView.bind(this);
    }

    buildInsurerClaimView(claim, insuranceDetails) {
        const documentCandidates = [
            "insuranceClaimForm",
            "policyDocument",
            "deathCert",
            "hospitalDocument",
            "fir",
            "nominee.passBook",
        ];

        const availableDocumentKeys = documentCandidates.filter((key) => {
            if (key === "nominee.passBook") {
                return !!insuranceDetails?.nominee?.passBook;
            }

            return !!insuranceDetails?.[key];
        });

        return {
            claim: {
                _id: claim._id,
                insurerIrdai: claim.insurerIrdai,
                policyType: claim.policyType,
                status: claim.status,
                aiScore: claim.aiScore,
                aiConfidence: claim.aiConfidence,
                aiSuggestions: claim.aiSuggestions || [],
                fraudFlag: claim.fraudFlag,
                riskFactors: claim.riskFactors || [],
                rejectionReason: claim.rejectionReason,
                rejectionAdditionalData: claim.rejectionAdditionalData,
                requestedDocuments: claim.requestedDocuments || [],
                requestedDocumentsNotes: claim.requestedDocumentsNotes,
                requestedDocumentsAt: claim.requestedDocumentsAt,
                decisionAt: claim.decisionAt,
                createdAt: claim.createdAt,
                updatedAt: claim.updatedAt,
            },
            insuranceDetails: {
                _id: insuranceDetails._id,
                policyNumber: insuranceDetails.policyNumber,
                policyHolderName: insuranceDetails.policyHolderName,
                insurerIrdai: insuranceDetails.insurerIrdai,
                charges: insuranceDetails.charges,
                insuranceClaimForm: insuranceDetails.insuranceClaimForm || null,
                policyDocument: insuranceDetails.policyDocument || null,
                deathCert: insuranceDetails.deathCert || null,
                hospitalDocument: insuranceDetails.hospitalDocument || null,
                fir: insuranceDetails.fir || null,
                nominee: {
                    passBook: insuranceDetails?.nominee?.passBook || null,
                },
                createdAt: insuranceDetails.createdAt,
            },
            documentSummary: {
                totalRequired: documentCandidates.length,
                uploadedCount: availableDocumentKeys.length,
                availableDocumentKeys,
                requestedDocuments: claim.requestedDocuments || [],
                requestedDocumentsNotes: claim.requestedDocumentsNotes || null,
            },
        };
    }

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
            const claimRecords = await Claim.find({}).sort({ createdAt: -1 });

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
                try {
                    if (claim.policyModel !== "LifeInsurance") {
                        // Only LifeInsurance is supported in the current deployment.
                        continue;
                    }

                    // Skip malformed legacy records that can throw CastError.
                    if (!claim.policyId) {
                        continue;
                    }

                    const insuranceDetails = await LifeInsurance.findById(claim.policyId);
                    if (!insuranceDetails) continue;

                    claimsWithDetails.push(this.buildInsurerClaimView(claim, insuranceDetails));
                } catch (claimErr) {
                    // Keep feed resilient: one bad record should not fail the whole response.
                    console.warn("Skipping malformed claim in insurer feed:", claim?._id, claimErr?.message);
                }
            }

            return res.status(200).json({
                message: "Claims fetched successfully",
                data: claimsWithDetails
            });

        } catch (err) {
            console.error("fetchClaimsBasedOnIrdai failed:", err?.message);
            console.error(err);
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

            return res.status(200).json({
                claim: {
                    _id: claimRecord._id,
                    insurerIrdai: claimRecord.insurerIrdai,
                    policyType: claimRecord.policyType,
                    status: claimRecord.status,
                    aiScore: claimRecord.aiScore,
                    aiConfidence: claimRecord.aiConfidence,
                    aiSuggestions: claimRecord.aiSuggestions || [],
                    fraudFlag: claimRecord.fraudFlag,
                    riskFactors: claimRecord.riskFactors || [],
                    rejectionReason: claimRecord.rejectionReason,
                    rejectionAdditionalData: claimRecord.rejectionAdditionalData,
                    requestedDocuments: claimRecord.requestedDocuments || [],
                    requestedDocumentsNotes: claimRecord.requestedDocumentsNotes,
                    requestedDocumentsAt: claimRecord.requestedDocumentsAt,
                    decisionAt: claimRecord.decisionAt,
                    createdAt: claimRecord.createdAt,
                    updatedAt: claimRecord.updatedAt,
                },
                insuranceDetails: {
                    _id: insuranceRecord._id,
                    policyNumber: insuranceRecord.policyNumber,
                    policyHolderName: insuranceRecord.policyHolderName,
                    insurerIrdai: insuranceRecord.insurerIrdai,
                    charges: insuranceRecord.charges,
                    insuranceClaimForm: insuranceRecord.insuranceClaimForm || null,
                    policyDocument: insuranceRecord.policyDocument || null,
                    deathCert: insuranceRecord.deathCert || null,
                    hospitalDocument: insuranceRecord.hospitalDocument || null,
                    fir: insuranceRecord.fir || null,
                    nominee: {
                        passBook: insuranceRecord?.nominee?.passBook || null,
                    },
                    createdAt: insuranceRecord.createdAt,
                },
            })

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