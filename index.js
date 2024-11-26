require("dotenv").config();
const { Bot, GrammyError, HttpError, InlineKeyboard } = require("grammy");
const mongoose = require("mongoose");
const { vuzModel } = require("./models/Vuz");

const bot = new Bot(process.env.TOKEN);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;

let selectedOptions = new Set();
let scores = {};
let userStates = {};

bot.api.setMyCommands([
  {
    command: "start",
    description: "Запуск бота",
  },
  {
    command: "test1",
    description: "Выбор предметов",
  },
  {
    command: "test2",
    description: "плейсхолдер",
  },
]);

// Обработчик команды /start
bot.command("start", async (ctx) => {
  const keyboard = {
    keyboard: [
      ["Тест1"], // Первая кнопка в первой строке
      ["Тест2"], // Вторая кнопка в отдельной строке
    ],
    resize_keyboard: true, // Автоматически подгоняет размер клавиатуры
    one_time_keyboard: true, // Скрывает клавиатуру после нажатия
  };

  await ctx.reply("Выберите один из тестов:", {
    reply_markup: keyboard,
  });
});

bot.hears("Тест1", async (ctx) => {
  selectedOptions.clear();
  scores = {};
  delete userStates[ctx.from.id];

  const keyboard = generateKeyboard();
  await ctx.reply("Выберите предметы которые вы сдавали(-ете):", {
    reply_markup: keyboard,
  });
});

bot.hears("Тест2", async (ctx) => {
  userStates[ctx.from.id] = { step: "awaiting_name" }; // Устанавливаем начальное состояние
  await ctx.reply("Введите название вуза:");
});

// Обработчик ввода данных
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const userState = userStates[userId];

  if (!userState) {
    return; // Если состояния нет, игнорируем сообщение
  }

  if (userState.step === "awaiting_name") {
    const CheckName = await vuzModel.findOne({
      name: ctx.message.text,
    });

    if (CheckName) {
      await ctx.reply("Этот вуз уже добавлен!");
      return;
    }
    // userStates[userId].name = ctx.message.text;
    await vuzModel.create({
      name: ctx.message.text,
    });
    userStates[userId].step = "awaiting_description";
    await ctx.reply("Введите описание вуза:");
  } else if (userState.step === "awaiting_description") {
    userStates[userId].description = ctx.message.text;
    userStates[userId].step = "awaiting_subjects";
    await ctx.reply("Введите список предметов, разделяя их запятыми:");
  } else if (userState.step === "awaiting_subjects") {
    const subjects = ctx.message.text.split(",").map((s) => s.trim());
    universityData[userId] = {
      name: userStates[userId].name,
      description: userStates[userId].description,
      subjects,
    };

    // Удаляем состояние, так как ввод завершён
    delete userStates[userId];

    await ctx.reply(
      `Данные сохранены:\n\nНазвание: ${
        universityData[userId].name
      }\nОписание: ${
        universityData[userId].description
      }\nПредметы: ${subjects.join(", ")}`
    );
  }
});

// bot.hears("Тест2", async (ctx) => {
//   const inlineKeyboard = new InlineKeyboard()
//     .text("Тест 1", "inline_test1")
//     .row()
//     .text("Тест 2", "inline_test2")
//     .row()
//     .text("Тест 3", "inline_test3")
//     .row()
//     .text("Тест 4", "inline_test4")
//     .row()
//     .text("Тест 5", "inline_test5");

//   await ctx.reply("Выберите один из тестов:", {
//     reply_markup: inlineKeyboard,
//   });
// });
// bot.command("test1", async (ctx) => {
//   selectedOptions.clear();
//   scores = {};
//   delete userStates[ctx.from.id];

//   const keyboard = generateKeyboard();
//   await ctx.reply("Выберите предметы которые вы сдавали(-ете):", {
//     reply_markup: keyboard,
//   });
// });

