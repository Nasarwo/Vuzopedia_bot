import { Schema, model } from "mongoose";

const VuzSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    objects: {
      type: Array,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

// Экспорт схемы как модели
export const VuzModel = model("Vuz", VuzSchema);
