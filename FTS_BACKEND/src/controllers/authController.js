import { scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

function verifyPassword(password, stored) {
    try {
        const [scheme, salt, hash] = stored.split(":");

        if (scheme !== "scrypt") return false;

        const expected = Buffer.from(hash, "hex");
        const actual = scryptSync(password, salt, expected.length);

        return (
            expected.length === actual.length &&
            timingSafeEqual(expected, actual)
        );
    } catch {
        return false;
    }
}

export async function login(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const admin = await Admin.findOne({ email });

        if (
            !admin ||
            !admin.active ||
            !verifyPassword(password, admin.passwordHash)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );

        return res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export function getCurrentAdmin(req, res) {
    return res.json({ success: true, admin: req.admin });
}
