import { match } from 'telegraf-i18n';
import { SessionContext } from 'telegram-context';
import { Scenes } from 'telegraf';
import { sendMessage } from './helpers';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';
import logger from '../../util/logger';
// import { any } from 'src/middlewares/session-redis/telegraf-context';

const contact = new Scenes.BaseScene<SessionContext>('contact');

contact.enter(async (ctx: any) => {
  logger.debug(ctx, 'Enters contact scene');

  const { backKeyboard } = getBackKeyboard(ctx);

  await ctx.reply(ctx.i18n.t('scenes.contact.write_to_the_creator'), backKeyboard);
});

contact.leave(async (ctx: SessionContext) => {
  logger.debug(ctx, 'Leaves contact scene');
  ctx.scene.leave();
  const { mainKeyboard } = getMainKeyboard(ctx);
  //
  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

contact.command('saveme', async (ctx) => await ctx.scene.leave());
contact.hears(match('keyboards.back_keyboard.back'), async (ctx) => await ctx.scene.leave(ctx));

contact.on('message', async (ctx: any) => {
  if (ctx.message.text == '/menu') {
    await ctx.scene.leave(ctx);
  } else {
    await sendMessage(ctx);
    const { backKeyboard } = getBackKeyboard(ctx);
    await ctx.reply(ctx.i18n.t('scenes.contact.message_delivered'), backKeyboard);
  }
});

export default contact;
