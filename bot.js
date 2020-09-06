const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const helpMsg = `Бот создан для помощи в управлении расписаниями месс на сайте imsha.by.
Основная задача бота - напоминанание о необходимости обновить мессы в парафии. Если изменений в расписании не произошло - бот позволяет обновить актуальность расписания одной командой. 
По умолчанию бот будет напоминать КАЖДЫЙ день в 18.00 (Минское время) за 5 дней до истечения срока актуальности месс. Частоту и время напоминания можно изменить через соответствующие команды.
\n*Доступно для анонимного пользователя:*
    /start - Старт работы с ботом.
    /help - Показать help страницу.
    /register - Регистрация администратора парафии для дальнейшего взаимодействия с ботом.
    /mistake - Сообщить об ошибке в расписании.
    /thx - Сказать спасибо команда imsha.by!
\n*Доступно тольк для зарегестрированных администраторов парафий:*
    /status - Информации о актуальности месс в парафии. 
    /update - В расписании нет изменений, обновление актуальности месс парафий.
    /deny - Прекратить напоминание. Бот не будет оповещать о необходимости обновить мессы парафии для вас в следующие 5 дней.
    /set - Установить расписание напоминаний. 
    `;

bot.start((ctx) => {
    return ctx.reply(`Хвала Хрысту, ${ctx.from.first_name ? ctx.from.first_name : 'дорогой пользователь'}! 
    Меня зовут, ImshaBy_Bot! Я создан, чтоб помочь администратору парафий поддерживать постоянную актуальность расписания на сайте imsha.by.
    Используй команду /help, чтобы увидеть все доступные команды.`);
});

bot.help((ctx) => {
    return ctx.replyWithMarkdown(helpMsg);
});

// bot.command('whoami', (ctx) => {
//     let userInfo = JSON.stringify(ctx.from);
//     return ctx.reply(`User info: ${userInfo}`);
// })

bot.command('register', (ctx) => {
    return ctx.replyWithMarkdown('*Register stub!*');
})

bot.command('mistake', (ctx) => {
    return ctx.replyWithMarkdown('*Mistake stub!*');
})

bot.command('thx', (ctx) => {
    return ctx.replyWithMarkdown('*Thx stub!*');
})

bot.command('status', (ctx) => {
    return ctx.replyWithMarkdown('*Status stub!*');
})

bot.command('update', (ctx) => {
    return ctx.replyWithMarkdown('*Update stub!*');
})

bot.command('deny', (ctx) => {
    return ctx.replyWithMarkdown('*Deny stub!*');
})

bot.command('set', (ctx) => {
    return ctx.replyWithMarkdown('*Set stub!*');
})

bot.on('text', (ctx) => {
    return ctx.reply(ctx.message.text);
})

module.exports = {
    bot
}