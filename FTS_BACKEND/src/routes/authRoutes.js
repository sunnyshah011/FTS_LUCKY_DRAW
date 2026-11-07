import { Router } from "express";
import {
    getCurrentAdmin,
    login,
} from "../controllers/authController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = Router();

router.post("/login", login);
router.get("/me", verifyAdmin, getCurrentAdmin);

export default router;
