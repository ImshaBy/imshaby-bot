import { sheduleByParishId, makeMassesActual} from '../../providers/search-providers';

import { getParishScheduleControlMenu} from './helpers';

const arrayOfWeekdays = ['Нд', 'Пн', 'Аў', 'Ср', 'Чц', 'Пт', 'Сб'];
const arrayOfMonths = ['Студзеня', 'Лютага', 'Сакавіка', 'Красавіка', 'Мая', 'Чэрвеня', 'Ліпеня', 'Жніўня', 'Верасня', 'Кастрычніка', 'Лістапада', 'Снежня'];


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

    // await ctx.reply(`${successMsg}`);

};


export const parishSelectAction = async (ctx: any) => {
    const parishName = ctx.i18n.t('scenes.parishes.chosen_parish', {
        title: ctx.session.parish.title
    });

    let replyMsg = `\n ${parishName}`;
    // await ctx.reply(`\n ${parishName}`);

    const massDays = await sheduleByParishId(ctx.session.parish.id);

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

    // const authCode = await await getPasswordlessCode(ctx.session.user.name);

    const authCode = 'codeMock';
    const {message_id} = await ctx.reply(ctx.i18n.t('scenes.parishes.cta_update'), getParishScheduleControlMenu(ctx, authCode));
    await ctx.session.cleanUpMessages.push(message_id);

    // await ctx.answerCbQuery();
};