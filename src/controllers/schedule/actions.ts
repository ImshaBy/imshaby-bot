import { sheduleByParishId, makeMassesActual, getPasswordlessCode } from '../../providers/search-providers';

import { getParishScheduleControlMenu} from './helpers';
import { getValidAccessTokenFromContext } from '../../util/token-manager';
import logger from '../../util/logger';

const arrayOfWeekdays = ['Нд', 'Пн', 'Аў', 'Ср', 'Чц', 'Пт', 'Сб'];
const arrayOfMonths = ['Студзеня', 'Лютага', 'Сакавіка', 'Красавіка', 'Мая', 'Чэрвеня', 'Ліпеня', 'Жніўня', 'Верасня', 'Кастрычніка', 'Лістапада', 'Снежня'];


export const refreshScheduleAction = async (ctx: any) => {

  // Get valid access token from context
  const accessToken = await getValidAccessTokenFromContext(ctx);
  if (!accessToken) {
    logger.error(ctx, 'Failed to get valid access token for user: %s', ctx.session.user._id);
    await ctx.editMessageText('Error: Authentication failed');
    await ctx.answerCbQuery();
    return;
  }

  const response = await makeMassesActual(ctx.session.parish.id, accessToken);
  if (response) {
    const updateMassesCount = Object.values(response.entities).length;
    const successMsg = ctx.i18n.t('scenes.parishes.masses_actual', {
      massCount: updateMassesCount
    });

    await ctx.editMessageText(`${successMsg}`);
  } else {
    await ctx.editMessageText(`Error`);
  }

  await ctx.answerCbQuery();

    // await ctx.reply(`${successMsg}`);

};


export const parishSelectAction = async (ctx: any) => {
    const parishName = ctx.i18n.t('scenes.parishes.chosen_parish', {
        title: ctx.session.parish.title
    });

    let replyMsg = `\n ${parishName}`;
    // await ctx.reply(`\n ${parishName}`);

    // Get valid access token from context
    const accessToken = await getValidAccessTokenFromContext(ctx);
    if (!accessToken) {
        logger.error(ctx, 'Failed to get valid access token for user: %s', ctx.session.user._id);
        await ctx.reply('Error: Authentication failed');
        return;
    }

    const massDays = await sheduleByParishId(ctx.session.parish.id, accessToken);

    for ( const massDay of massDays) {
        const parts = massDay.date.split('/');
        const massDate: Date = new Date(Number.parseInt(parts[2]), Number.parseInt (parts[0]) - 1, Number.parseInt(parts[1]));

        let sheduleForDay = `${arrayOfWeekdays[massDate.getDay()]}, ${massDate.getDate()} ${arrayOfMonths[massDate.getMonth()]}` + ': ';
        massDay.massHours.forEach(function(hour) {
            sheduleForDay += ` ${hour}`;
        });
        replyMsg  += `\n ${sheduleForDay}`;

    // await ctx.reply(sheduleForDay);
    }
    await ctx.reply(replyMsg);

    // await ctx.editMessageText(replyMsg);

    // Fetch passwordless code for admin panel access
    const authCode = await getPasswordlessCode(ctx.session.user.email);
    if (!authCode) {
        logger.error(ctx, 'Failed to get passwordless code for user: %s', ctx.session.user._id);
        await ctx.reply('Error: Failed to generate admin panel link');
        return;
    }

    const {message_id} = await ctx.reply(ctx.i18n.t('scenes.parishes.cta_update'), getParishScheduleControlMenu(ctx, authCode));
    await ctx.session.cleanUpMessages.push(message_id);

    // await ctx.answerCbQuery();
};