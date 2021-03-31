require('dotenv').config();
import logger from './logger';
import { sleep } from './common';
import User from '../models/User';
import telegram from '../telegram';
import {  Extra, Markup, Context } from 'telegraf';

const markup = Extra.HTML;


import { getAllNeedToUpdateParishKeys } from './search-providers/api';


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

export async function notifyGroupChatAboutParishChange(chatId: string, msg: string) {
  try {
    if (chatId && msg) {
      await telegram.sendMessage(chatId, msg, {parse_mode: 'HTML'});
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

  for (const user of usersToNotify) {
    logger.debug(undefined, 'Notifying user %s about mass update for parish key %s', user.username, parishKey);
    // TODO: move text to translations
    const message =
      user.language === 'en'
        ? `🎉 Parish ${parishKey} has to be updated!`
        : `🎉 Парафия ${parishKey} нуждается в обновлении!`;

    await sleep(0.5);
    try {
      await telegram.sendMessage(user._id, message);
    } catch (e) {
      logger.error(undefined, "Can't notify user about  reason: %O", e);
    } finally {
      // TODO: check if user blocked the bot and delete him from the DB
    }
  }
}
