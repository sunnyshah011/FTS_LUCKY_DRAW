import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { scryptSync, randomBytes } from "node:crypto";
import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";
import authRoutes from "./routes/authRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";

dotenv.config();
const app = express();
app.use(
    cors({
        origin: (process.env.CLIENT_URL || "http://localhost:5173")
            .split(",")
            .map((x) => x.trim()),
        credentials: true,
    }),
);
app.use(express.json({ limit: "2mb" }));
await connectDB();
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const exists = await Admin.findOne({ email });
    if (!exists) {
        const salt = randomBytes(16).toString("hex");
        const passwordHash = `scrypt:${salt}:${scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString("hex")}`;
        await Admin.create({ email, passwordHash });
        console.log(`Initial administrator created: ${email}`);
    }
}
app.get("/", (req, res) =>
    res.json({ success: true, message: "Fishing Tackle Store API is running." }),
);
app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error." });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
