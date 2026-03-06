import express from "express";
import claimController from "../controllers/claim.controller.js";
import verifyAuth from "../middleware/verifyAuth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();




router.post(
  "/lifeInsurance",
  verifyAuth,
  (req, res, next) => {
    // Wrap multer middleware to catch errors
    upload.fields([
      { name: "insuranceClaimForm", maxCount: 1 },
      { name: "policyDocument", maxCount: 1 },
      { name: "deathCert", maxCount: 1 },
      { name: "hospitalDocument", maxCount: 1 },
      { name: "fir", maxCount: 1 },
      { name: "passBook", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).json({
          message: "File upload error",
          error: err.message || "Failed to process file upload",
        });
      }
      next();
    });
  },
  claimController.claimLifeInsurance
);

router.put(
  "/lifeInsurance/edit/:id",
  verifyAuth,
  upload.fields([
    { name: "insuranceClaimForm", maxCount: 1 },
    { name: "policyDocument", maxCount: 1 },
    { name: "deathCert", maxCount: 1 },
    { name: "hospitalDocument", maxCount: 1 },
    { name: "fir", maxCount: 1 },
    { name: "passBook", maxCount: 1 },
  ]),
  claimController.editLifeInsurance
);





router.post("/submit/:id", verifyAuth, claimController.submitInsurance);

router.get("/getAIScore/:id", verifyAuth, claimController.getScore);

router.get("/getAllClaims", verifyAuth, claimController.getAllClaimsByUser);

router.get("/getClaim/:id", verifyAuth, claimController.getClaim);

export default router;
