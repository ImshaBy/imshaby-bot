require('dotenv').config();
require('./models');
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
import { getConnection as mongoConnectionInit } from './mongo';
import { SessionContext } from 'telegraf-context';
import Redis from 'ioredis';

const redisClient = new Redis( parseInt(process.env.TELEGRAM_SESSION_PORT || '6379'), process.env.TELEGRAM_SESSION_HOST || '127.0.0.1');
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
  defaultLanguage: 'en',
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
  console.log('!!!!!!GROUP ENVENT:new member have joined %s(%s), %s', ctx.chat.title, ctx.chat.id, ctx.chat);

  const names = ctx.message.new_chat_members
    // .filter(({ is_bot }) => !is_bot)
    .map(({ first_name, last_name }) => `${first_name} ${last_name}`);

  // await ctx.deleteMessage();

  ctx.replyWithMarkdown(`Welcome ${names.join(', ')}!`);
};


bot.on('new_chat_members', newChatMemberHandler);

// bot.on('new_chat_members', (msg: SessionContext) => {
//    console.log('!!!!!!GROUP ENVENT:new member have joined %s(%s), %s', msg.chat.title, msg.chat.id, msg.chat);
//    if (msg.message.new_chat_members != undefined) {
//     console.log("if statement");
//     console.log(msg.message.new_chat_member.username);
//     console.log(msg.new_chat_member.id);
//   } else {
//       console.log("else statement");
//       console.log("new_chat_members is not defined");
//   }

//   }
// );

bot.hears(
  match('keyboards.main_keyboard.schedule'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('schedule'))
);

bot.hears(
  match('keyboards.main_keyboard.parish'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('parish'))
);

bot.hears(
  match('keyboards.main_keyboard.contact'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('contact'))
);

bot.hears(match('keyboards.main_keyboard.about'), updateUserTimestamp, asyncWrapper(about));

bot.hears(
  /(.*admin)/,
  isAdmin,
  asyncWrapper(async (ctx: SessionContext) => await ctx.scene.enter('admin'))
);

bot.hears(/(.*?)/, async (ctx: SessionContext) => {
  logger.debug(ctx, 'Default handler has fired');
  logger.debug(ctx, `Message: ${ctx.message.text}`);

  logger.info(ctx, `Incorrect message ${JSON.stringify(ctx.message)}`);

  const user = await User.findById(ctx.from.id);
  if (user) {
    await updateLanguage(ctx, user.language);
  }

  const { mainKeyboard } = getMainKeyboard(ctx);
  return await ctx.reply(ctx.i18n.t('other.default_handler'), mainKeyboard);
});


bot.catch((error: any) => {
  logger.error(undefined, 'Global error has happened, %O', error);
});

export const botTelegram = bot, redisSession = session, telegram = bot.telegram;
