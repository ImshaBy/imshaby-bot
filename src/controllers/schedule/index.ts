import { match } from 'telegraf-i18n';
import Stage from 'telegraf/stage';
import Scene from 'telegraf/scenes/base';
import logger from '../../util/logger';
import User from '../../models/User';
import { parishSelectAction, refreshScheduleAction } from './actions';
import { getParishesMenus, getUserParishes } from './helpers';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';
import { exposeParish } from '../../middlewares/expose-parish';
import { IParishResult } from '../../util/parish-lookup';
import { cleanUpMessages, saveToSession } from '../../util/session';
import { SessionContext } from 'telegraf-context';


const { leave } = Stage;
const schedule = new Scene('schedule');

schedule.enter(async (ctx: SessionContext) => {
  logger.debug(ctx, 'Enters Schedule scene');
  const { backKeyboard } = getBackKeyboard(ctx);
  saveToSession(ctx, 'cleanUpMessages', []);
  const parishes: IParishResult[] = await getUserParishes(ctx);
  if (parishes.length > 1) {
    await ctx.reply(ctx.i18n.t('scenes.parishes.need_select_parish'), backKeyboard);
   const {message_id} =  await ctx.reply(ctx.i18n.t('scenes.parishes.parish_list'), getParishesMenus(parishes));
    await ctx.session.cleanUpMessages.push(message_id);
  } else if (parishes.length === 1) {
    await ctx.reply(ctx.i18n.t('scenes.parishes.single_parish'), backKeyboard);
   saveToSession(ctx, 'parish', parishes[0]);
    await parishSelectAction(ctx);
  } else {
    await ctx.reply('no parishes');
  }

});

schedule.hears(match('keyboards.back_keyboard.back'), async (ctx: SessionContext) => {
  const { mainKeyboard } = getMainKeyboard(ctx);
  cleanUpMessages(ctx);
  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

schedule.leave(async (ctx: SessionContext) => {
  const { mainKeyboard } = getMainKeyboard(ctx);
  cleanUpMessages(ctx);

  // await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

schedule.command('saveme', leave());

schedule.action(/parishSelect/, exposeParish, parishSelectAction);
schedule.action(/refreshSchedule/, refreshScheduleAction);



// schedule.action(/confirmAccount/, async (ctx: Context) => {
//   await ctx.answerCbQuery();
//   ctx.scene.leave();
// });

export default schedule;
