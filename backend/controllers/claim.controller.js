import LifeInsurance from "../models/lifeInsurance.model.js";
import Claim from "../models/claim.model.js";
import Insurer from "../models/insurer.model.js";
import handleMultipleUploads from "../utils/handleFileUpload.js";
import getAIInsights from "../services/getAIInsights.service.js";
import Upload from "../models/upload.model.js";

class ClaimController {
  // Vehicle and Health claim endpoints removed — only Life Insurance supported

  async claimLifeInsurance(req, res) {
    try {
      // Validate req.user exists
      if (!req.user || !req.user.firebaseUid) {
        return res.status(401).json({
          message: "Authentication failed",
          error: "User not authenticated",
        });
      }

      console.log("Claim Life Insurance - Request body:", req.body);
      console.log("Claim Life Insurance - Request files:", req.files);
      console.log("Claim Life Insurance - Firebase UID:", req.user.firebaseUid);

      const fileMetaMap = await handleMultipleUploads(req);
      const firebaseUid = req.user.firebaseUid;

      const {
        insurerIrdai,
        uin,
        policyNumber,
        policyHolderName,
        dob,
        claimAmt,
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
      } = req.body;

      // Validate required fields
      if (!insurerIrdai || !uin || !policyNumber || !policyHolderName) {
        return res.status(400).json({
          message: "Missing required fields",
          error:
            "insurerIrdai, uin, policyNumber, and policyHolderName are required",
        });
      }

      const newLifeInsurance = await LifeInsurance.create({
        firebaseUid,
        uin,
        policyNumber,
        policyHolderName,
        dob,
        dateOfDeath,
        claimAmt,
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
          passBook: fileMetaMap?.passBook?.[0]?._id || null,
        },
      });

      const newClaim = await Claim.create({
        insurerIrdai,
        firebaseUid,
        policyType: "life-insurance",
        policyId: newLifeInsurance._id,
        policyModel: "LifeInsurance",
      });

      return res.status(201).json({
        message: "Life insurance claim successfully created",
        data: {
          lifeInsurance: newLifeInsurance,
          newClaim: newClaim,
        },
      });
    } catch (err) {
      console.error("Error in claimLifeInsurance:", err);
      console.error("Error stack:", err.stack);
      return res.status(500).json({
        message: "Failed to create life insurance claim",
        error: err.message || "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }

  // Health claim endpoints removed — only Life Insurance supported

  // Vehicle edit endpoint removed — only Life Insurance supported

  async editLifeInsurance(req, res) {
    try {
      const { id } = req.params;

      const claimRecord = await Claim.findById(id);
      if (!claimRecord) {
        return res.status(404).json({ message: "Claim Not Found" });
      }

      const fileMetaMap = await handleMultipleUploads(req);
      const firebaseUid = req.user.firebaseUid;

      const {
        insurerIrdai,
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
      } = req.body;

      const insuranceId = claimRecord.policyId;

      const updatedLifeInsurance = await LifeInsurance.findByIdAndUpdate(
        insuranceId,
        {
          $set: {
            firebaseUid,
            uin,
            policyNumber,
            policyHolderName,
            dob,
            dateOfDeath,
            causeOfDeath,
            insuranceClaimForm:
              fileMetaMap?.insuranceClaimForm?.[0]?._id || null,
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
              passBook: fileMetaMap?.passBook?.[0]?._id || null,
            },
          },
        },
        { new: true, upsert: true }
      );

      claimRecord = await Claim.findByIdAndUpdate(
        id,
        {
          $set: {
            insurerIrdai,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Life insurance claim updated successfully",
        data: {
          updatedLifeInsurance,
          claim: claimRecord,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: "Failed to update life insurance claim",
        error: err.message,
      });
    }
  }

  // Health edit endpoint removed — only Life Insurance supported
 

  async submitInsurance(req, res) {
    try {
      console.log("Submit Insurance", req.params);
      const { id } = req.params;

      const claimRecord = await Claim.findById(id);

      console.log("Claim Record", claimRecord);

      if (!claimRecord) {
        return res.status(404).json({ message: "Claim Not Found" });
      }

      // const insurer = await Insurer.findOne({ irdai: claimRecord.insurerIrdai });

      // if (!insurer) {
      //     return res.status(404).json({
      //         message: `The menitoned Insurance company with IRDAI ${claimRecord.insurerIrdai} is either wrong or is not registered on our platform`
      //     })
      // }

      await Claim.findByIdAndUpdate(id, {
        $set: {
          status: "Submitted",
        },
      });

      return res.status(200).json({ message: "Claim Submitted To Company" });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({
        message: "Failed to Submit Claim",
        error: err.message,
      });
    }
  }

  async getScore(req, res) {
    const { id } = req.params;
    console.log("Get Score", id);

    try {
      const claimRecord = await Claim.findById(id);

      if (!claimRecord) {
        return res.status(404).json({ message: "No record of claims found" });
      }

      let Model;
      let aiResponse;
      if (claimRecord.policyModel === "LifeInsurance") {
        Model = LifeInsurance;
        const insureDoc = await Model.findById(claimRecord.policyId);

        if (!insureDoc) {
          return res.status(404).json({ message: "Insurance Data not found" });
        }

        try {
          aiResponse = await getAIInsights.getAIClaimCheckLife(insureDoc);
        } catch (err) {
          console.error("AI call failed in getScore:", err.message || err);
          // Graceful fallback so frontend receives a safe response instead of 500
          aiResponse = {
            aiScore: null,
            aiConfidence: null,
            aiSuggestions: ["AI analysis failed or unavailable"]
          };
        }
      } else {
        // Only LifeInsurance is supported in this deployment
        return res.status(400).json({ message: "Unsupported policy model" });
      }

      // Normalize AI response to avoid schema casting/validation issues
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
        data: {
          aiScore: aiResponse.aiScore,
          aiConfidence: aiResponse.aiConfidence,
          aiSuggestions: aiResponse.aiSuggestions,
        },
      });
    } catch (err) {
      console.error("AI Analysis Error:", err.message);
      return res
        .status(500)
        .json({ message: "AI processing failed", error: err.message });
    }
  }

  async getAllClaimsByUser(req, res) {
    try {
      const firebaseUid = req.user.firebaseUid;

      let claimArray = [];

      const claimRecords = await Claim.find({ firebaseUid });
      console.log(claimRecords);

      if (!claimRecords || claimRecords.length === 0) {
        console.log("No claim records found for user");
        return res.status(200).json({ claimArray: [] });
      }

      for (const claim of claimRecords) {
        const insuranceId = claim.policyId;

        if (claim.policyModel !== "LifeInsurance") {
          console.warn("Skipping non-life policy:", claim.policyModel);
          continue;
        }

        const insuranceDetails = await LifeInsurance.findById(insuranceId);
        console.log(insuranceDetails);

        claimArray.push({
          claim,
          insuranceDetails,
        });
      }

      return res.status(200).json({
        message: "Claim records fetched successfully",
        data: claimArray,
      });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({
        message: "Failed to fetch claim records",
        error: err.message,
      });
    }
  }

  async getClaim(req, res) {
    try {
      const { id } = req.params;

      const claimRecord = await Claim.findById(id);

      if (!claimRecord) {
        return res.status(404).json({ message: "Claim Not found" });
      }

      const insuranceId = claimRecord.policyId;

      if (claimRecord.policyModel !== "LifeInsurance") {
        return res.status(400).json({ message: "Only LifeInsurance claims are supported" });
      }

      const insuranceDetails = await LifeInsurance.findById(insuranceId);

      if (!claimRecord) {
        return res
          .status(404)
          .json({ message: "Insurance of this claim Not found" });
      }

      return res.status(200).json({
        claimRecord,
        insuranceDetails,
      });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({
        message: "Failed to fetch claim records",
        error: err.message,
      });
    }
  }

  async evaluateRisk(req, res) {
    const { id } = req.params;

    try {
      const claimRecord = await Claim.findById(id);

      if (!claimRecord) {
        return res.status(404).json({ message: "No record of claims found" });
      }

      if (claimRecord.policyModel !== "LifeInsurance") {
        return res.status(400).json({ message: "Risk evaluation only supported for Life Insurance" });
      }

      const populateFields = [
        "insuranceClaimForm",
        "policyDocument",
        "deathCert",
        "hospitalDocument",
        "fir",
        "nominee.passBook",
      ];

      const insureDoc = await LifeInsurance.findById(claimRecord.policyId).populate(populateFields);

      if (!insureDoc) {
        return res.status(404).json({ message: "Insurance Data not found" });
      }

      const aiResponse = await getAIInsights.evaluateRisk(insureDoc);

      if (!aiResponse) {
        return res.status(400).json({ message: "AI analysis failed" });
      }

      const badFiles = aiResponse.suspicious_files || [];
      for (const fileObj of badFiles) {
        const fileId = fileObj._id;
        const fileRecord = await Upload.findById(fileId);
        if (!fileRecord) continue;
        fileRecord.fraudFlag = true;
        await fileRecord.save();
      }

      claimRecord.risk_factors = (claimRecord.risk_factors || []).concat(aiResponse.risk_factors || []);
      await claimRecord.save();

      return res.status(200).json({
        message: "Risk evaluated and flagged files updated",
        data: {
          risk_factors: aiResponse.risk_factors || [],
          suspicious_files: aiResponse.suspicious_files || [],
        },
      });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({
        message: "Risk evaluation failed",
        error: err.message,
      });
    }
  }
}

const claimController = new ClaimController();
export default claimController;