// Функция для создания клавиатуры
function generateKeyboard() {
  const keyboard = new InlineKeyboard();
  const options = [
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
  options.forEach((option) => {
    const isSelected = selectedOptions.has(option) ? "✅ " : "";
    keyboard.text(`${isSelected}${option}`, option).row();
  });
  keyboard.text("Готово", "done");
  return keyboard;
}

// // Функция для создания клавиатуры для выбора баллов
// function generateScoreKeyboard(subject) {
//   const keyboard = new InlineKeyboard();
//   for (let i = 50; i <= 100; i += 5) {
//     keyboard.text(`${i}`, `score_${subject}_${i}`).row();
//   }
//   return keyboard;
// }

// Обработчик для нажатия на кнопки
bot.on("callback_query:data", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "done") {
    if (selectedOptions.size === 0) {
      await ctx.answerCallbackQuery("Вы не выбрали ни одной опции!");
    } else {
      await ctx.answerCallbackQuery("Выбор завершён!");
      await ctx.editMessageText(
        `Вы выбрали: ${
          Array.from(selectedOptions).join(", ") || "ничего"
        }.\n\nВаши баллы:\n${formatScores()}`
      );
    }
    return;
  }

  // Если нажали на предмет, запрашиваем баллы
  if (selectedOptions.has(callbackData)) {
    selectedOptions.delete(callbackData);
  } else {
    selectedOptions.add(callbackData);
    userStates[ctx.from.id] = { subject: callbackData }; // Устанавливаем предмет
    await ctx.answerCallbackQuery();
    await ctx.reply(`Введите количество баллов для предмета: ${callbackData}`);
    return;
  }

  // Обновляем клавиатуру
  await ctx.editMessageReplyMarkup({
    reply_markup: generateKeyboard(),
  });

  await ctx.answerCallbackQuery(`Вы выбрали: ${callbackData}`);
});

// Обработчик текстовых сообщений для ввода баллов
bot.on("message:text", async (ctx) => {
  const userState = userStates[ctx.from.id];
  if (userState && userState.subject) {
    const subject = userState.subject;
    const score = parseInt(ctx.message.text, 10);

    if (isNaN(score) || score < 0 || score > 100) {
      await ctx.reply(
        "Пожалуйста, введите корректное количество баллов (число от 0 до 100)."
      );
      return;
    }

    // Сохраняем баллы и сбрасываем состояние пользователя
    scores[subject] = score;
    delete userStates[ctx.from.id];

    await ctx.reply(`Вы ввели ${score} баллов для предмета "${subject}".`);

    // Возвращаем обновленную клавиатуру
    const keyboard = generateKeyboard();
    await ctx.reply("Выберите следующий предмет или завершите выбор:", {
      reply_markup: keyboard,
    });
  }
});

// Форматирование списка баллов
function formatScores() {
  if (Object.keys(scores).length === 0) return "Пока нет данных.";
  return Object.entries(scores)
    .map(([subject, score]) => `${subject}: ${score} баллов`)
    .join("\n");
}

// bot.hears("Русский язык", async (ctx) => {
//   object.name = message.text;
//   await ctx.reply("Сколько у вас баллов за этот предмет?");
// });

// bot.on("message", async (ctx) => {
//   const score = parseInt(ctx.message.text, 10);
//   if (!isNaN(score) && score >= 0 && score <= 100) {
//     object.score = score;
//     objects.push(object);
//   }
// });

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Ошибка отслеживания айди ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error("Ошибка в запросе:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Нет доступа к Telegram:", e);
  } else {
    console.error("Неизвестная ошибка:", e);
  }
});

async function start() {
  try {
    await mongoose.connect(
      `mongodb+srv://${DB_USER}:${DB_PASS}@vuzopediacluster.zxbp1.mongodb.net/${DB_NAME}?retryWrites=true&w=majority&appName=VuzopediaCluster`
    );

    bot.start();
  } catch (error) {
    console.error(error);
  }
}
start();
