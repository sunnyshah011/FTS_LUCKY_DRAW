import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.models.Admin || mongoose.model("Admin", schema);
