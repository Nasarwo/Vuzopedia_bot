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
    },
    objects: {
      type: Array,
      required: true,
      default: 0,
    },
    image: {
      type: String, // URL изображения
      required: false, // Необязательное поле
    },
  },
  { timestamps: true }
);

// Экспорт схемы как модели
export default model("Vuz", VuzSchema);
