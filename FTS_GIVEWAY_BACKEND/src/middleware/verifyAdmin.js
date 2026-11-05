import { auth, db } from "../config/firebase.js";

export async function verifyAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const idToken = authorization.split("Bearer ")[1];

    const decodedToken = await auth.verifyIdToken(idToken);

    const adminRef = db.collection("admins").doc(decodedToken.uid);
    const adminSnapshot = await adminRef.get();

    if (!adminSnapshot.exists) {
      return res.status(403).json({
        success: false,
        message: "Administrator access denied.",
      });
    }

    const adminData = adminSnapshot.data();

    if (adminData.active !== true || adminData.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrator account is inactive or unauthorized.",
      });
    }

    req.admin = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };

    next();
  } catch (error) {
    console.error("Admin verification error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}
