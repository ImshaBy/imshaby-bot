import * as dotenv from 'dotenv'
dotenv.config()

import logger from './logger';
import { sleep } from './common';
import User from '../models/User';
import { botTelegram } from '../bot';
import { parishesLookupByKey } from '../util/search-providers';



import { getAllNeedToUpdateParishKeys } from './search-providers/api';
import { IParishResult } from './parish-lookup';
import { ExtraEditMessage } from 'telegraf/typings/telegram-types';


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
            const options: ExtraEditMessage = { parse_mode: 'HTML' };

            if (process.env.IS_TOPIC_MESSAGE) {
                options.reply_to_message_id = msgThreadId;
            }

            await botTelegram.telegram.sendMessage(chatId, msg, options);
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
            await botTelegram.telegram.sendMessage(user._id, message);
        } catch (e) {
            logger.error(undefined, "Can't notify user about  reason: %O", e);
        } finally {
            // TODO: check if user blocked the bot and delete him from the DB
        }
    }
}
