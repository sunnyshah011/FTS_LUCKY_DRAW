import { Router } from "express";
import {
    createPrize,
    deletePrize,
    drawNextWinner,
    getAdminParticipants,
    getParticipants,
    getPrizes,
    getWinners,
    importCustomers,
    testAdmin,
    updatePrize,
    resetEntireDraw
} from "../controllers/dataController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = Router();

router.get("/participants", getParticipants);
router.get("/participants/admin", verifyAdmin, getAdminParticipants);

router.get("/prizes", getPrizes);
router.post("/prizes", verifyAdmin, createPrize);
router.put("/prizes/:id", verifyAdmin, updatePrize);
router.delete("/prizes/:id", verifyAdmin, deletePrize);

router.get("/winners", getWinners);
router.post("/customers/import", verifyAdmin, importCustomers);

router.post("/draw/next", verifyAdmin, drawNextWinner);
router.get("/draw/test", verifyAdmin, testAdmin);

router.post("/draw/reset", verifyAdmin, resetEntireDraw);

export default router;
