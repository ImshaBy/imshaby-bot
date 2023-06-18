import * as dotenv from 'dotenv'
dotenv.config()

import fs from 'fs';
import path from 'path';
import Telegraf, {  Extra, Markup, Context } from 'telegraf';
import TelegrafI18n, { match } from 'telegraf-i18n';
import Stage from 'telegraf/stage';
import User from './models/User';
import logger from './util/logger';
import about from './controllers/about';
import startScene from './controllers/start';
import scheduleScene from './controllers/schedule';
import parishScene from './controllers/parish';
import { TelegrafSessionRedis, SessionOptions } from './middlewares/session-redis';

import settingsScene from './controllers/settings';
import contactScene from './controllers/contact';
import adminScene from './controllers/admin';
import asyncWrapper from './util/error-handler';
import { getMainKeyboard } from './util/keyboards';
import { updateLanguage } from './util/language';
import { updateUserTimestamp } from './middlewares/update-user-timestamp';
import { getUserInfo } from './middlewares/user-info';
import { isAdmin } from './middlewares/is-admin';
import { isSupportedChatType } from './middlewares/is-group-message';
import { getConnection as mongoConnectionInit } from './mongo';
import { SessionContext } from 'telegraf-context';
import Redis from 'ioredis';
import { cleanUpMessages } from './util/session';

// const redisClient = new Redis( parseInt(process.env.TELEGRAM_SESSION_PORT || '6379'), process.env.TELEGRAM_SESSION_HOST || '127.0.0.1');
const redisClient = new Redis({
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: parseInt(process.env.TELEGRAM_SESSION_PORT || '6379'),
    username: process.env.TELEGRAM_SESSION_USERNAME,
    password: process.env.TELEGRAM_SESSION_PASSWORD
});

redisClient.on('connect', function () {
    logger.info(undefined, 'Connection to Redis is successful');
});


const bot = new Telegraf<SessionContext>(process.env.TELEGRAM_TOKEN);



//  new Redis({
//   host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
//   port: parseInt(process.env.TELEGRAM_SESSION_PORT || '6379')
// });

const session = new TelegrafSessionRedis({client: redisClient});

// const session = new TelegrafSessionRedis({
//   store: {
//     // password: process.env.TELEGRAM_SESSION_PASS || '',
//     host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
//     port: process.env.TELEGRAM_SESSION_PORT || 6379
//   }
// });

mongoConnectionInit(process.env.NODE_ENV);

const stage = new Stage([
    startScene,
    // ,
    scheduleScene,
    // ,
    parishScene,
    // settingsScene,
    contactScene,
    adminScene
]);
const i18n = new TelegrafI18n({
    defaultLanguage: 'ru',
    directory: path.resolve(__dirname, 'locales'),
    useSession: true,
    allowMissing: false,
    sessionName: 'session'
});

bot.use(session.middleware());
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(getUserInfo);


bot.start(asyncWrapper(async (ctx: SessionContext) => ctx.scene.enter('start')));

const newChatMemberHandler = async (ctx: SessionContext) => {
    logger.info(ctx, 'GROUP ENVENT: new member have joined chat-id(%s), %s',ctx.chat.id, ctx.chat);

    const names = ctx.message.new_chat_members
    // .filter(({ is_bot }) => !is_bot)
        .map(({ first_name, last_name }) => `${first_name} ${last_name}`);

    // await ctx.deleteMessage();

    ctx.replyWithMarkdown(`Welcome ${names.join(', ')}!`);
};


bot.on('new_chat_members', newChatMemberHandler);

const testMessageWithButtons = async (ctx: SessionContext) => {
    bot.telegram.sendMessage('188184218', 'Test message for notification with buttons',
        Extra.HTML().markup((m: Markup) =>
            m.inlineKeyboard(
                [
                    // m.callbackButton(
                    //     ctx.i18n.t('scenes.parishes.refresh_button'),
                    //     JSON.stringify({ a: 'refreshSchedule', p: ctx.session.parish._id }),
                    //     false
                    // )
                    // ,
                    m.urlButton(
                    'Admin Panel Url',
                    `${process.env.ADMIN_URL}`,
                    false
                    )
                ],
                {}
            )
        )
    );
};

bot.hears(
    'test',
    isSupportedChatType,
    asyncWrapper(testMessageWithButtons)
);

bot.hears(
    match('keyboards.main_keyboard.schedule'),
    isSupportedChatType,
    updateUserTimestamp,
    asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('schedule'))
);
bot.command('update',  isSupportedChatType, updateUserTimestamp, asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('schedule')));


// bot.command('oldschool', (ctx) => ctx.reply('Hello'));

bot.hears(
    match('keyboards.main_keyboard.parish'),
    isSupportedChatType,
    updateUserTimestamp,
    asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('parish'))
);
bot.command('parish',  isSupportedChatType, updateUserTimestamp, asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('parish')));

bot.hears(
    match('keyboards.main_keyboard.contact'),
    isSupportedChatType,
    updateUserTimestamp,
    asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('contact'))
);
bot.command('contact',  isSupportedChatType, updateUserTimestamp, asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('contact')));

bot.hears(match('keyboards.main_keyboard.about'), updateUserTimestamp, asyncWrapper(about));
bot.command('info', updateUserTimestamp, asyncWrapper(about) );

bot.hears(
    /(.*admin)/,
    isSupportedChatType,
    isAdmin,
    asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('admin'))
);


bot.hears(/(.*?)/, isSupportedChatType, async (ctx: SessionContext) => {
    logger.debug(ctx, 'Default handler has fired');
    logger.debug(ctx, `Message: ${ctx.message.text}`);

    logger.info(ctx, `Incorrect message ${JSON.stringify(ctx.message.chat.type)}`);

    // const user = await User.findById(ctx.from.id);
    // if (user) {
    //   await updateLanguage(ctx, user.language);
    // }
    cleanUpMessages(ctx);
    const { mainKeyboard } = getMainKeyboard(ctx);
    return await ctx.reply(ctx.i18n.t('other.default_handler'), mainKeyboard);
});


bot.catch((error: any) => {
    logger.error(undefined, 'Global error has happened, %O', error);
});

export const botTelegram = bot, redisSession = session, telegram = bot.telegram;
