import express from "express";
import checkCoverageController from "../controllers/checkCoverage.controller.js";
import verifyAuth from "../middleware/verifyAuth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();



router.post(
    "/lifeInsurance",
    verifyAuth,
    upload.fields([
        { name: "insuranceClaimForm", maxCount: 1 },
        { name: "policyDocument", maxCount: 1 },
        { name: "deathCert", maxCount: 1 },
        { name: "hospitalDocument", maxCount: 1 },
        { name: "fir", maxCount: 1 },
        { name: "passBook", maxCount: 1 }
    ]),
    checkCoverageController.checkLifeInsurance
);



router.get("/getAIScore/:id", verifyAuth, checkCoverageController.getScore);

router.get("/allClaimChecks", verifyAuth, checkCoverageController.getAllClaimCheckData);

router.get("/getClaim/:id", verifyAuth, checkCoverageController.getClaim);

export default router;