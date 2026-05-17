import Claim from "../models/claim.model.js";
import Notification from "../models/notification.model.js";

class DecisionController {

    sanitizeRequestedDocuments(requestedDocuments) {
        if (!Array.isArray(requestedDocuments)) {
            return [];
        }

        return requestedDocuments
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    async createNotification({ userFirebaseUid, claimId, type, title, message, data, actionUrl }) {
        if (!userFirebaseUid || !claimId) return;

        await Notification.create({
            userFirebaseUid,
            claimId,
            type,
            title,
            message,
            data: data || {},
            actionUrl: actionUrl || null,
        });
    }
    
    async setReview(req, res) {
        try {
            const { id } = req.params;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim not found" });
            }

            const updatedClaimRecord = await Claim.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: "UnderReview",
                        decisionAt: null,
                        requestedDocuments: [],
                        requestedDocumentsNotes: null,
                        requestedDocumentsAt: null,
                        rejectionReason: null,
                        rejectionAdditionalData: null,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            await this.createNotification({
                userFirebaseUid: claimRecord.firebaseUid,
                claimId: claimRecord._id,
                type: "claim_under_review",
                title: "Claim moved to review",
                message: "Your claim is now under insurer review.",
                data: { status: "UnderReview" },
                actionUrl: `/policyHolder-dashboard?tab=track&claimId=${claimRecord._id}`,
            });

            return res.status(200).json({ message: "Claim set to review", data: updatedClaimRecord });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to send Claim to review",
                error: err.message
            })
        }
    }

    async setApprove(req, res) {
        try {

            const { id } = req.params;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim not found" });
            }

            const updatedClaimRecord = await Claim.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: "Settled",
                        decisionAt: new Date(),
                        requestedDocuments: [],
                        requestedDocumentsNotes: null,
                        requestedDocumentsAt: null,
                        rejectionReason: null,
                        rejectionAdditionalData: null,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            await this.createNotification({
                userFirebaseUid: claimRecord.firebaseUid,
                claimId: claimRecord._id,
                type: "claim_approved",
                title: "Claim settled",
                message: "Your claim has been approved and settled by the insurer.",
                data: { status: "Settled" },
                actionUrl: `/policyHolder-dashboard?tab=track&claimId=${claimRecord._id}`,
            });

            return res.status(200).json({ message: "Claim settled", data: updatedClaimRecord });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to settle Claim",
                error: err.message
            })
        }
    }

    async setReject(req, res) {
        try {
            const { id } = req.params;

            const { rejectionReason, rejectionAdditionalData } = req.body;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim not found" });
            }

            const updatedClaimRecord = await Claim.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: "Rejected",
                        rejectionReason,
                        rejectionAdditionalData,
                        decisionAt: new Date(),
                        requestedDocuments: [],
                        requestedDocumentsNotes: null,
                        requestedDocumentsAt: null,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            await this.createNotification({
                userFirebaseUid: claimRecord.firebaseUid,
                claimId: claimRecord._id,
                type: "claim_rejected",
                title: "Claim rejected",
                message: rejectionReason ? `Claim rejected: ${rejectionReason}` : "Your claim has been rejected by the insurer.",
                data: { status: "Rejected", rejectionReason, rejectionAdditionalData },
                actionUrl: `/policyHolder-dashboard?tab=track&claimId=${claimRecord._id}`,
            });

            return res.status(200).json({ message: "Claim Rejected", data: updatedClaimRecord });
            
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to reject Claim",
                error: err.message
            })
        }
    }

    async requestDocuments(req, res) {
        try {
            const { id } = req.params;
            const { requestedDocuments, notes } = req.body;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim not found" });
            }

            const normalizedDocs = this.sanitizeRequestedDocuments(requestedDocuments);

            const updatedClaimRecord = await Claim.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: "UnderReview",
                        requestedDocuments: normalizedDocs,
                        requestedDocumentsNotes: typeof notes === "string" ? notes : null,
                        requestedDocumentsAt: new Date(),
                        rejectionReason: null,
                        rejectionAdditionalData: null,
                        decisionAt: null,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            await this.createNotification({
                userFirebaseUid: claimRecord.firebaseUid,
                claimId: claimRecord._id,
                type: "documents_requested",
                title: "Documents requested",
                message: normalizedDocs.length > 0
                    ? `Insurer requested: ${normalizedDocs.join(', ')}`
                    : "Insurer requested additional documents for your claim.",
                data: {
                    status: "UnderReview",
                    requestedDocuments: normalizedDocs,
                    notes: typeof notes === "string" ? notes : null,
                },
                actionUrl: `/policyHolder-dashboard?tab=track&claimId=${claimRecord._id}`,
            });

            return res.status(200).json({ message: "Document request sent", data: updatedClaimRecord });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to request documents",
                error: err.message
            })
        }
    }

    async escalateClaim(req, res) {
        try {
            const { id } = req.params;
            const { escalationReason } = req.body;

            const claimRecord = await Claim.findById(id);

            if (!claimRecord) {
                return res.status(404).json({ message: "Claim not found" });
            }

            const updatedClaimRecord = await Claim.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: "Escalated",
                        rejectionReason: escalationReason || null,
                        decisionAt: null,
                        requestedDocumentsAt: null,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            await this.createNotification({
                userFirebaseUid: claimRecord.firebaseUid,
                claimId: claimRecord._id,
                type: "claim_escalated",
                title: "Claim escalated",
                message: escalationReason
                    ? `Your claim has been escalated: ${escalationReason}`
                    : "Your claim has been escalated for additional manual review.",
                data: { status: "Escalated", escalationReason: escalationReason || null },
                actionUrl: `/policyHolder-dashboard?tab=track&claimId=${claimRecord._id}`,
            });

            return res.status(200).json({ message: "Claim escalated", data: updatedClaimRecord });
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to escalate claim",
                error: err.message
            })
        }
    }
}


const decisionController = new DecisionController();
export default decisionController;