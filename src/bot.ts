
import path from 'path';
import { session, SessionStore, Telegraf } from "telegraf";

import TelegrafI18n, { match } from 'telegraf-i18n';
import { Scenes } from "telegraf";
import logger from './util/logger';
import about from './controllers/about';
import startScene from './controllers/start';
import scheduleScene from './controllers/schedule';
import menu from './controllers/menu';
import axios from 'axios';
import {Express} from 'express';
import parishScene from './controllers/parish';
import contactScene from './controllers/contact';
import adminScene from './controllers/admin';
import asyncWrapper from './util/error-handler';
import { getMainKeyboard } from './util/keyboards';
import { updateUserTimestamp } from './middlewares/update-user-timestamp';
import { getUserInfo } from './middlewares/user-info';
import { isAdmin } from './middlewares/is-admin';
import { isSupportedChatType } from './middlewares/is-group-message';
import { requireValidToken } from './middlewares/require-valid-token';
// import {session} from './redis';
import {CONFIG} from './config';
import { cleanUpMessages } from './util/session';
import { Request, Response } from 'express';
import { SessionContext, SessionData } from 'telegram-context';
import { Redis } from "@telegraf/session/redis";

export function createBot(token: string): Telegraf<SessionContext> {

    const bot = new Telegraf<SessionContext>(token);
    const redisUrl = CONFIG.redis.password 
        ? `redis://:${CONFIG.redis.password}@${CONFIG.redis.host}:${CONFIG.redis.port}`
        : `redis://${CONFIG.redis.host}:${CONFIG.redis.port}`;
    const store: SessionStore<SessionData> = Redis({ url: redisUrl });
    const stage = new Scenes.Stage([
        startScene,
        scheduleScene,
        parishScene,
        contactScene,
        adminScene
    ]);
    
    const i18n = new TelegrafI18n({
        defaultLanguage: CONFIG.bot.lang || 'ru',
        directory: path.resolve(__dirname, 'locales'),
        useSession: true,
        allowMissing: false,
        sessionName: 'session'
    });
    
    bot.use(session({store}));
    bot.use(i18n.middleware());
    bot.use(stage.middleware());
    bot.use(getUserInfo);
    

    
    
    bot.start(asyncWrapper(async (ctx: any) => {
        await ctx.scene.enter('start')}));
    
    bot.hears(
        match('keyboards.main_keyboard.start'),
        asyncWrapper(async (ctx: any) => {
            await ctx.scene.enter('start')})
    );

        
    bot.hears(
        match('keyboards.main_keyboard.schedule'),
        isSupportedChatType,
        requireValidToken,
        updateUserTimestamp,
        asyncWrapper(async (ctx: any) => await ctx.scene.enter('schedule'))
    );

    bot.command('update',  isSupportedChatType, requireValidToken, updateUserTimestamp, asyncWrapper(async (ctx: any) => await ctx.scene.enter('schedule')));



    bot.hears(
        match('keyboards.main_keyboard.parish'),
        isSupportedChatType,
        requireValidToken,
        updateUserTimestamp,
        asyncWrapper(async (ctx: any) => await ctx.scene.enter('parish'))
    );
    bot.command('parish',  isSupportedChatType, requireValidToken, updateUserTimestamp, asyncWrapper(async (ctx: any) => await ctx.scene.enter('parish')));

    bot.hears(
        match('keyboards.main_keyboard.contact'),
        isSupportedChatType,
        requireValidToken,
        updateUserTimestamp,
        asyncWrapper(async (ctx: any) => await ctx.scene.enter('contact'))
    );
    bot.command('contact',  isSupportedChatType, requireValidToken, updateUserTimestamp, asyncWrapper(async (ctx: any) => await ctx.scene.enter('contact')));

    bot.hears(match('keyboards.main_keyboard.about'), updateUserTimestamp, asyncWrapper(about));
    bot.command('info', updateUserTimestamp, asyncWrapper(about) );

    bot.command('menu', updateUserTimestamp,requireValidToken, asyncWrapper(menu) );

    bot.hears(
        /(.*admin)/,
        isSupportedChatType,
        requireValidToken,
        isAdmin,
        asyncWrapper(async (ctx: any) => await ctx.scene.enter('admin'))
    );


    bot.hears(/(.*?)/, isSupportedChatType, async (ctx: any) => {
        logger.debug(ctx, 'Default handler has fired');

        // Check if user has pending auth state - redirect to start scene
        if (ctx.session?.authState === 'waiting_for_email') {
            logger.info(ctx, 'User has pending auth state, re-entering start scene to capture email');
            return await ctx.scene.enter('start');
        }

        logger.info(ctx, `Incorrect message ${ctx.message.text}`);

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

    return bot;
}

export function launchBot(env: string, bot: Telegraf<SessionContext>, app: Express){

    // WEB HOOK how to set- up?
    app.post(`${CONFIG.webhook.path}`, (req: Request, res: Response) => {
        return bot.handleUpdate(req.body, res)
    });

    // Webhook no need to configure here, because it's established by API after build & deploy
    const botConfig: Telegraf.LaunchOptions = {
        dropPendingUpdates: CONFIG.bot.dropPending,
        allowedUpdates: ['message', 'callback_query', 'chat_join_request']
    }
    if ( CONFIG.server.env == 'production') {
        //set webhook
        botConfig.webhook = {
            hookPath: CONFIG.webhook.path,
            domain: CONFIG.webhook.url,
            maxConnections: 100
        }
    }
    
    logger.info(bot.context, `Bot ID: ${CONFIG.bot.token}. Webhook for telegram: ${botConfig.webhook?.domain}${botConfig.webhook?.hookPath}, supported types : ${botConfig.allowedUpdates}`);
    // launch only development mode (polling updates)
    bot.launch(botConfig);
  }


// bot.on('new_chat_members', newChatMemberHandler);

// const testMessageWithButtons = async (ctx: any) => {
//     bot.telegram.sendMessage('188184218', 'Test message for notification with buttons',
//         Extra.HTML().markup((m: Markup) =>
//             m.inlineKeyboard(
//                 [
//                     // m.callbackButton(
//                     //     ctx.i18n.t('scenes.parishes.refresh_button'),
//                     //     JSON.stringify({ a: 'refreshSchedule', p: ctx.session.parish._id }),
//                     //     false
//                     // )
//                     // ,
//                     m.urlButton(
//                     'Admin Panel Url',
//                     `${process.env.ADMIN_URL}`,
//                     false
//                     )
//                 ],
//                 {}
//             )
//         )
//     );
// };

export const bot = createBot(CONFIG.bot.token), telegram = bot.telegram;