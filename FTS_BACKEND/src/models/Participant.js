// import mongoose from "mongoose";
// const schema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true },
//     address: { type: String, default: "" },
//     luckyNumber: { type: Number, required: true, unique: true },
//     phoneLast4: { type: String, default: "" },
//     normalizedPhone: { type: String, default: "" },
//     phoneHash: { type: String, default: "", index: true },
//     phone: { type: String, select: false, default: "" },
//   },
//   { timestamps: true },
// );
// schema.index(
//   { normalizedPhone: 1 },
//   {
//     unique: true,
//     partialFilterExpression: { normalizedPhone: { $type: "string", $gt: "" } },
//   },
// );
// export default mongoose.models.Participant ||
//   mongoose.model("Participant", schema);



import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedName: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    luckyNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    phoneLast4: {
      type: String,
      default: "",
    },

    normalizedPhone: {
      type: String,
      default: "",
    },

    phoneHash: {
      type: String,
      default: "",
      index: true,
    },

    phone: {
      type: String,
      select: false,
      default: "",
    },
  },
  { timestamps: true }
);

// Only same name + same phone is considered duplicate
schema.index(
  { normalizedName: 1, normalizedPhone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      normalizedName: { $type: "string", $gt: "" },
      normalizedPhone: { $type: "string", $gt: "" },
    },
  }
);

export default mongoose.models.Participant ||
  mongoose.model("Participant", schema);
