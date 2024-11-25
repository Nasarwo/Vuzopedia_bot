require("dotenv").config();
const { Bot, GrammyError, HttpError, InlineKeyboard } = require("grammy");

const bot = new Bot(process.env.TOKEN);

// let objects = [];
// let object = {
//   name: "",
//   score: null,
// };

const selectedOptions = new Set();

bot.api.setMyCommands([
  {
    command: "start",
    description: "Запуск бота",
  },
  {
    command: "test",
    description: "плейсхолдер",
  },
]);

// Обработчик команды /start
bot.command("start", async (ctx) => {
  const keyboard = generateKeyboard();
  await ctx.reply("Выберите предметы которые вы сдавали(-ете):", {
    reply_markup: keyboard,
  });
});

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

// Обработчик для нажатия на кнопки
bot.on("callback_query:data", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "done") {
    if (selectedOptions.size === 0) {
      await ctx.answerCallbackQuery("Вы не выбрали ни одной опции!");
    } else {
      await ctx.answerCallbackQuery("Выбор завершён!");
      await ctx.editMessageText(
        `Вы выбрали: ${Array.from(selectedOptions).join(", ") || "ничего"}.`
      );
    }
    return;
  }

  // Добавляем или удаляем выбранную опцию
  if (selectedOptions.has(callbackData)) {
    selectedOptions.delete(callbackData);
  } else {
    selectedOptions.add(callbackData);
  }

  // Обновляем клавиатуру
  await ctx.editMessageReplyMarkup({
    reply_markup: generateKeyboard(),
  });

  // Сообщение пользователю
  await ctx.answerCallbackQuery(`Вы выбрали: ${callbackData}`);
  for (let i = 0; i < selectedOptions.length; i++) {}
});

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

bot.start();
