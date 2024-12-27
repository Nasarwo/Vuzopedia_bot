// import dotenv from "dotenv";
// import { fileURLToPath } from "url";
// import { dirname, resolve } from "path";
// dotenv.config();
// import { Bot, GrammyError, HttpError, InlineKeyboard, InputFile } from "grammy";
// import mongoose from "mongoose";
// import vuzModel from "./models/Vuz.js";
// import directionModel from "./models/Direction.js";
// import fs from "fs";

// const bot = new Bot(process.env.TOKEN);
// const DB_NAME = process.env.DB_NAME;
// const DB_USER = process.env.DB_USER;
// const DB_PASS = process.env.DB_PASS;

// let selectedSubjects = new Set();
// let selectedDirections = new Set();
// let userStates = {};

// bot.api.setMyCommands([{ command: "start", description: "Запуск бота" }]);

// bot.command("start", async (ctx) => {
//   selectedSubjects.clear();
//   selectedDirections.clear();
//   userStates[ctx.from.id] = { step: null };

//   const keyboard = {
//     keyboard: [["Начать"], ["🎧 Обратная связь"]],
//     resize_keyboard: true,
//     one_time_keyboard: true,
//   };
//   await ctx.reply("Выберите тест или свяжитесь с нами:", {
//     reply_markup: keyboard,
//   });
// });

// bot.hears("🎧 Обратная связь", async (ctx) => {
//   await ctx.reply("Для обратной связи напишите @Ask0ooo");
// });

// bot.hears("Начать", async (ctx) => {
//   userStates[ctx.from.id].step = "select_subjects";
//   const keyboard = generateSubjectsKeyboard();
//   await ctx.reply("Выберите предметы, которые вы сдавали(-ете):", {
//     reply_markup: keyboard,
//   });
// });

// bot.hears("Добавить вуз", async (ctx) => {
//   userStates[ctx.from.id] = { step: "awaiting_name" };
//   await ctx.reply("Введите название нового вуза:");
// });

// bot.on("callback_query:data", async (ctx) => {
//   const userId = ctx.from.id;
//   const callbackData = ctx.callbackQuery.data;

//   if (callbackData === "done_subjects") {
//     if (selectedSubjects.size === 0) {
//       await ctx.answerCallbackQuery("Вы не выбрали ни одного предмета!");
//       return;
//     }

//     userStates[userId].subjects = Array.from(selectedSubjects);
//     const keyboard = await generateDirectionsKeyboard(selectedSubjects);
//     userStates[userId].step = "select_directions";

//     await ctx.reply(
//       "Выберите направления, связанные с выбранными предметами:",
//       {
//         reply_markup: keyboard,
//       }
//     );
//     await ctx.answerCallbackQuery("Выбор предметов завершён!");
//   } else if (callbackData === "done_directions") {
//     if (selectedDirections.size === 0) {
//       await ctx.answerCallbackQuery("Вы не выбрали ни одного направления!");
//       return;
//     }

//     userStates[userId].directions = Array.from(selectedDirections);
//     selectedSubjects.clear();
//     selectedDirections.clear();

//     const universities = await vuzModel.find({
//       directions: { $in: userStates[userId].directions },
//     });

//     if (universities.length === 0) {
//       await ctx.reply(
//         "К сожалению, не найдено ни одного вуза с выбранными направлениями."
//       );
//     } else {
//       for (const uni of universities) {
//         const imagePath = uni.image ? resolve("./images", uni.image) : null;

//         try {
//           const keyboard = new InlineKeyboard().url("Сайт", uni.link || "#");

//           if (uni.direction_links && uni.direction_links.length > 0) {
//             keyboard.url("Направления", uni.direction_links[0] || "#");
//           }

//           if (imagePath && fs.existsSync(imagePath)) {
//             const imageFile = new InputFile(fs.createReadStream(imagePath));
//             await ctx.replyWithPhoto(imageFile, {
//               caption: `<strong>${uni.name}</strong>

// ${uni.description}`,
//               parse_mode: "HTML",
//               reply_markup: keyboard,
//             });
//           } else {
//             await ctx.reply(
//               `<strong>${uni.name}</strong>

// ${uni.description}

// Направление: ${uni.directions.join(", ")}`,
//               {
//                 parse_mode: "HTML",
//                 reply_markup: keyboard,
//               }
//             );
//           }
//         } catch (error) {
//           console.error("Ошибка отправки сообщения:", error);
//           await ctx.reply(
//             `Не удалось отправить данные для вуза: ${uni.name}. Пожалуйста, попробуйте позже.`
//           );
//         }
//       }
//     }

