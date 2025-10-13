export class LocalDateMapper {
  private weekdays = ['Нд', 'Пн', 'Аў', 'Ср', 'Чц', 'Пт', 'Сб'];
  private months = [
    'Студзеня', 'Лютага', 'Сакавіка', 'Красавіка', 'Мая', 'Чэрвеня',
    'Ліпеня', 'Жніўня', 'Верасня', 'Кастрычніка', 'Лістапада', 'Снежня'
  ];

  public format(date: Date): string {
    const day = date.getDate();
    const month = this.months[date.getMonth()];
    const year = date.getFullYear();
    const weekday = this.weekdays[date.getDay()];

    return `${weekday}, ${day} ${month} ${year}`;
  }

  public formatShort(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  }
}
