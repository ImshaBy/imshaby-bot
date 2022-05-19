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
import RedisSession from 'telegraf-session-redis';

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

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const session = new RedisSession({
  store: {
    password: process.env.TELEGRAM_SESSION_PASS || '',
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379
  }
});

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

bot.use(session);
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(getUserInfo);


bot.start(asyncWrapper(async (ctx: Context) => ctx.scene.enter('start')));

bot.hears(
  match('keyboards.main_keyboard.schedule'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: Context) => await ctx.scene.enter('schedule'))
);

bot.hears(
  match('keyboards.main_keyboard.parish'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: Context) => await ctx.scene.enter('parish'))
);

bot.hears(
  match('keyboards.main_keyboard.contact'),
  updateUserTimestamp,
  asyncWrapper(async (ctx: Context) => await ctx.scene.enter('contact'))
);

bot.hears(match('keyboards.main_keyboard.about'), updateUserTimestamp, asyncWrapper(about));

bot.hears(
  /(.*admin)/,
  isAdmin,
  asyncWrapper(async (ctx: Context) => await ctx.scene.enter('admin'))
);

bot.hears(/(.*?)/, async (ctx: Context) => {
  logger.debug(ctx, 'Default handler has fired');
  logger.debug(ctx, `Message: ${ctx.message.text}`);

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

export default bot;