import dotenv from "dotenv";
dotenv.config();
import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import mongoose from "mongoose";
import vuzModel from "./models/Vuz.js";

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
    keyboard: [["Тест1"], ["Тест2"]],
    resize_keyboard: true,
    one_time_keyboard: true,
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
  userStates[ctx.from.id] = { step: "awaiting_name" };
  await ctx.reply("Введите название вуза:");
});

// Обработчик ввода данных
bot.on("message:text", async (ctx) => {
  if (!parseInt(ctx.message.text)) {
    //Тест2
    const userId = ctx.from.id; // Получаем ID пользователя
    const userState = userStates[userId];

    if (!userState) {
      await ctx.reply(
        "Ваш прогресс был утерян. Пожалуйста, начните заново с команды /start."
      );
      return;
    }

    // Шаг 1: Ожидание имени вуза
    if (userState.step === "awaiting_name") {
      const existingUniversity = await vuzModel.findOne({
        name: ctx.message.text,
      });

      if (existingUniversity) {
        await ctx.reply("Этот вуз уже добавлен!");
        return;
      }

      userStates[userId].name = ctx.message.text;
      userStates[userId].step = "awaiting_description"; // Переход к следующему шагу
      await ctx.reply("Введите описание вуза:");
      return;
    }

    // Шаг 2: Ожидание описания вуза
    if (userState.step === "awaiting_description") {
      userStates[userId].description = ctx.message.text;
      userStates[userId].step = "awaiting_link"; // Переход к следующему шагу
      await ctx.reply("Введите ссылку на сайт вуза:");
      return;
    }

    // Шаг 3: Ожидание ссылки на сайт
    if (userState.step === "awaiting_link") {
      userStates[userId].link = ctx.message.text;
      userStates[userId].step = "awaiting_subjects"; // Переход к следующему шагу
      await ctx.reply("Введите список предметов, разделяя их запятыми:");
      return;
    }

    // Шаг 4: Ожидание списка предметов
    if (userState.step === "awaiting_subjects") {
      const subjects = ctx.message.text.split(",").map((s) => s.trim());

      // Проверяем, есть ли все необходимые данные
      if (!userState.name || !userState.description || !userState.link) {
        await ctx.reply("Данные неполные. Пожалуйста, начните сначала.");
        delete userStates[userId]; // Сбрасываем состояние
        return;
      }

      // Сохраняем вуз в базу данных
      await vuzModel.create({
        name: userState.name,
        description: userState.description,
        link: userState.link,
        objects: subjects,
      });

      // Сбрасываем состояние
      delete userStates[userId];

      await ctx.reply(
        `Данные сохранены:\n\nНазвание: ${userState.name}\nОписание: ${
          userState.description
        }\nСсылка: ${userState.link}\nПредметы: ${subjects.join(", ")}`
      );
      return;
    }

    // Если состояние неожиданное
    await ctx.reply(
      "Произошла ошибка. Пожалуйста, начните заново с команды /start."
    );
    delete userStates[userId]; // Сбрасываем состояние для предотвращения цикла
  } else {
    //Тест1
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
  }
});

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

bot.on("callback_query:data", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "done") {
    if (selectedOptions.size === 0) {
      await ctx.answerCallbackQuery("Вы не выбрали ни одной опции!");
      return;
    }

    await ctx.answerCallbackQuery("Выбор завершён!");

    const selectedSubjects = Array.from(selectedOptions);
    const universities = await findUniversitiesBySubjects(selectedSubjects);

    if (universities.length > 0) {
      const universityList = universities
        .map(
          (uni) =>
            `Название: ${uni.name}\nОписание: ${uni.description}\nСайт: ${
              uni.link || "Ссылка отсутствует"
            }\nПредметы: ${uni.objects.join(", ")}`
        )
        .join("\n\n");

      await ctx.reply(`Найдены подходящие вузы:\n\n${universityList}`);
    } else {
      await ctx.reply(
        "К сожалению, не найдено вузов, соответствующих выбранным предметам."
      );
    }

    selectedOptions.clear();
    scores = {};
    delete userStates[ctx.from.id];
    return;
  } else {
    // Обработка выбора предметов (остальной код остаётся без изменений)
  }

  // if (callbackData === "done123") {
  //   if (selectedOptions.size === 0) {
  //     await ctx.answerCallbackQuery("Вы не выбрали ни одной опции!");
  //   } else {
  //     await ctx.answerCallbackQuery("Выбор завершён!");
  //     await ctx.editMessageText(
  //       `Вы выбрали: ${
  //         Array.from(selectedOptions).join(", ") || "ничего"
  //       }.\n\nВаши баллы:\n${formatScores()}`
  //     );
  //   }
  //   return;
  // }

  if (selectedOptions.has(callbackData)) {
    selectedOptions.delete(callbackData);
  } else {
    selectedOptions.add(callbackData);
    userStates[ctx.from.id] = { subject: callbackData };
    await ctx.answerCallbackQuery();
    await ctx.reply(`Введите количество баллов для предмета: ${callbackData}`);
    return;
  }

  await ctx.editMessageReplyMarkup({
    reply_markup: generateKeyboard(),
  });

  await ctx.answerCallbackQuery(`Вы выбрали: ${callbackData}`);
});

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

function formatScores() {
  if (Object.keys(scores).length === 0) return "Пока нет данных.";
  return Object.entries(scores)
    .map(([subject, score]) => `${subject}: ${score} баллов`)
    .join("\n");
}

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

async function findUniversitiesBySubjects(selectedSubjects) {
  // Выполняем поиск вузов, у которых хотя бы один предмет из списка совпадает
  const universities = await vuzModel.find({
    objects: { $all: selectedSubjects }, // Университет должен содержать все выбранные предметы
  });
  return universities;
}

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