//     await ctx.answerCallbackQuery("Выбор направлений завершён!");
//     delete userStates[userId];
//   } else {
//     const userState = userStates[userId];
//     if (userState && userState.step === "select_subjects") {
//       if (selectedSubjects.has(callbackData)) {
//         selectedSubjects.delete(callbackData);
//       } else {
//         selectedSubjects.add(callbackData);
//       }
//       const keyboard = generateSubjectsKeyboard();
//       await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
//     } else if (userState && userState.step === "select_directions") {
//       if (selectedDirections.has(callbackData)) {
//         selectedDirections.delete(callbackData);
//       } else {
//         selectedDirections.add(callbackData);
//       }
//       const keyboard = await generateDirectionsKeyboard(selectedSubjects);
//       await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
//     }
//   }
// });

// function generateSubjectsKeyboard() {
//   const keyboard = new InlineKeyboard();
//   const subjects = [
//     "Русский язык",
//     "Математика",
//     "Информатика",
//     "Обществознание",
//     "Иностранный язык",
//     "Биология",
//     "Химия",
//     "История",
//     "Литература",
//     "География",
//     "Физика",
//   ];
//   subjects.forEach((subject) =>
//     keyboard
//       .text(`${selectedSubjects.has(subject) ? "✅ " : ""}${subject}`, subject)
//       .row()
//   );
//   keyboard.text("Готово", "done_subjects");
//   return keyboard;
// }

// async function generateDirectionsKeyboard(selectedSubjects) {
//   console.log(selectedSubjects);
//   const subjectsArray = Array.from(selectedSubjects);
//   console.log(subjectsArray);
//   const keyboard = new InlineKeyboard();
//   const directions = await directionModel.find({
//     objects: { $all: subjectsArray },
//   });
//   directions.forEach((direction) =>
//     keyboard
//       .text(
//         `${selectedDirections.has(direction._id.toString()) ? "✅ " : ""}${
//           direction.name
//         }`,
//         direction._id.toString()
//       )
//       .row()
//   );
//   keyboard.text("Готово", "done_directions");
//   return keyboard;
// }

// async function start() {
//   try {
//     await mongoose.connect(
//       `mongodb+srv://${DB_USER}:${DB_PASS}@vuzopediacluster.zxbp1.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`
//     );
//     bot.start();
//   } catch (error) {
//     console.error("Ошибка подключения к базе данных:", error);
//   }
// }
// start();

import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config();
import { Bot, InlineKeyboard, InputFile } from "grammy";
import mongoose from "mongoose";
import vuzModel from "./models/Vuz.js";
import directionModel from "./models/Direction.js";
import fs from "fs";

const bot = new Bot(process.env.TOKEN);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;

let selectedSubjects = new Set();
let selectedDirections = new Set();
let userStates = {};

bot.api.setMyCommands([{ command: "start", description: "Запуск бота" }]);

