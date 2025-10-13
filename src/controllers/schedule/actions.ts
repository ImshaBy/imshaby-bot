import { sheduleByParishId, makeMassesActual } from '../../providers/search-providers';
import { getParishScheduleControlMenu } from './helpers';
import { LocalDateMapper } from '../../util/LocalDateMapper';

export const refreshScheduleAction = async (ctx: any) => {

  const response = await makeMassesActual(ctx.session.parish.id);
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
};


export const parishSelectAction = async (ctx: any) => {
  const parishName = ctx.i18n.t('scenes.parishes.chosen_parish', {
    title: ctx.session.parish.title
  });

  let replyMsg = `\n ${parishName}`;

  const massDays = await sheduleByParishId(ctx.session.parish.id);

  for (const massDay of massDays) {
    const parts = massDay.date.split('/');
    const massDate: Date = new Date(Number.parseInt(parts[2]), Number.parseInt(parts[0]) - 1, Number.parseInt(parts[1]));

    const mapper = new LocalDateMapper();
    let scheduleForDay = mapper.format(massDate) + ': ';

    massDay.massHours.forEach(function(hour) {
      scheduleForDay += ` ${hour}`;
    });
    replyMsg += `\n ${scheduleForDay}`;
  }
  await ctx.reply(replyMsg);

  const authCode = 'codeMock';
  const { message_id } = await ctx.reply(ctx.i18n.t('scenes.parishes.cta_update'), getParishScheduleControlMenu(ctx, authCode));
  await ctx.session.cleanUpMessages.push(message_id);
};