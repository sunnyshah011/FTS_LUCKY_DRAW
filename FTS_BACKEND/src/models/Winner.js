import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: String,
    luckyNumber: Number,
    phoneLast4: String,
    prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "Prize" },
    prizeName: String,
    prizeDescription: String,
    prizeImageUrl: String,
    prizeNumber: Number,
    category: String,
    drawOrder: { type: Number, unique: true },
  },
  { timestamps: true },
);
export default mongoose.models.Winner || mongoose.model("Winner", schema);
