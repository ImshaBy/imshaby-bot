import { Context, session } from 'telegraf';
import Stage from 'telegraf/stage';
import Scene from 'telegraf/scenes/base';
import { languageChangeAction } from './actions';
import { getLanguageKeyboard } from './helpers';
import logger from '../../util/logger';
import User, { IUser } from '../../models/User';
import { getMainKeyboard } from '../../util/keyboards';
import { saveToSession } from '../../util/session';
import { getUserParishes } from '../schedule/helpers';
import { parishesLookupByKey } from '../../util/search-providers';
import { getAccountConfirmKeyboard } from './helpers';
import { sleep } from '../../util/common';


const { leave } = Stage;
const start = new Scene('start');

start.enter(async (ctx: Context) => {
  logger.debug(ctx, ' enter event');

  const uid = String(ctx.from.id);
  const user = await User.findById(uid);
  const commandTokens = ctx.message.text.split(/(\s+)/).filter(e => e.length > 1);
  let parishKey;
  if (commandTokens && commandTokens.length > 1) {
    parishKey = commandTokens[1];
  }
  await saveOrUpdateUser(user, parishKey, ctx);
});


start.on('text', async (ctx: Context) => {
  logger.debug(ctx, 'on text event');

  const user: IUser = await User.findById(String(ctx.from.id));
  const parishKey = ctx.message.text;
  saveOrUpdateUser(user, parishKey, ctx);
});


start.leave(async (ctx: Context) => {
  const { mainKeyboard } = getMainKeyboard(ctx);

  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

start.command('saveme', leave());
// start.action(/languageChange/, languageChangeAction);
start.action(/confirmAccount/, async (ctx: Context) => {
  await ctx.answerCbQuery();
  ctx.scene.leave();
});

export default start;

async function saveOrUpdateUser(user: IUser, parishKey: string, ctx: Context) {
  const parishesByKey = await parishesLookupByKey(parishKey);
  const parishKeyExists = parishesByKey.length > 0 ? true : false;
  const accountConfirmKeyboard = getAccountConfirmKeyboard(ctx);

  if ( !parishKeyExists ) {
    logger.error(ctx, 'No such parish key registered: ' + parishKey);
    // await ctx.reply('No such parish key registered: ' + parishKey);
  }
  if (user) {
    if (parishKeyExists) {
      await User.findOneAndUpdate(
        {
          _id: user._id
        },
        {
          $addToSet: { observableParishKeys: parishKey },
          $inc: { totalParishes: 1 }
        },
        {
          new: true
        }
      );
      logger.info(ctx, 'New parish key: ' + parishKey + ' has been added to existing user: ' + user._id);
      await ctx.reply('New parish key: ' + parishKey + ' has been added');
    }
    saveToSession(ctx, 'user', user );
    const accountConfirmKeyboard = getAccountConfirmKeyboard(ctx);
    await ctx.reply(ctx.i18n.t('scenes.start.welcome_back'), accountConfirmKeyboard);
  } else if (parishKeyExists) {
    const now = new Date().getTime();
    const newUser = new User({
      _id: String(ctx.from.id),
      created: now,
      username: ctx.from.username,
      name: ctx.from.first_name + ' ' + ctx.from.last_name,
      observableParishKeys: [parishKey],
      lastActivity: now,
      totalParishes: 1,
      language: 'ru'
    });
    await newUser.save();
    logger.debug(ctx, 'New user has been created with parish key: ' + parishKey);
    // await ctx.reply('New parish admin has been register with parish key : ' + parishKey);
    await sleep(2);
    saveToSession(ctx, 'user', user );
    saveToSession(ctx, 'language', 'ru');
    ctx.i18n.locale('ru');

    await ctx.reply(ctx.i18n.t('scenes.start.bot_description'), accountConfirmKeyboard);
    await ctx.answerCbQuery();
  } else {
    await ctx.reply(ctx.i18n.t('scenes.start.no_parish_key'));
  }
}