bot.command("start", async (ctx) => {
  selectedSubjects.clear();
  selectedDirections.clear();
  userStates[ctx.from.id] = { step: null };

  const keyboard = {
    keyboard: [["Начать"], ["🎧 Обратная связь"]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
  await ctx.reply("Выберите тест или свяжитесь с нами:", {
    reply_markup: keyboard,
  });
});

bot.hears("🎧 Обратная связь", async (ctx) => {
  await ctx.reply("Для обратной связи напишите @Ask0ooo");
});

bot.hears("Начать", async (ctx) => {
  userStates[ctx.from.id].step = "select_subjects";
  const keyboard = generateSubjectsKeyboard();
  await ctx.reply("Выберите предметы, которые вы сдавали(-ете):", {
    reply_markup: keyboard,
  });
});

bot.on("callback_query:data", async (ctx) => {
  const userId = ctx.from.id;
  const callbackData = ctx.callbackQuery.data;

  const userState = userStates[userId];

  if (callbackData === "done_subjects") {
    if (selectedSubjects.size === 0) {
      await ctx.answerCallbackQuery("Вы не выбрали ни одного предмета!");
      return;
    }

    userState.subjects = Array.from(selectedSubjects);
    const keyboard = await generateDirectionsKeyboard(selectedSubjects);
    userState.step = "select_directions";

    await ctx.reply(
      "Выберите направления, связанные с выбранными предметами:",
      {
        reply_markup: keyboard,
      }
    );
    await ctx.answerCallbackQuery("Выбор предметов завершён!");
  } else if (callbackData === "done_directions") {
    if (selectedDirections.size === 0) {
      await ctx.answerCallbackQuery("Вы не выбрали ни одного направления!");
      return;
    }

    userState.directions = Array.from(selectedDirections);
    const keyboard = await generateRegionsKeyboard();
    userState.step = "select_region";

    await ctx.reply("Выберите регион:", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery("Выбор направлений завершён!");
  } else if (userState && userState.step === "select_region") {
    userState.region = callbackData;

    const universities = await vuzModel.find({
      directions: { $in: userState.directions },
      region: userState.region,
    });

    if (universities.length === 0) {
      await ctx.reply(
        `В выбранном регионе (${userState.region}) не найдено ни одного вуза с выбранными направлениями.`
      );
    } else {
      for (const uni of universities) {
        const imagePath = uni.image ? resolve("./images", uni.image) : null;

        try {
          const keyboard = new InlineKeyboard().url("Сайт", uni.link || "#");

          if (uni.direction_links && uni.direction_links.length > 0) {
            keyboard.url("Направления", uni.direction_links[0] || "#");
          }

          if (imagePath && fs.existsSync(imagePath)) {
            const imageFile = new InputFile(fs.createReadStream(imagePath));
            await ctx.replyWithPhoto(imageFile, {
              caption: `<strong>${uni.name}</strong>

${uni.description}`,
              parse_mode: "HTML",
              reply_markup: keyboard,
            });
          } else {
            await ctx.reply(
              `<strong>${uni.name}</strong>

${uni.description}

Направления: ${uni.directions.join(", ")}`,
              {
                parse_mode: "HTML",
                reply_markup: keyboard,
              }
            );
          }
        } catch (error) {
          console.error("Ошибка отправки сообщения:", error);
          await ctx.reply(
            `Не удалось отправить данные для вуза: ${uni.name}. Пожалуйста, попробуйте позже.`
          );
        }
      }
    }

    delete userStates[userId];
    await ctx.answerCallbackQuery("Регион выбран!");
  } else if (userState && userState.step === "select_subjects") {
    if (selectedSubjects.has(callbackData)) {
      selectedSubjects.delete(callbackData);
    } else {
      selectedSubjects.add(callbackData);
    }
    const keyboard = generateSubjectsKeyboard();
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  } else if (userState && userState.step === "select_directions") {
    if (selectedDirections.has(callbackData)) {
      selectedDirections.delete(callbackData);
    } else {
      selectedDirections.add(callbackData);
    }
    const keyboard = await generateDirectionsKeyboard(selectedSubjects);
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  }
});

function generateSubjectsKeyboard() {
  const keyboard = new InlineKeyboard();
  const subjects = [
    "Русский язык",
    "Математика",
    "Информатика",
    "Обществознание",
    "Иностранный язык",
    "Биология",
    "Химия",
    "История",
    "Литература",
    "География",
    "Физика",
  ];
  subjects.forEach((subject) =>
    keyboard
      .text(`${selectedSubjects.has(subject) ? "✅ " : ""}${subject}`, subject)
      .row()
  );
  keyboard.text("Готово", "done_subjects");
  return keyboard;
}

async function generateDirectionsKeyboard(selectedSubjects) {
  const subjectsArray = Array.from(selectedSubjects);
  const keyboard = new InlineKeyboard();
  const directions = await directionModel.find({
    objects: { $all: subjectsArray },
  });
  directions.forEach((direction) =>
    keyboard
      .text(
        `${selectedDirections.has(direction._id.toString()) ? "✅ " : ""}${
          direction.name
        }`,
        direction._id.toString()
      )
      .row()
  );
  keyboard.text("Готово", "done_directions");
  return keyboard;
}

async function generateRegionsKeyboard() {
  const regions = await vuzModel.distinct("region");
  const keyboard = new InlineKeyboard();

  regions.forEach((region) => {
    keyboard.text(region, region).row();
  });

  return keyboard;
}

async function start() {
  try {
    await mongoose.connect(
      `mongodb+srv://${DB_USER}:${DB_PASS}@vuzopediacluster.zxbp1.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`
    );
    bot.start();
  } catch (error) {
    console.error("Ошибка подключения к базе данных:", error);
  }
}

start();
