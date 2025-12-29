import { match } from 'telegraf-i18n';
import { getParishesMenu } from './helpers';
import { getUserParishes } from '../schedule/helpers';
import { parishAction, backAction } from './actions';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';
import logger from '../../util/logger';
import { IParish } from '../../models/Parish';
import { exposeParish } from '../../middlewares/expose-parish';
import { IParishResult } from '../../providers/search-providers/parish-lookup';
import { cleanUpMessages, saveToSession } from '../../util/session';
import { SessionContext } from 'telegram-context';
import {Scenes, Markup} from 'telegraf';


const parish = new Scenes.BaseScene<SessionContext>('parish');

parish.enter(async (ctx: SessionContext) => {
    logger.debug(ctx, 'Enters parish scene');
    saveToSession(ctx, 'cleanUpMessages', []);
    const { backKeyboard } = getBackKeyboard(ctx);
    const userParishes: IParishResult[] = await getUserParishes(ctx);

    if (userParishes && userParishes.length > 1) {
        const message = await ctx.reply(ctx.i18n.t('scenes.parishes.list_of_parishes'), getParishesMenu(userParishes));
        logger.debug(ctx, `Message ID for parish ${JSON.stringify(message)}`);
        // dirty hack as telegram doesn't respond with proper message from last ctx.reply
        ctx.session.cleanUpMessages.push(ctx.message?.message_id + 1);
        const message2 = await ctx.reply(ctx.i18n.t('scenes.parishes.ask_for_details'), backKeyboard);
    } else if (userParishes && userParishes.length == 1) {

        const selectedParish = (ctx.session.parishes as IParish[]).find((item: IParish) => item.id === userParishes[0].id);
        saveToSession(ctx, 'parish', selectedParish);
        parishAction(ctx, true);
    } else {
        // No parishes assigned
        logger.warn(ctx, 'User %s has no parishes to view', ctx.from.id);
        await ctx.reply(
            ctx.i18n.t('scenes.parishes.no_parishes'),
            Markup.inlineKeyboard([
                Markup.button.callback(ctx.i18n.t('scenes.parishes.contact_admin_button'), 'contact_admin_parish')
            ])
        );
    }
});

parish.leave(async (ctx: any) => {
    logger.debug(ctx, 'Leaves parish scene');
    cleanUpMessages(ctx);
    await ctx.scene.leave();
});

parish.command('saveme', async (ctx) => await ctx.scene.leave());
parish.hears(match('keyboards.back_keyboard.back'), async (ctx: SessionContext) => {
    const { mainKeyboard } = getMainKeyboard(ctx);
    cleanUpMessages(ctx);
    await ctx.scene.leave()
    await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

// Register specific actions BEFORE regex patterns to avoid conflicts
parish.action('contact_admin_parish', async (ctx: any) => {
    logger.debug(ctx, 'Contact admin action triggered from parish scene');
    await ctx.answerCbQuery();
    await ctx.scene.enter('contact');
});

parish.action(/parish/, exposeParish, async (ctx: SessionContext) => await parishAction(ctx, false));
parish.action(/back/, backAction);

export default parish;
