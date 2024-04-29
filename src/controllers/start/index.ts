import {Scenes} from 'telegraf';

import logger from '../../util/logger';
import User, { IUser } from '../../models/User';
import { getMainKeyboard } from '../../util/keyboards';
import { saveToSession, deleteFromSession, cleanUpMessages} from '../../util/session';
import { parishesLookupByKey } from '../../providers/search-providers';
import { Markup } from 'telegraf';
import { match } from 'telegraf-i18n';
import { SessionContext } from 'telegram-context';
import { Message, Update } from 'telegraf/typings/core/types/typegram';
import { CONFIG } from '../../config';

// type SessionSceneContext = Scenes.SceneContext<SessionContext>;

const start = new Scenes.BaseScene<SessionContext>('start');

// const { leave } = start.leave();


start.enter(async (ctx: any) => {
    logger.debug(ctx, ' enter event');
    const uid = String(ctx.from.id);
    const user = await User.findById(uid);
    const commandTokens = ctx.message.text.split(/(\s+)/).filter((e: string | any[]) => e.length > 1);
    let parishKey;
    if (commandTokens && commandTokens.length > 1) {
        parishKey = commandTokens[1];
    }
    await saveOrUpdateUser(user, parishKey, ctx);
});

start.on('message', async (ctx: SessionContext) => {
    
    logger.debug(ctx, 'on text event');
    logger.warn(ctx, `${JSON.stringify(ctx.session)}`)
    ctx.session.counter = ctx.session.counter || 0
    ctx.session.counter++

    // TODO if user uploads image - it will break typization; dirty solution for the moment
    const parishKey = (ctx.message as Message.TextMessage).text
    if(parishKey == '/menu'){
        await ctx.reply(ctx.i18n.t('scenes.start.no_menu_click'), {reply_markup: { remove_keyboard: true}});
    }else {
        const user: IUser = await User.findById(String(ctx.from.id));
        await saveOrUpdateUser(user, parishKey, ctx);
    }
});


start.leave(async (ctx: any) => {
    const { mainKeyboard } = getMainKeyboard(ctx);
    saveToSession(ctx, "__scenes", {});
    // ctx.session.__scenes = {};
    cleanUpMessages(ctx);

    await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

start.hears(match('keyboards.back_keyboard.back'), start.leave());


start.command('saveme', start.leave());

export default start;

async function saveOrUpdateUser(user: IUser, parishKey: string, ctx: any) {
    let parishKeyExists: boolean;
    if(parishKey) {
        const parishesByKey = await parishesLookupByKey(parishKey);
         parishKeyExists = parishesByKey.length > 0 ? true : false;
    }

    if ( !parishKeyExists && parishKey) {
        logger.error(ctx, 'No such parish key registered: ' + parishKey);
    // await ctx.reply('No such parish key registered: ' + parishKey);
    }
    if (user) {
        if (parishKeyExists) {
            user = await User.findOneAndUpdate(
                {
                    _id: user._id
                },
                {
                    $addToSet: { observableParishKeys: parishKey },
                },
                {
                    new: true
                }
            );
            logger.info(ctx, 'New parish key: ' + parishKey + ' has been added to existing user: ' + user._id);
            await ctx.reply(ctx.i18n.t('scenes.start.new_parish_added'));
            deleteFromSession(ctx, 'parishes');
            saveToSession(ctx, 'language', CONFIG.bot.lang);
            ctx.i18n.locale(CONFIG.bot.lang);
            saveToSession(ctx, 'user', user );
            await ctx.reply(ctx.i18n.t('scenes.start.welcome_back'),  Markup.removeKeyboard());
            ctx.scene.leave();
        }else if (!parishKey) {
            ctx.i18n.locale(CONFIG.bot.lang);
            await ctx.reply(ctx.i18n.t('scenes.start.no_parish_key'), Markup.removeKeyboard());
        } else {
            ctx.i18n.locale(CONFIG.bot.lang);
            await ctx.reply(ctx.i18n.t('scenes.start.no_valid_key'), Markup.removeKeyboard());
        }
        // await ctx.answerCbQuery();
        // ctx.scene.leave();
    } else if (parishKeyExists) {
        const now = new Date().getTime();
        const newUser = new User({
            _id: String(ctx.from.id),
            created: now,
            username: ctx.from.username,
            name: ctx.from.first_name + ' ' + ctx.from.last_name,
            observableParishKeys: [parishKey],
            lastActivity: now,
            language: CONFIG.bot.lang
        });
        newUser.save();
        logger.debug(ctx, 'New user has been created with parish key: ' + parishKey);
        // await ctx.reply('New parish admin has been register with parish key : ' + parishKey);
        // await sleep(2);
        saveToSession(ctx, 'user', newUser );
        saveToSession(ctx, 'language', CONFIG.bot.lang);
        ctx.i18n.locale(CONFIG.bot.lang);

        await ctx.reply(ctx.i18n.t('scenes.start.bot_description'), Markup.removeKeyboard());
        // await ctx.answerCbQuery();
        ctx.scene.leave();
    // await ctx.answerCbQuery();
    } else {
        ctx.i18n.locale(CONFIG.bot.lang);
        await ctx.reply(ctx.i18n.t('scenes.start.no_parish_key'), Markup.removeKeyboard());
    }
}



