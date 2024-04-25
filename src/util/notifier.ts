import logger from './logger';
import { sleep } from './common';
import User from '../models/User';
import {telegram} from '../bot';
import { parishesLookupByKey } from '../providers/search-providers';
import { getAllNeedToUpdateParishKeys } from '../providers/search-providers/api';
import { IParishResult } from '../providers/search-providers/parish-lookup';
import { CONFIG } from '../config';
import { FmtString } from 'telegraf/typings/format';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';


export async function checkNeeedToUpdateParishes() {
    logger.debug(undefined, 'Starting to check need to updated parishes');
    // run every friday, get masses for week & check needToUpdate (all not-..). If there is any unupdated mass ->
    // fetch parish IDs -> get parish details & collect parish keys -> get users by parish keys
    const neededParishKeys = await getAllNeedToUpdateParishKeys();
    for (const parishKeyInfo of neededParishKeys) {
        await sleep(0.5);
        logger.debug(undefined, 'User is gonna to be notified for  , %O', parishKeyInfo);
        await notifyAndUpdateUsersByParishKey(parishKeyInfo);
    }
}

export async function notifyGroupChatAboutParishChange(chatId: string, msg: string, msgThreadId: number) {
    try {
        if (chatId && msg) {
            const options: any = { parse_mode: 'HTML' };

            if (CONFIG.bot.isTopicChannel) {
                options.message_thread_id = msgThreadId;
            }

            await sendMessageWithErrorHandling(chatId, msg, options);
        }
    } catch (e) {
        logger.error(undefined, "Can't notify user about  reason: %O", e);
    } finally {
    // TODO: check if user blocked the bot and delete him from the DB
    }
}

async function notifyAndUpdateUsersByParishKey(parishKey: string) {
    const usersToNotify = await User.find({
        observableParishKeys : parishKey
    });

    const parish: IParishResult[] = await parishesLookupByKey(parishKey);
    let parishName = parishKey;
    if (parish && parish.length > 0) {
        parishName = parish[0].title;
    }
    for (const user of usersToNotify) {
        logger.debug(undefined, 'Notifying user %s about mass update for parish key %s', user.username, parishKey);
        // TODO: move text to translations


    const message =
      user.language === 'en'
          ? `🎉 ${parishName} has to be updated!`
          : `🎉 ${parishName} мае патрэбу ў аднаўленні раскладу!`;

        await sleep(0.5);
        try {
            async (ctx: any) => await ctx.scene.enter('parish')
            await sendMessageWithErrorHandling( user._id, message);
        } catch (e) {
            logger.error(undefined, "Can't notify user about  reason: %O", e);
        } finally {
            // TODO: check if user blocked the bot and delete him from the DB
        }
    }
}

 export async function sendMessageWithErrorHandling (chatId: number | string,
        text: string | FmtString,
        extra?: ExtraReplyMessage) {
        try {
            return await telegram.sendMessage(chatId, text, extra);
        } catch(error){
            logger.error(null, 'telegram send message error, %O', error);
        }
}
