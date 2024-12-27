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
    link: {
      type: String,
      required: true,
    },
    directions: {
      type: [String], // Список направлений, связанных с вузом
      required: true,
    },
    direction_links: {
      type: [String],
    },
    region: {
      type: String,
      required: true,
    },
    image: {
      type: String, // URL изображения
      default: null,
    },
  },
  { timestamps: true }
);

export default model("Vuz", VuzSchema);
