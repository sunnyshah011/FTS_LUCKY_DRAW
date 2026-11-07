import jwt from "jsonwebtoken";
export function verifyAdmin(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/, "");
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Authentication token is missing." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Administrator access denied." });
    req.admin = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
  }
}
