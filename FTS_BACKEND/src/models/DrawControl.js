import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    lastDrawOrder: { type: Number, default: 0 },
    lastPrizeId: String,
  },
  { timestamps: true },
);
export default mongoose.models.DrawControl ||
  mongoose.model("DrawControl", schema);
