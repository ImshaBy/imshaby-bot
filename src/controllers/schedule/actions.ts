import { Context, Extra, Markup } from 'telegraf';
import { Sticker } from 'telegraf/typings/telegram-types';
import schedule from '.';
import { sheduleByParishId, makeMassesActual } from '../../util/search-providers';
import { getParishScheduleControlMenu, getParishScheduleMessage } from './helpers';

const arrayOfWeekdays = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const arrayOfMonths = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];


export const refreshScheduleAction = async (ctx: Context) => {

  const response = await makeMassesActual(ctx.session.parish.id);
  const updateMassesCount = Object.values(response.entities).length;

  const successMsg = ctx.i18n.t('scenes.parishes.masses_actual', {
    massCount: updateMassesCount
  });

  await ctx.reply(`${successMsg}`);
  // ctx.scene.leave();
};

export const parishSelectAction = async (ctx: Context) => {
  const parishName = ctx.i18n.t('scenes.parishes.chosen_parish', {
    title: ctx.session.parish.title
  });

  await ctx.reply(`\n ${parishName}`);

  const massDays = await sheduleByParishId(ctx.session.parish.id);

  for ( const massDay of massDays) {
    const parts = massDay.date.split('/');
    const massDate: Date = new Date(Number.parseInt(parts[2]), Number.parseInt (parts[0]) - 1, Number.parseInt(parts[1]));

    let sheduleForDay = `${arrayOfWeekdays[massDate.getDay()]}, ${massDate.getDate()} ${arrayOfMonths[massDate.getMonth()]}` + ': ';
    massDay.massHours.forEach(function(hour) {
      sheduleForDay += ` ${hour}`;
    });
    await ctx.reply(sheduleForDay);
  }

  await ctx.reply(`\n Расписание актуально? `, getParishScheduleControlMenu(ctx));

  // await ctx.answerCbQuery();
};