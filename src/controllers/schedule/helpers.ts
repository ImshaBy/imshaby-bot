
import { IMassDay, IParishResult } from '../../util/parish-lookup';
import { Context, Extra, Markup } from 'telegraf';
import { IParish } from '../../models/Parish';

import logger from '../../util/logger';
import { saveToSession } from '../../util/session';

import { sheduleByParishId, parishesLookupByKey } from '../../util/search-providers';


/**
 * Displays  list of user parishes
 * @param parishes - list of parishes
 */

export async function getUserParishes(ctx: Context): Promise<IParishResult[]> {
  if (ctx.session.parishes) return ctx.session.parishes as IParishResult[];

  const parishes: IParishResult[] = [];
  try {
    logger.debug(ctx, 'Retrieving parishes for user %s', ctx.session.user);
    logger.debug(ctx, 'Retrieving parishes for user id: %s', ctx.session.user._id);
    logger.debug(ctx, 'Retrievied parishes : %s', ctx.session.user.observableParishKeys);

    for ( const parishKey of ctx.session.user.observableParishKeys) {
      logger.debug(ctx, parishKey);
      const tempParishes = await parishesLookupByKey(parishKey);
      tempParishes.forEach(item => parishes.push(item));
    }
    if (parishes && parishes.length > 0) {
      saveToSession(ctx, 'parishes', parishes);
    }

    return parishes;
  } catch (e) {
    logger.error(ctx, 'Parish lookup failed with the error: %O', e);
  }
}
/**
 * Returns parish menu keyboard
 */

export function getParishesMenus(parishes: IParishResult[]) {
    return Extra.HTML().markup((m: Markup) =>
      m.inlineKeyboard(
        parishes.map(parish => [
            m.callbackButton(
              `${parish.title}`,
              JSON.stringify({ a: 'parishSelect', p: parish.id }),
              false
            )
          ]),
        {}
      )
    );
  }

export async function getParishScheduleMessage(ctx: Context): Promise<String> {
  const massDays: IMassDay[] = await sheduleByParishId(ctx.session.parish.id);
  const msg = '';
  for ( const massDay of massDays) {
    msg.concat(`\n${massDay.date}:`);
  }
  return msg;
}


/**
 * Menu to control current movie
 * @param ctx - telegram context
 */
export function getParishScheduleControlMenu(ctx: Context) {
  return Extra.HTML().markup((m: Markup) =>
    m.inlineKeyboard(
      [
        m.callbackButton(
          ctx.i18n.t('scenes.parishes.refresh_button'),
          JSON.stringify({ a: 'refreshSchedule', p: ctx.session.parish._id }),
          false
        ),
        m.urlButton(
          ctx.i18n.t('scenes.parishes.change_button'),
          `${process.env.ADMIN_URL}`,
          false
        )
      ],
      {}
    )
  );
}
