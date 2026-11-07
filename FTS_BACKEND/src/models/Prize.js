import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, enum: ["main", "small"], required: true },
    imageUrl: { type: String, default: "" },
    sequence: { type: Number, required: true },
    drawn: { type: Boolean, default: false },
    drawnAt: Date,
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Winner",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Prize || mongoose.model("Prize", schema);
