import { Schema, model } from "mongoose";

const DirectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    objects: {
      type: [String], // Связанные предметы
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Direction", DirectionSchema);
