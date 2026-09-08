/* ---------------------------------------------------------------
   Русский.

   **The key is the English string** — see `lib/i18n.ts` for why. A key with a
   colon in it carries context (`"period:Day"` against `"view:Day"`), and `t`
   falls back to everything after the colon, so an untranslated one still
   reads as the English sentence it came from rather than as a bare token.

   `{name}` is a placeholder `t` fills in. **Whole sentences, never fragments**:
   the moment a sentence is concatenated out of pieces it stops being
   translatable, because the pieces go in a different order in a different
   language.

   Ordered by where it appears, roughly top of the page downwards, so adding a
   string means finding its neighbours rather than the end of the file.
--------------------------------------------------------------- */

export const RU: Record<string, string> = {
  /* ---- periods, dates, the bar across the top ---------------------- */
  Day: "День",
  Week: "Неделя",
  Month: "Месяц",
  "3 Months": "3 месяца",
  Year: "Год",
  "All time": "Всё время",
  Custom: "Свой период",

  Mon: "Пн",
  Tue: "Вт",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",

  "Previous {period}": "Предыдущий период",
  "Next {period}": "Следующий период",
  "Jump to the current period": "К текущему периоду",
  "Jump to this week": "К этой неделе",
  From: "С",
  To: "По",

  /* ---- the panel toggles ------------------------------------------- */
  "Hide the filter": "Скрыть фильтр",
  "Filter what counts": "Фильтр: что считается",
  "{n} left out of every total": "{n} исключено из всех итогов",
  "Hide the notices": "Скрыть уведомления",
  "Show the notices": "Показать уведомления",
  "{n} gone — no freeze reaches them": "{n} упущено — заморозка не достанет",
  "{n} lost unless a freeze is spent": "{n} потеряно, если не потратить заморозку",
  "{n} running out of room": "{n} на исходе запаса",
  "{n} still owed, with time": "{n} ещё должно, время есть",
  "{n} all clear": "{n} в порядке",
  "Hide the composite": "Скрыть общий счёт",
  "Days kept in a row": "Дней подряд выполнено",
  "Hide the account": "Скрыть счёт",
  "{n} points, and where they came from": "{n} очков и откуда они",
  "Hide the rewards": "Скрыть награды",
  "{a} of {b} taken": "{a} из {b} взято",
  "What your points will buy": "Что можно купить за очки",
  "Hide what you have reached": "Скрыть достижения",
  "{a} of {b} reached": "{a} из {b} достигнуто",
  "What you have reached": "Чего вы достигли",
  "Hide the change log": "Скрыть журнал изменений",
  "Show the change log": "Показать журнал изменений",
  "Hide the open section": "Свернуть открытый раздел",
  "Hide all {n} open sections": "Свернуть все открытые разделы ({n})",

  /* ---- the page's own headings ------------------------------------- */
  Counters: "Счётчики",
  Days: "Дни",
  Summary: "Сводка",
  Trends: "Динамика",
  "Counters total": "Итого по счётчикам",

  /* ---- Setup → App ------------------------------------------------- */
  Theme: "Тема",
  Light: "Светлая",
  Dark: "Тёмная",
  System: "Как в системе",
  Language: "Язык",
  "Following this device's own light/dark setting, and changing with it.":
    "Следует настройке этого устройства и меняется вместе с ней.",
  "Always {theme}, whatever this device is set to.":
    "Всегда {theme}, что бы ни стояло на устройстве.",
  "Saved on this device, not to your account — every browser and phone you sign in from picks its own.":
    "Хранится на этом устройстве, а не в аккаунте: каждый браузер и телефон выбирает своё.",
  "The interface, the generated sentences and the dates. Your own names — activities, counters, rules — are your data and are left exactly as you wrote them.":
    "Интерфейс, сгенерированные фразы и даты. Ваши собственные названия — занятия, счётчики, правила — это ваши данные, и они остаются ровно такими, как вы их написали.",

  /* ---- the notice board -------------------------------------------- */
  Notices: "Уведомления",
  "board:Today": "Сегодня",
  "Show all": "Показать все",
  "Hide all": "Скрыть все",
  "level:gone": "упущено",
  "level:danger": "под угрозой",
  "level:warning": "на исходе",
  "level:notice": "к сведению",
  "level:all clear": "всё в порядке",
  "Lost, and nothing covers it — no freeze can reach it. Nothing to do.":
    "Потеряно, и покрыть нечем — ни одна заморозка не достанет. Делать нечего.",
  "Lost unless a freeze is spent on it. A freeze can still reach it.":
    "Потеряно, если не потратить заморозку. Заморозка ещё достанет.",
  "Still reachable, and the margin is gone.":
    "Ещё достижимо, но запаса больше нет.",
  "Still owed, and there is room.": "Ещё должно, и время есть.",
  "Nothing owed and nothing spent — for now.":
    "Ничего не должно и ничего не потрачено — пока что.",
  "Every level is struck out. Show one to read it.":
    "Все уровни скрыты. Покажите хотя бы один.",
  "Nothing to say about today.": "О сегодняшнем дне сказать нечего.",

  /* ---- the composite ----------------------------------------------- */
  "What the streak is made of — which rules broke which days":
    "Из чего сложен счёт — какие правила сломали какие дни",
  "Sealed as it stands, the run goes from {was} to {now}.":
    "Если запечатать как есть, счёт уйдёт с {was} на {now}.",
  "Still short: {rules}": "Ещё не выполнено: {rules}",
  "Today and yesterday can still be written to.":
    "Сегодня и вчера ещё можно дописать.",
  "unit:days": "дней",

  /* ---- what a notice actually says ---------------------------------
     Whole templates. `{where}` and `{when}` arrive already translated and
     already carrying their leading space, so nothing here concatenates. */
  "frag: in {slot}": " в {slot}",
  "frag: this week": " за неделю",
  "a removed slot": "удалённый слот",

  "{named} {value}{at} against at most {max}":
    "{named} — {value}{at} при допустимых не более {max}",
  "{named} {value}{at} — clean": "{named} — {value}{at}, чисто",
  "{named} {value} of {max}{where} used{when} — one more ends it":
    "{named} — израсходовано {value} из {max}{where}{when}: ещё одно, и всё",
  "{named} {left} of {max}{where} left{when}":
    "{named} — осталось {left} из {max}{where}{when}",
  "{named} {value} of {max}{at} — clean":
    "{named} — {value} из {max}{at}, чисто",

  "{named} {value} of {min}{where} — done":
    "{named} — {value} из {min}{where}: сделано",
  "{named} {value} of {min}{where} — short by {need}":
    "{named} — {value} из {min}{where}: не хватило {need}",
  "{named} {value} of {min}{where} — no longer reachable today":
    "{named} — {value} из {min}{where}: сегодня уже не успеть",
  "{need} more of {named}{where}, and {left} of the day left":
    "Ещё {need} — {named}{where}, а от дня осталось {left}",
  "{need} more of {named}{where}": "Ещё {need} — {named}{where}",

  "{named} {value} of {min}{where} this week — done":
    "{named} — {value} из {min}{where} за неделю: сделано",
  "{named} {value} of {min}{where} this week — out of reach":
    "{named} — {value} из {min}{where} за неделю: уже не достать",
  "{need} more of {named}{where} this week, and {days} left":
    "Ещё {need} — {named}{where} за неделю, и осталось {days}",

  /* ---- checks ------------------------------------------------------- */
  "{label} is {answer}": "{label} — {answer}",
  "{label} to answer": "{label} — надо ответить",
  "not answered": "нет ответа",
  "answer:yes": "да",
  "answer:no": "нет",
  "answer:skipped": "пропущено",
  "{label} refused on {bad} of {all} days":
    "{label} — неверный ответ в {bad} из {all} дней",
  "{label} unanswered on {n} days so far":
    "{label} — без ответа пока что {n} дней",
  "{label} kept every day so far": "{label} — держится каждый день",

  /* ---- what is at stake, and what it costs --------------------------- */
  "{n} at stake": "На кону {n}",
  "Out of the writing window — nothing left to do":
    "Окно для записи закрыто — сделать уже нечего",
  "{sites} to freeze · {cost} in all · {available} available":
    "{sites} к заморозке · всего {cost} · доступно {available}",
  "{cost} needed and you have {available}":
    "Нужно {cost}, а у вас {available}",
  "{n} kept in a row": "{n} подряд",

  /* ---- the four fixed sources ---------------------------------------- */
  "{kept} of {judged} rules held — the day is lost":
    "Выполнено {kept} из {judged} правил — день потерян",
  "{kept} of {judged} rules holding so far":
    "Пока держится {kept} из {judged} правил",
  "This week's allowance": "Запас на эту неделю",
  "{rule} — {left} of {total} left, lost on Sunday":
    "{rule} — осталось {left} из {total}, сгорит в воскресенье",
  "Granted every Monday and lost unused":
    "Выдаётся каждый понедельник и сгорает неиспользованным",
  "Still in play": "Ещё в игре",
  "{rule} — clean so far, pays out {date}":
    "{rule} — пока чисто, выплата {date}",
  "{rule} — carried by a freeze, pays out {date}":
    "{rule} — держится на заморозке, выплата {date}",
  "Within reach": "Близко",
  "{name} — {togo} to go, at {value} of {threshold}":
    "{name} — осталось {togo}, сейчас {value} из {threshold}",

  /* ---- the log's own heading and its menu ---------------------------- */
  "excluded:day": "Этот день исключён из всей статистики",
  "excluded:week": "Эта неделя исключена из всей статистики",
  "excluded:month": "Этот месяц исключён из всей статистики",
  "Weekly goal met": "Недельная цель выполнена",
  "Weekly goal missed": "Недельная цель не выполнена",
  "Monthly goal met": "Месячная цель выполнена",
  "Monthly goal missed": "Месячная цель не выполнена",
  "{hours} logged": "учтено {hours}",
  "goal {hours}": "цель {hours}",
  "settings:day": "настройки дня",
  "settings:week": "настройки недели",
  "settings:month": "настройки месяца",
  "Ignore in statistics": "Не учитывать в статистике",
  "Every figure on this page skips it": "Все цифры на этой странице его пропустят",
  "Show entry comments": "Показывать комментарии к записям",
  "Each entry can still be folded on its own":
    "Каждую запись всё равно можно свернуть отдельно",
  "Day notes": "Заметки дня",
  "Week notes": "Заметки недели",
  "Month notes": "Заметки месяца",

  /* ---- the counters block -------------------------------------------- */
  "Which counters this period shows": "Какие счётчики показывает период",
  "{shown} of {all}": "{shown} из {all}",
  "By kind": "По виду",
  "By category": "По категории",
  "Show {group} — {n} in this period":
    "Показать «{group}» — {n} в этом периоде",
  "Hide {group} — {n} in this period":
    "Скрыть «{group}» — {n} в этом периоде",

  /* ---- a day card ---------------------------------------------------- */
  "Open this day in a larger view": "Открыть день крупнее",
  "Open this day in a larger view. It is sealed: the log can be written for today and yesterday, so this day can be read but not changed.":
    "Открыть день крупнее. Он запечатан: журнал пишется только за сегодня и вчера, так что этот день можно прочитать, но не изменить.",
  "Show the day's note": "Показать заметку дня",
  "Hide the day's note": "Скрыть заметку дня",
  "Streak freeze used — the goal was missed, but the streak held":
    "Потрачена заморозка — цель не выполнена, но серия устояла",
  "Ignored in statistics": "Не учитывается в статистике",
  "Use a streak freeze on this day": "Потратить заморозку на этот день",
  "Add to this day": "Добавить в этот день",
  Close: "Закрыть",
  "No study logged": "Ничего не записано",
  " — tap to add": " — нажмите, чтобы добавить",
  " — sealed": " — запечатан",

  /* ---- adding something to a day ------------------------------------- */
  "kind:Activity": "Занятие",
  "kind:Tally": "Счёт",
  "kind:Check": "Отметка",
  "Add to a tally": "Добавить к счёту",
  "Answer a check": "Ответить на отметку",
  "New entry": "Новая запись",
  Slot: "Слот",
  "field:Activity": "Занятие",
  "End now": "Закончить сейчас",
  running: "идёт",
  "no time set": "время не указано",
  Note: "Заметка",
  Optional: "необязательно",
  Cancel: "Отмена",
  Save: "Сохранить",
  Add: "Добавить",
  "End this session now": "Закончить эту сессию сейчас",
  "Start this session now": "Начать эту сессию сейчас",
  "Pause this session": "Поставить сессию на паузу",
  "Resume this session": "Продолжить сессию",
  "on pause": "на паузе",
  "min paused": "мин паузы",
  "{time} of this was a pause": "из них {time} — пауза",
  "On pause now — {time} so far": "Сейчас на паузе — пока {time}",
  "Show comment": "Показать комментарий",
  "Hide comment": "Скрыть комментарий",

  /* ---- the strip, and buying a freeze --------------------------------- */
  "already frozen — {cost} spent": "уже заморожено — потрачено {cost}",
  "Week of {date}": "Неделя с {date}",
  "The week is not over — this covers it as it stands, not whatever it becomes.":
    "Неделя ещё не закончилась — покрыто то, что уже случилось, а не то, чем она станет.",
  "freeze this — {cost} of {available} available":
    "заморозить — {cost} из {available} доступных",
  "needs {cost} and you have {available}":
    "нужно {cost}, а у вас {available}",
  "Use {cost} on {date}?": "Потратить {cost} на {date}?",
  "Bought against this one thing, at this price, for good. Logging the day up afterwards does not hand it back.":
    "Покупается против одного этого нарушения, по этой цене, навсегда. Если потом дописать день, заморозка не вернётся.",
  "{n} still unfrozen — this alone does not save the day.":
    "Ещё {n} не заморожено — одна эта покупка день не спасёт.",
  "Use {cost}": "Потратить {cost}",

  /* ---- the pace card -------------------------------------------------- */
  "pace:lost": "потеряно",
  "pace:done": "сделано",
  "{days} left": "осталось {days}",
  "at most": "не более",
  "at least": "не менее",
  "{day} — not judged by this condition":
    "{day} — это условие день не судит",
  "The bar is what you have spent of the week's allowance.":
    "Столбик — сколько из недельного запаса уже потрачено.",
  "The bar is what is still owed. It should reach nothing by Sunday.":
    "Столбик — сколько ещё должно. К воскресенью он должен дойти до нуля.",

  /* ---- the count filter ------------------------------------------------ */
  "Counted in every figure": "Учитывается во всех цифрах",
  "Struck-through means left out — of the log, the stats and the charts":
    "Зачёркнутое исключено — из журнала, статистики и графиков",
  'Count "{name}" again': "Снова считать «{name}»",
  'Leave "{name}" out of every total': "Исключить «{name}» из всех итогов",
  Slots: "Слоты",
  Activities: "Занятия",
  Categories: "Категории",
  Tags: "Метки",
  'Show everything filed under "{name}" again':
    "Снова показать всё в категории «{name}»",
  'Hide everything filed under "{name}"': "Скрыть всё в категории «{name}»",
  'Show counters tagged "{name}" again':
    "Снова показать счётчики с меткой «{name}»",
  'Hide every counter tagged "{name}"':
    "Скрыть все счётчики с меткой «{name}»",

  /* ---- the shop -------------------------------------------------------- */
  Rewards: "Награды",
  "{points} to spend": "{points} к трате",
  "The balance has not started counting yet": "Счёт ещё не начал считаться",
  "On the account": "На счету",
  "unit:point": "очко",
  "unit:points": "очков",
  "Where it came from": "Откуда они",
  "Take it": "Забрать",
  "Needs": "Требует",
  "The finish is the next morning — for a session that runs past midnight":
    "Окончание — уже следующим утром, для сессии через полночь",
  "Needs first": "Сначала нужно",
  "Needs first: {names}": "Сначала нужно: {names}",
  "No change to what it asks.": "Условия не изменились.",
  "Taken {n} times · last {date}": "Забирали {n} раз · последний — {date}",
  "{n} to go": "не хватает {n}",
  "You have {n}": "у вас {n}",
  "Nothing written yet. Setup has the tab — put the thing you have been circling for months in it, at a price that would make having it feel earned.":
    "Пока ничего не записано. Вкладка есть в настройках — впишите туда то, вокруг чего вы ходите месяцами, по цене, при которой это будет ощущаться заслуженным.",

  /* ---- achievements ---------------------------------------------------- */
  Achievements: "Достижения",
  "{done} of {total} earned": "{done} из {total} получено",
  "Nothing written yet — Setup has the tab":
    "Пока ничего не записано — вкладка есть в настройках",
  "how this works": "как это работает",
  "Hide the achievements": "Скрыть достижения",
  "a deleted achievement": "удалённое достижение",

  /* ---- the change log --------------------------------------------------- */
  "Change log": "Журнал изменений",
  "The last {n} edits · oldest fall off the end":
    "Последние {n} правок · самые старые вытесняются",

  /* ---- the account panel ------------------------------------------------ */
  "The account": "Счёт",
  "How points work": "Как работают очки",
  "{n} pts earned": "заработано {n}",
  "{n} pts spent": "потрачено {n}",
  "{n} days counted": "дней учтено: {n}",
  "Today and yesterday can still be written, so they are not counted yet.":
    "Сегодня и вчера ещё можно записать, поэтому они пока не учтены.",
  "{days} not counted yet": "{days} ещё не учтено",
  "Earned this period": "Заработано за период",
  "{v} — {kept} kept, {missed} missed":
    "{v} — выполнено {kept}, пропущено {missed}",
  Points: "Очки",
  "Everything else that moved it": "Всё остальное, что его двигало",
  "To the shop": "В магазин",
  "A finished day pays 10 points; a missed one takes 20. Neither figure is a setting — what matters is the ratio, and at two to one the account grows only above a two-thirds keep rate.\n\nToday and yesterday can still be written, so they are not counted yet. A day's mark is written once when it leaves that window and never revisited: this is the one figure here you can spend, so editing a Tuesday must not move a balance something was already bought against.":
    "Выполненный день даёт 10 очков, пропущенный отнимает 20. Ни одна из цифр не настройка — важно соотношение: два к одному значит, что счёт растёт только при удержании выше двух третей.\n\nСегодня и вчера ещё можно записать, поэтому они пока не учтены. Отметка дня пишется один раз, когда он выходит из этого окна, и больше не пересматривается: это единственная цифра здесь, которую можно тратить, так что правка вторника не должна двигать баланс, против которого уже что-то куплено.",

  /* ---- the index and the header ----------------------------------------- */
  "Sections on this page": "Разделы на этой странице",
  "Hide the section list": "Скрыть список разделов",
  "Jump to a section": "Перейти к разделу",
  ongoing: "продолжается",

  /* ---- the composite panel ---------------------------------------------- */
  Kept: "Выполнено",
  "A day is kept when every rule that votes held on it. Freezes count — a day paid for is a day kept.":
    "День считается выполненным, когда устояли все голосующие правила. Заморозки засчитываются: оплаченный день — выполненный день.",
  "{days} running, best {bestDays}": "{days} подряд, рекорд {bestDays}",
  "{weeks} running, best {bestWeeks}": "{weeks} подряд, рекорд {bestWeeks}",
  "{kept} of {all} kept in this period":
    "{kept} из {all} выполнено за период",
  "What it is made of": "Из чего это сложено",

  /* ---- the summary tabs -------------------------------------------------- */
  "Hours logged": "Часов учтено",
  "Hours logged per weekday": "Часов по дням недели",
  "Hours logged per weekday, compared week over week":
    "Часов по дням недели, неделя к неделе",
  "Total hours logged per week": "Всего часов за неделю",
  "Total hours logged, aggregated per week":
    "Всего часов, с накоплением по неделям",
  "Total hours logged per month": "Всего часов за месяц",
  "Total hours logged, aggregated per month":
    "Всего часов, с накоплением по месяцам",
  "Days since start": "Дней с начала",
  "Empty days": "Пустых дней",
  "Avg hours / day": "В среднем часов в день",
  "Best day": "Лучший день",
  "Best week": "Лучшая неделя",
  "Best month": "Лучший месяц",
  "Worst day": "Худший день",
  "Worst week": "Худшая неделя",
  "Worst month": "Худший месяц",
  Overview: "Обзор",
  Averages: "Средние",
  Remarkable: "Крайности",
  "Totals for the selected period": "Итоги за выбранный период",
  "Pace over the selected period": "Темп за выбранный период",
  "Best & worst, within the selected period, in hours":
    "Лучшее и худшее внутри выбранного периода, в часах",
  "The selected period as single figures: how much time it holds and where that time went, the average pace, and its best and worst days, weeks and months. Days marked ignored count towards none of it.":
    "Выбранный период одними цифрами: сколько в нём времени и куда оно ушло, средний темп, лучшие и худшие дни, недели и месяцы. Дни, помеченные как игнорируемые, не входят никуда.",

  /* ---- the trend charts --------------------------------------------------- */
  Daily: "По дням",
  Weekday: "По дням недели",
  Weekly: "По неделям",
  Monthly: "По месяцам",
  /* ---- the rotated clock, any activity, `spec 024` -------------------- */
  "The clock": "Часы",
  "Usual start": "Обычное начало",
  "Usual finish": "Обычный конец",
  "Average length": "Средняя длительность",
  "One row each": "По одной строке на сессию",
  "Same clock as below — every logged session on its own line":
    "Те же часы, что ниже — каждая записанная сессия отдельной строкой",
  "Length, session by session": "Длительность, сессия за сессией",
  "One point per logged session": "Одна точка на записанную сессию",
  "When it happens": "Когда это происходит",
  "Share of logged days busy with it at each hour":
    "Доля записанных дней, занятых этим в каждый час",
  "{n}% of days": "{n}% дней",
  "Nothing with both a start and an end time in this period yet.":
    "За этот период нет записей с началом и концом.",
  "This project has no activities to read a clock on yet.":
    "В проекте пока нет занятий, по которым можно построить часы.",
  "Time logged per day": "Учтённое время по дням",
  "Weekday totals": "Итоги по дням недели",
  "Weekly totals": "Итоги по неделям",
  "Monthly totals": "Итоги по месяцам",
  "mode:Hours": "Часы",
  "mode:Activities": "Занятия",
  "mode:Slots": "Слоты",
  "mode:Tags": "Метки",
  "mode:Counters": "Счётчики",
  "By counter": "По счётчику",
  "Whole day": "Весь день",
  "By slot": "По слотам",
  "Counts per counter": "Счёт по каждому счётчику",
  "Counts summed per tag": "Счёт, просуммированный по метке",
  "Counts per tagged counter": "Счёт по каждому помеченному счётчику",
  "{what}, per {per}": "{what}, за {per}",
  "per:day": "день",
  "per:weekday": "день недели",
  "per:week": "неделю",
  "per:month": "месяц",
  ", split by slot": ", с разбивкой по слотам",

  /* ---- the month grid and the donuts ------------------------------------ */
  "Every day of this week hit its goal": "Каждый день этой недели взял свою цель",
  "A day was missed, but a streak freeze covered it":
    "День пропущен, но его закрыла заморозка",
  "A day was missed with no freeze on it":
    "День пропущен, и заморозки на нём нет",
  "Streak freeze used": "Потрачена заморозка",
  "Time by slot": "Время по слотам",
  "Time by activity": "Время по занятиям",
  "No study logged in this period.": "За этот период ничего не записано.",

  /* ---- signing in -------------------------------------------------------- */
  "Sign in to your logbook": "Вход в ваш журнал",
  "Create your logbook": "Создание журнала",
  Email: "Почта",
  Password: "Пароль",
  "Please wait…": "Подождите…",
  "Sign in": "Войти",
  "Create account": "Создать аккаунт",
  "Need an account? Sign up": "Нет аккаунта? Зарегистрируйтесь",
  "Already have an account? Sign in": "Уже есть аккаунт? Войдите",
  "Sending…": "Отправляем…",
  "Didn't get the email? Resend it": "Письмо не пришло? Отправить ещё раз",
  "Forgot your password? Reset it": "Забыли пароль? Сбросить",
  "Enter your email above, then tap resend.":
    "Введите почту выше и нажмите «отправить ещё раз».",
  "Confirmation email sent — check your inbox.":
    "Письмо с подтверждением отправлено — проверьте почту.",
  "Couldn't resend the email.": "Не удалось отправить письмо ещё раз.",
  "Enter your email above, then tap reset.":
    "Введите почту выше и нажмите «сбросить».",
  "If that email has an account, a reset link is on its way.":
    "Если на эту почту есть аккаунт, ссылка для сброса уже в пути.",
  "Couldn't send the reset email.": "Не удалось отправить письмо для сброса.",
  "Account created — check your inbox to confirm your email, then sign in.":
    "Аккаунт создан — подтвердите почту по письму и войдите.",
  "Your email isn't confirmed yet — use the resend button below.":
    "Почта ещё не подтверждена — нажмите «отправить ещё раз» ниже.",
  "Something went wrong.": "Что-то пошло не так.",

  /* ---- Setup's tab row --------------------------------------------------- */
  "tab:Project": "Проект",
  "tab:Slots": "Слоты",
  "tab:Counters": "Счётчики",
  "tab:Categories": "Категории",
  "tab:Tags": "Метки",
  "tab:Streaks": "Правила",
  "tab:Achievements": "Достижения",
  "tab:Rewards": "Награды",
  "tab:App": "Приложение",

  /* ---- the editable list ------------------------------------------------
     **A whole phrase per noun.** `New {noun}` cannot be written in Russian:
     the adjective agrees with the gender of what follows. Nine nouns, nine
     keys, three times over. */
  "new:slot": "Новый слот",
  "new:activity": "Новое занятие",
  "new:category": "Новая категория",
  "new:tag": "Новая метка",
  "new:streak": "Новое правило",
  "new:achievement": "Новое достижение",
  "new:reward": "Новая награда",
  "new:check": "Новая отметка",
  "new:tally": "Новый счёт",

  "add:slot": "Добавить слот",
  "add:activity": "Добавить занятие",
  "add:category": "Добавить категорию",
  "add:tag": "Добавить метку",
  "add:streak": "Добавить правило",
  "add:achievement": "Добавить достижение",
  "add:reward": "Добавить награду",
  "add:check": "Добавить отметку",
  "add:tally": "Добавить счёт",

  "describe:slot": "Что считается этим слотом? (необязательно)",
  "describe:activity": "Что считается этим занятием? (необязательно)",
  "describe:category": "Что относится к этой категории? (необязательно)",
  "describe:tag": "Что помечается этой меткой? (необязательно)",
  "describe:streak": "Зачем это правило? (необязательно)",
  "describe:achievement": "Что считается этим достижением? (необязательно)",
  "describe:reward": "Что это за награда? (необязательно)",
  "describe:check": "Что считается этой отметкой? (необязательно)",
  "describe:tally": "Что считается этим счётом? (необязательно)",

  "Why it is going": "Почему оно удаляется",
  "Send for approval": "Отправить на согласование",
  Remove: "Удалить",
  "Icon and colour": "Значок и цвет",
  "Move up": "Выше",
  "Move down": "Ниже",

  /* ---- Setup: categories, tags, rewards ---------------------------------- */
  'Groupings for your counters — "study", "health", "things to do less of", or whatever the useful shelf turns out to be. One per counter, so the Counters tab can lay them all out under headings with each thing appearing exactly once. A counter can still wear any number of tags.':
    "Полки для ваших счётчиков — «учёба», «здоровье», «делать поменьше» или что окажется полезным. По одной на счётчик, чтобы вкладка «Счётчики» могла разложить всё под заголовками, и каждое встретилось ровно один раз. Меток при этом счётчик может носить сколько угодно.",
  'Remove "{name}"? Everything filed under it keeps its counts and simply stops being grouped.':
    "Удалить «{name}»? Всё, что под ней лежало, сохранит свои цифры и просто перестанет быть сгруппированным.",
  'Labels for your counters. Put the same tag on several counters and the filter can hide or show them together — "good", "health", "work", or whatever the useful grouping turns out to be.':
    "Ярлыки для счётчиков. Поставьте одну метку на несколько счётчиков — и фильтр будет прятать и показывать их вместе: «хорошее», «здоровье», «работа» или что окажется полезным.",
  'Remove "{name}"? Counters carrying it keep their counts and simply stop being tagged.':
    "Удалить «{name}»? Счётчики с ней сохранят свои цифры и просто перестанут быть помеченными.",
  "Things you have decided to let yourself have, priced in points — a finished day pays 10, a missed one takes 20. Taking one here is permitting yourself to buy it in life: the app keeps the ledger, you keep the promise. Price them so that having the thing would feel earned rather than allowed.":
    "То, что вы решили себе позволить, в очках: выполненный день даёт 10, пропущенный отнимает 20. Забрать награду здесь — значит разрешить себе купить её в жизни: приложение ведёт учёт, обещание держите вы. Ставьте такую цену, при которой вещь ощущалась бы заслуженной, а не разрешённой.",
  'Remove "{name}"? Anything already taken stays in the record — that purchase happened. Only the offer goes.':
    "Удалить «{name}»? Всё уже забранное останется в записи — покупка была. Уходит только предложение.",
  Edit: "Изменить",
  "Being set up — open until tomorrow": "Настраивается — открыто до завтра",
  "Raising only until {date}": "Только повышение до {date}",
  "Open to any change": "Открыто для любых правок",
  "Why it is getting cheaper": "Почему оно дешевеет",
  "Today is yours to get this right on.":
    "Сегодняшний день ваш, чтобы всё поправить.",
  "This only asks for more.": "Это только требует большего.",

  /* ---- the time dial and the date fields --------------------------------- */
  "Set time": "Указать время",
  "Pick the start hour": "Выберите час начала",
  "Now the start minutes": "Теперь минуты начала",
  "Now the end hour": "Теперь час конца",
  "Now the end minutes": "Теперь минуты конца",
  "clear:start": "Очистить начало",
  "clear:end": "Очистить конец",
  "setnow:start": "Поставить началом текущее время",
  "setnow:end": "Поставить концом текущее время",
  "btn:now": "сейчас",
  Setting: "Задаём",
  "the start": "начало,",
  "the end": "конец,",
  minutes: "минуты",
  hour: "час",
  Done: "Готово",
  "field:start": "начало",
  "field:end": "конец",
  "shape:All": "Все",
  Outlined: "Контур",
  Filled: "Заливка",
  "Nothing matches “{query}”": "Ничего не найдено по «{query}»",
  "Nothing matching “{query}” is drawn that way":
    "По «{query}» нет иконок в таком виде",
  "Nothing here is drawn that way": "Здесь нет иконок в таком виде",
  "Search icons": "Поиск значков",
  "Pick a date": "Выберите дату",
  Start: "Начало",
  End: "Конец",

  /* ---- solo ------------------------------------------------------------- */
  "Showing “{name}” only": "Показано только «{name}»",
  "Show every rule again": "Снова показать все правила",

  /* ---- a rule, read back ------------------------------------------------
     The whole sentence is assembled from these, and the assembly order is the
     same in both languages, which is what makes it work without rewriting the
     builder: «Pinterest» в «Вечер» не более «3» раз, из них не более «0» в
     «Утро» по Пн, Вт. */
  "Logged time": "Учтённое время",
  "a removed activity": "удалённое занятие",
  "a removed category": "удалённая категория",
  "a removed tag": "удалённая метка",
  "a removed counter": "удалённый счётчик",
  "{name} (category)": "{name} (категория)",
  "{name} (tag)": "{name} (метка)",
  "all of {n} things": "все из {n}",
  "any of {n} things": "любое из {n}",
  "join:and": "и",
  "join:or": "или",
  "{list} {join} {last}": "{list} {join} {last}",

  "frag: in {slots}": " в {slots}",
  "frag: on {days}": " по {days}",
  "frag: a week": " за неделю",
  "frag:, of which {list}": ", из них {list}",
  " and ": " и ",
  " or ": " или ",
  nothing: "ничего",

  "at most {a}": "не более {a}",
  "at least {a}": "не менее {a}",
  "between {a} and {b}": "от {a} до {b}",
  "{n} {times}": "{n} {times}",
  "{said} in {slot}": "{said} в {slot}",
  "{said} on {days}": "{said} по {days}",
  "{said}{where}{rider} on {days}": "{said}{where}{rider} по {days}",

  "{named} must be {said}{when}": "{named} должно быть {said}{when}",
  "{named} must each be {said}{when}":
    "{named} — каждое должно быть {said}{when}",
  "{named} must be {parts}": "{named} должно быть {parts}",
  "{named}: {parts} a week": "{named}: {parts} за неделю",
  "{named} — nothing asked": "{named} — ничего не требуется",
  "{named}{where} — nothing asked, so this condition judges nothing":
    "{named}{where} — ничего не требуется, поэтому это условие ничего не судит",
  "at most {n} {answer}": "не более {n} — {answer}",
  "at least {n} {answer}": "не менее {n} — {answer}",
  "{range} {answer}": "{range} — {answer}",

  /* ---- durations --------------------------------------------------------
     Single letters in both languages, so nothing about any layout moves. */
  "unit:h": "ч",
  "unit:m": "м",

  /* ---- what a condition did, and what broke ------------------------------ */
  "is {answer}": "— {answer}",
  "{named} {value} of {max}": "{named} — {value} из {max}",
  "{named} {value} of {bound}": "{named} — {value} из {bound}",
  "{named} {value} against at most {bound}":
    "{named} — {value} при допустимых не более {bound}",
  "{named} {value} against at least {bound}":
    "{named} — {value} при требуемых не менее {bound}",
  "{named} {value}{where} against at most {bound}":
    "{named} — {value}{where} при допустимых не более {bound}",
  "{named} {value}{where} against at least {bound}":
    "{named} — {value}{where} при требуемых не менее {bound}",
  "{named} {value}{where} of {bound}": "{named} — {value}{where} из {bound}",
  "{label} not accepted on {days}": "{label} — не принято в {days}",

  /* ---- the same, over a week --------------------------------------------- */
  "frag: in {slot} this week": " в {slot} за неделю",
  "{named} {value} of {bound} this week":
    "{named} — {value} из {bound} за неделю",
  "{named} {value} this week": "{named} — {value} за неделю",
  "{named} {word} {value} against at most {bound}":
    "{named}, {word} — {value} при допустимых не более {bound}",
  "{named} {word} {value} against at least {bound}":
    "{named}, {word} — {value} при требуемых не менее {bound}",
  "{named} {word} {value} of {bound}": "{named}, {word} — {value} из {bound}",
  "{label} unanswered or refused on {bad} of {all} days":
    "{label} — без ответа или неверно в {bad} из {all} дней",
  "{label} kept on all {all} days": "{label} — выдержано все {all} дней",

  /* ---- Setup: the rule form ---------------------------------------------- */
  "date:Today": "Сегодня",
  Tomorrow: "Завтра",
  Monday: "Понедельник",
  none: "нет",
  "Why this condition is here": "Зачем это условие",
  "Per week": "За неделю",
  "Answers a week": "Ответов за неделю",
  "Accepted answers": "Принимаемые ответы",
  "Shared time slots": "Общие слоты",
  "Same slot rules for each countable day":
    "Одинаковые правила слотов для каждого учитываемого дня",
  "Individual time slots": "Слоты по дням",
  "Can set individual slot rules for chosen countable days":
    "Можно задать свои правила слотов для выбранных дней",
  "Across the days": "По дням",
  "Counts in": "Считается в",
  "All slots": "Все слоты",
  "Everything logged that day counts towards the figure, wherever it fell":
    "В цифру идёт всё записанное за день, куда бы оно ни попало",
  "Chosen slots": "Выбранные слоты",
  "Only what falls in the slots you pick counts towards the figure":
    "В цифру идёт только то, что попало в выбранные слоты",
  /* ---- when the day had to begin and end, `spec 023` ------------------ */
  Clock: "Часы",
  "Any time": "В любое время",
  "Within hours": "В заданные часы",
  "Nothing is asked about when the work happened":
    "О времени начала и конца ничего не спрашивается",
  "The day's first start and last finish have to fall inside the hours you set":
    "Первое начало и последнее окончание за день должны попасть в заданные часы",
  Hours: "Часы дня",
  "One pair of hours, on every day this condition judges":
    "Одни и те же часы на каждый судимый день",
  "Set the hours separately for each chosen day":
    "Задать часы отдельно для каждого выбранного дня",
  Begin: "Начать",
  Finish: "Закончить",
  /* the readback */
  "frag:, starting between {a} and {b}": ", начиная между {a} и {b}",
  "frag:, starting no earlier than {a}": ", начиная не раньше {a}",
  "frag:, starting by {a}": ", начиная не позже {a}",
  "frag:, finishing between {a} and {b}": ", заканчивая между {a} и {b}",
  "frag:, finishing no earlier than {a}": ", заканчивая не раньше {a}",
  "frag:, finishing by {a}": ", заканчивая не позже {a}",
  "frag:+1d": " след. дня",
  /* what a broken window says on the board and in the freeze popover */
  "{named} began at {at}, no earlier than {bound}":
    "{named}: начало в {at}, а надо не раньше {bound}",
  "{named} began at {at}, no later than {bound}":
    "{named}: начало в {at}, а надо не позже {bound}",
  "{named} finished at {at}, no earlier than {bound}":
    "{named}: конец в {at}, а надо не раньше {bound}",
  "{named} finished at {at}, no later than {bound}":
    "{named}: конец в {at}, а надо не позже {bound}",
  /* what the form refuses */
  begin: "начинать",
  finish: "заканчивать",
  "{named} must {what} no earlier than {a} and no later than {b}{when}":
    "{named} должно {what} не раньше {a} и не позже {b}{when}",
  "{named} must begin no earlier than {a} and finish by {b}{when}":
    "{named} должно начаться не раньше {a} и закончиться к {b}{when}",
  "Count by slot": "Считать по слотам",
  "No slot figures": "Без цифр по слотам",
  "The day's own figure is the whole requirement, wherever the time falls inside it":
    "Цифра дня — всё требование целиком, куда бы время внутри него ни попало",
  "A figure per slot": "Своя цифра у слота",
  "A named slot carries its own floor or ceiling as well as the day's":
    "У названного слота свой минимум или максимум вдобавок к дневному",
  "Judged on": "Судится по",
  "Count by day": "Считать по дням",
  "No day figure": "Без цифры дня",
  "The day as a whole is unbounded — only a named slot can ask for anything":
    "День целиком не ограничен — требовать может только названный слот",
  "A figure per day": "Цифра на день",
  "The day as a whole carries a floor, a ceiling, or both":
    "У дня целиком есть минимум, максимум или оба",
  "How much": "Сколько",
  "The same every day": "Одинаково каждый день",
  "One floor and one ceiling, on every day this condition judges":
    "Один минимум и один максимум на каждый судимый день",
  "One per weekday": "Своё на каждый день недели",
  "Set the floor and the ceiling separately for each chosen day":
    "Задать минимум и максимум отдельно для каждого выбранного дня",
  "Per day": "На день",
  "Every day": "Каждый день",
  "Every week": "Каждую неделю",
  "Every day and every week": "Каждый день и каждую неделю",
  "What a condition below takes unless it says otherwise":
    "То, что берёт условие ниже, если не сказано иное",
  "one figure for the whole week": "одна цифра на всю неделю",
  "each day judged on its own": "каждый день судится сам по себе",
  "Counts towards the day's verdict": "Голосует за вердикт дня",
  "Keeps its own streak only": "Ведёт только свою серию",
  Judged: "Судится",
  "In the day's verdict": "В вердикте дня",
  Counts: "Голосует",
  "On its own": "Само по себе",
  Freezes: "Заморозки",
  "{n} a week · bank {cap}": "{n} в неделю · банк {cap}",
  Because: "Потому что",
  "Why this is going down": "Почему это снижается",
  "How streaks work": "Как работают серии",
  "kept by the day, paid for by the week":
    "держится по дням, оплачивается по неделям",

  /* ---- Setup: the achievement form --------------------------------------- */
  "Ever, in all": "За всё время",
  "In a single month": "За один месяц",
  "In a single week": "За одну неделю",
  "In a single day": "За один день",
  "every day": "каждый день",
  Counting: "Считаем",
  "Days that went well": "Удачные дни",
  "Something you recorded": "То, что вы записывали",
  "Whose verdict": "Чей вердикт",
  "Every rule that votes": "Все голосующие правила",
  Counted: "Считается",
  "In a row": "Подряд",
  "In all": "Всего",
  "unit:Days": "Дни",
  "unit:Weeks": "Недели",
  "Counting only": "Считать только",
  Over: "За период",
  Worth: "Стоит",
  Reaching: "Достигнуть",
  "Why it is asking for less": "Почему требования снижаются",
  "Reached — its terms are settled. Delete is the only way back, and it takes the record and the points with it.":
    "Достигнуто — условия закрыты. Единственный путь назад — удалить, и вместе с ним уйдут запись и очки.",

  /* ---- a rule's own panel ------------------------------------------------ */
  "state:Lost": "Потеряно",
  "Broken — a freeze still reaches it":
    "Сломано — заморозка ещё достанет",
  "At risk": "Под угрозой",
  "Owed today": "Сегодня должно",
  Holding: "Держится",
  "state:kept": "выполнено",
  "state:frozen": "заморожено",
  "state:missed": "пропущено",
  "still open": "ещё открыт",
  "not judged": "не судится",
  "not yet judged": "ещё не судится",
  "This week began before the rule did — only its ceilings apply.":
    "Эта неделя началась раньше правила — действуют только его потолки.",
  "Over the limit by": "Превышение на",
  "At most": "Не более",
  "At least": "Не менее",
  "Current streak": "Текущая серия",
  "Best streak": "Рекорд серии",
  "Freezes banked": "Заморозок в банке",

  /* ---- Setup: counters ---------------------------------------------------- */
  "Add a tag": "Добавить метку",
  "kinds:Activities": "Занятия",
  "kinds:Tallies": "Счёты",
  "kinds:Checks": "Отметки",
  "This unit has a known total": "У этого счётчика известен общий итог",
  "Make a tally": "Сделать счётом",
  "Make a check": "Сделать отметкой",

  /* ---- what a new project starts with -----------------------------------
     These become the user's own data the moment a project exists, and nothing
     ever revisits them. The ids never change; only the seed label does. */
  "seed:Morning Transit": "Дорога утром",
  "seed:Morning": "Утро",
  "seed:Daytime": "День",
  "seed:Evening Transit": "Дорога вечером",
  "seed:Evening": "Вечер",
  "seed:Lesson notes": "Конспекты",
  "seed:Gather questions": "Сбор вопросов",
  "seed:Gather tasks": "Сбор задач",
  "seed:Q&A": "Вопросы и ответы",
  "seed:Solving tasks": "Решение задач",

  /* ---- odds and ends ----------------------------------------------------- */
  "Not filed": "Без категории",
  "A weekly rule has no figure for a single day.":
    "У недельного правила нет цифры на один день.",
  "Only a rule that counts time; this one counts occurrences.":
    "Только правило, считающее время; это считает случаи.",
  "Only floors — a ceiling is not something to aim at.":
    "Только минимумы — потолок не то, к чему стремятся.",

  /* ---- notes, entries, counts on a card ---------------------------------- */
  "Note for the day": "Заметка на день",
  "Delete this note": "Удалить эту заметку",
  "Delete this entry": "Удалить эту запись",
  "Cancel changes": "Отменить изменения",
  "Remove from this slot": "Убрать из этого слота",
  "Edit this count": "Изменить это число",
  "Go to day view": "Перейти к виду дня",

  /* ---- the rest ----------------------------------------------------------- */
  "Add a counter in a slot": "Добавить счётчик в слоте",
  "Other bound": "Другая граница",
  "Another link": "Ещё одна ссылка",
  "Create an invite link": "Создать ссылку-приглашение",
  "No category": "Без категории",
  "Choose a category": "Выберите категорию",
  "Every project, in one file": "Все проекты одним файлом",
  "Writing…": "Записываем…",
  Overwrite: "Перезаписать",

  /* ---- the last of it ----------------------------------------------------- */
  "seed:Lessons": "Уроки",
  "seed:Exams": "Экзамены",
  "Time measured through the rule {name}":
    "Время учтено по правилу {name}",
  "No benchmark rule chosen — everything logged is counted":
    "Эталонное правило не выбрано — учтено всё записанное",
  "Select all": "Выбрать все",
  "Clear all": "Снять все",

  /* ---- the strip, the pace bar and the open weeks ------------------------ */
  "wd:M": "Пн",
  "wd:T": "Вт",
  "wd:W": "Ср",
  "wd:Th": "Чт",
  "wd:F": "Пт",
  "wd:Sa": "Сб",
  "wd:Su": "Вс",
  "{amount} a week": "{amount} за неделю",
  "Week of {start} is still open — ": "Неделя с {start} ещё открыта — ",
  "on track for +1 freeze": "идёт к +1 заморозке",
  "no freeze as it stands": "заморозки пока не будет",
  ", sealing {date}": ", запечатается {date}",
  "Freezes go on today and yesterday, the same window the log is written in. A day costs one freeze for every unit it fell short by.":
    "Заморозки тратятся на сегодня и вчера — то же окно, в котором пишется журнал. День стоит по заморозке за каждую единицу недобора.",

  /* ---- the long explanations, a paragraph at a time --------------------
     One key for the whole tooltip would have to match byte for byte across
     a four-way string concatenation — the kind of key that silently stops
     matching the day somebody rewraps a line. A paragraph is a whole unit
     of meaning, so a paragraph is a key. */
  "The category this counter belongs to — one at most, unlike a tag.":
    "Категория, к которой относится счётчик — не больше одной, в отличие от метки.",
  "Categories are how the Counters tab can lay everything out under headings with each thing appearing exactly once. Define them in the Categories tab.":
    "Благодаря категориям вкладка «Счётчики» раскладывает всё под заголовками, и каждое встречается ровно один раз. Задаются они на вкладке «Категории».",
  "With a supervisor, a loosening still waits out its week — and then has to be agreed by somebody else before it takes effect. Narrowing a rule is untouched: you never need permission to ask more of yourself.":
    "С наблюдателем послабление всё так же ждёт свою неделю — а потом ещё должно быть согласовано другим человеком. Ужесточение правила это не затрагивает: чтобы требовать с себя больше, разрешение не нужно никогда.",
  "They see the request, the rule before and after, and your reason. Nothing else — not your log, not your counters, not your streaks.":
    "Он видит запрос, правило до и после и вашу причину. Больше ничего — ни журнала, ни счётчиков, ни серий.",
  "Send the link however you like. Whoever opens it first becomes the supervisor, and it works once.":
    "Отправьте ссылку как угодно. Наблюдателем станет тот, кто откроет её первым, и работает она один раз.",
  "An achievement is the one thing here you cannot lose. It is written once, with the date and the figure it stood at, and nothing you do afterwards un-earns it.":
    "Достижение — единственное здесь, что нельзя потерять. Оно записывается один раз, с датой и цифрой, на которой стояло, и ничто из сделанного потом его не отменяет.",
  "Lowering a threshold waits a week, like loosening a rule. Raising one lands at once.":
    "Снижение планки ждёт неделю, как послабление правила. Повышение вступает в силу сразу.",
  "Keep them few. Six that mean something beat thirty that were generated.":
    "Пусть их будет немного. Шесть значимых лучше тридцати сгенерированных.",
  "Buying something here is permitting yourself to buy it in life. The app is the ledger of a promise you made yourself about spending; nothing else enforces it.":
    "Купить что-то здесь — значит разрешить себе купить это в жизни. Приложение ведёт учёт обещания, которое вы дали себе о тратах; больше его ничто не обеспечивает.",
  "Prices are in points. A finished day pays 10 and a missed one takes 20 — nothing else mints them, and the rate is not a setting, so there is nothing here to game.":
    "Цены в очках. Выполненный день даёт 10, пропущенный отнимает 20 — больше их ничто не создаёт, а курс не настройка, так что обыгрывать тут нечего.",
  "Buying spends points and nothing else. Your streak is a run of days and is never touched by it.":
    "Покупка тратит очки и ничего больше. Ваша серия — это череда дней, и покупка её не касается.",
  "Raising a price lands at once. Lowering one waits a week, like loosening a rule. A purchase is never refunded.":
    "Повышение цены вступает в силу сразу. Снижение ждёт неделю, как послабление правила. Покупка не возвращается никогда.",
  "Raising a price lands at once — it can only ever ask more of you.":
    "Повышение цены вступает в силу сразу — оно способно только потребовать с вас больше.",
  "Lowering one waits a week, like loosening a rule. It is the edit this whole mechanism exists to slow down: a reward you can make cheaper on the evening you want it is not a reward, it is a purchase with extra steps.":
    "Снижение ждёт неделю, как послабление правила. Ради того, чтобы притормозить именно эту правку, весь механизм и существует: награда, которую можно удешевить тем же вечером, когда она понадобилась, — не награда, а покупка с лишними шагами.",
  "The day you write one is yours to get the price right on.":
    "День, когда вы её написали, ваш, чтобы подобрать цену.",
  "Raising a threshold lands at once — it can only ever cost you more. Lowering one waits a week, like loosening a rule, and so does swapping what is counted: a hundred hours of lessons and a hundred gym visits are not two points on one scale, so the change cannot be classified and waits.":
    "Повышение планки вступает в силу сразу — оно способно только стоить вам дороже. Снижение ждёт неделю, как послабление правила, и то же самое с подменой того, что считается: сто часов уроков и сто походов в зал — не две точки на одной шкале, так что такую правку нельзя классифицировать, и она ждёт.",
  "Asking for them in a row rather than in all is harder, so it lands. Narrowing the window is harder, so that lands too. Widening either waits.":
    "Требовать их подряд, а не в сумме — сложнее, поэтому это вступает в силу сразу. Сузить окно — тоже сложнее, и это тоже вступает сразу. Любое расширение ждёт.",
  "The day you write one is yours to get it right on.":
    "День, когда вы его написали, ваш, чтобы всё поправить.",
  "A change lands at once when it can be proved not to make the rule easier — a lower limit, more days judged, fewer freezes, or one more condition.":
    "Правка вступает в силу сразу, если доказуемо, что она не делает правило легче: ниже потолок, больше судимых дней, меньше заморозок или ещё одно условие.",
  "Anything else waits a week from the last such change, including anything that cannot be compared at all: inverting a test, swapping what is measured, dropping a condition, switching between judging a day and judging a week.":
    "Всё остальное ждёт неделю с последней такой правки — включая то, что вообще нельзя сравнить: разворот условия, подмену измеряемого, удаление условия, переключение между судом по дню и по неделе.",
  "The day you write a rule is yours to get it right on: nothing is locked until the next day, because the rule has judged nothing yet.":
    "День, когда вы написали правило, ваш, чтобы всё поправить: до следующего дня ничего не заперто, потому что правило ещё ничего не судило.",
  "The point of setting a limit in advance is to be the person who set it, not the person living under it.":
    "Смысл ставить предел заранее в том, чтобы быть тем, кто его поставил, а не тем, кто под ним живёт.",
  "A rule can keep several things at once, and all of them have to hold — no Pinterest on a weekday morning, and no YouTube in the evening or at night, any day.":
    "Одно правило может держать несколько обещаний сразу, и устоять должны все: никакого Pinterest утром в будни и никакого YouTube вечером или ночью, в любой день.",
  "One rule rather than two, because breaking either half breaks the same week. Two rules would be two streaks to keep and two allowances to spend, which is a weaker promise wearing the same name.":
    "Одно правило, а не два, потому что срыв любой половины ломает одну и ту же неделю. Два правила — это две серии, которые надо держать, и два запаса, которые можно тратить: более слабое обещание под тем же именем.",
  "How many there are in all, when that is known — 218 lessons in a course.\n\nOff for anything open-ended: pages read, cigarettes smoked, days at the gym. Not a goal — a negative unit has a total too, and reaching it is not the idea.":
    "Сколько их всего, если это известно — 218 уроков в курсе.\n\nВыключено для всего бесконечного: прочитанных страниц, выкуренных сигарет, дней в зале. Это не цель — у отрицательного счётчика тоже есть итог, и дойти до него никто не предлагает.",
  "Change which question this counter answers.":
    "Поменять, на какой вопрос отвечает этот счётчик.",
  "Nothing recorded is thrown away. A tally of one reads as a check that happened; a check that happened reads as a tally of one. A tally carrying larger numbers keeps them, and the check reads every one of those days as yes.":
    "Ничего записанного не выбрасывается. Счёт «один» читается как случившаяся отметка; случившаяся отметка читается как счёт «один». Счёт с большими числами их сохраняет, а отметка читает каждый такой день как «да».",
  "Tags for this counter. A unit can carry several — they are not competing answers to one question.":
    "Метки этого счётчика. Их может быть несколько — это не конкурирующие ответы на один вопрос.",
  "Their use today is the filter: hiding a tag hides every counter wearing it, everywhere on the page at once. Define them in the Tags tab.":
    "Сегодня они нужны для фильтра: скрыть метку значит скрыть все счётчики с ней, разом по всей странице. Задаются они на вкладке «Метки».",
  "A finished day pays 10 points; a missed one takes 20. Neither figure is a setting — what matters is the ratio, and at two to one the account grows only above a two-thirds keep rate.":
    "Выполненный день даёт 10 очков, пропущенный отнимает 20. Ни одна из цифр не настройка — важно соотношение: при два к одному счёт растёт только при удержании выше двух третей.",
  "Today and yesterday can still be written, so they are not counted yet. A day's mark is written once when it leaves that window and never revisited: this is the one figure here you can spend, so editing a Tuesday must not move a balance something was already bought against.":
    "Сегодня и вчера ещё можно записать, поэтому они пока не учтены. Отметка дня пишется один раз, когда он выходит из этого окна, и больше не пересматривается: это единственная цифра здесь, которую можно тратить, так что правка вторника не должна двигать баланс, против которого уже что-то куплено.",

  /* ---- picking what a condition counts ----------------------------------- */
  "pick:All logged time": "Всё учтённое время",
  "pick:Activities": "Занятия",
  "pick:Tallies": "Счёты",
  "pick:Checks": "Отметки",
  "pick:Categories": "Категории",
  "pick:Tags": "Метки",
  "pick:Any counter": "Любой счётчик",
  "No {kind} yet — Setup has the tab for them.":
    "Пока нет ни одного: {kind}. Вкладка для них есть в настройках.",
  "whatever it was filed under": "куда бы оно ни было отнесено",

  /* ---- Setup: the project itself ----------------------------------------- */
  "Close setup": "Закрыть настройки",
  "No start date": "Дата начала не задана",
  "Untitled project": "Проект без названия",
  "At least one project is required": "Нужен хотя бы один проект",
  "Delete project": "Удалить проект",
  "Project icon": "Значок проекта",
  "Project name": "Название проекта",
  "Project start date": "Дата начала проекта",
  "Pick a start date": "Выберите дату начала",
  "Project end date (optional)": "Дата конца проекта (необязательно)",
  "Drop this condition": "Убрать это условие",
  Starts: "Начинается",

  "{days}d ({months} months)": "{days} дн. ({months} мес.)",

  /* ---- the last of the interface ----------------------------------------- */
  "The two passwords don't match.": "Пароли не совпадают.",
  "Couldn't set the password.": "Не удалось установить пароль.",
  "New password": "Новый пароль",
  "Repeat it": "Повторите",
  "Saving…": "Сохраняем…",
  "Save password": "Сохранить пароль",

  "The day's goal is read from this rule": "Цель дня читается из этого правила",
  "Read the day's goal from this rule": "Читать цель дня из этого правила",
  "How much of the day's ring this rule takes, and where its arc starts.":
    "Какую долю кольца дня занимает это правило и где начинается его дуга.",
  "Drawing only. The verdict is unchanged either way, because a day is missed the moment anything is missed — a rule that should genuinely count for less is a rule that should not be voting, which the switch beside this says honestly.":
    "Только рисунок. Вердикт от этого не меняется: день считается пропущенным в тот момент, когда пропущено хоть что-то. Правило, которое действительно должно весить меньше, — это правило, которому не место в голосовании, и переключатель рядом говорит об этом честно.",
  "A day is kept when every rule that counts held. That run of days is the streak on the row above the log — the one number worth being afraid of.":
    "День считается выполненным, когда устояли все голосующие правила. Череда таких дней — это серия в строке над журналом, единственное число, которого стоит бояться.",
  "A rule left out still keeps its own streak. It simply gets no vote on the day.":
    "Исключённое правило всё равно ведёт свою серию. Просто у него нет голоса в дне.",
  "Switching this on counts from today, never backwards: a rule two months old could otherwise rewrite a streak out of history you can no longer edit.":
    "Включение действует с сегодняшнего дня и никогда назад: иначе двухмесячное правило переписало бы серию из истории, которую вы уже не можете править.",
  "what this means": "что это значит",

  "One record here belongs to an achievement that no longer exists":
    "Одна запись здесь принадлежит достижению, которого больше нет",
  "{n} records here belong to achievements that no longer exist":
    "Записей здесь: {n} — они принадлежат достижениям, которых больше нет",
  ", and 1 point is still on your balance because of it.":
    ", и из-за неё на счету всё ещё 1 очко.",
  ", and {n} points are still on your balance because of them.":
    ", и из-за них на счету всё ещё {n} очков.",
  "Deleting an achievement takes its record with it. These are older than that rule, and nothing on the page can name what they were for.":
    "Удаление достижения уносит его запись с собой. Эти старше того правила, и ничто на странице не может назвать, за что они были.",
  "Remove them and the {n} points": "Удалить вместе с {n} очками",
  "Remove them": "Удалить",

  "Rules held": "Правил устояло",
  "Rules voting": "Правил голосует",

  "Time — what a logged entry went on. Lessons, revision, a lecture. Every hour the app reports is filed under one of these.":
    "Время — на что ушла запись. Уроки, повторение, лекция. Каждый час, который показывает приложение, отнесён к одному из них.",
  "How many — lessons finished, pages read, cigarettes smoked. A number per slot, and a running total when there is one to run against.":
    "Сколько — пройдено уроков, прочитано страниц, выкурено сигарет. Число на слот и общий итог, когда есть с чем сверяться.",
  "Whether or not — overslept, went to bed on time, took a rest day. One answer a day: yes, no or skipped, and unknown until the day is over.":
    "Было или нет — проспал, лёг вовремя, взял выходной. Один ответ в день: да, нет или пропущено — и неизвестно, пока день не кончился.",

  "This period sets its own dates": "У этого периода свои даты",
  "Two of its conditions land on the same weekday, so there is no single figure for that day.":
    "Два его условия приходятся на один день недели, так что единой цифры на этот день нет.",
  "Now pick the end": "Теперь выберите конец",
  "Click a start, then an end": "Нажмите начало, потом конец",
  "The log can be written for today and yesterday. This day seals at midnight.":
    "Журнал пишется за сегодня и вчера. Этот день запечатается в полночь.",

  "The same period spread over time: hours per day, how the weekdays compare with one another, and totals week by week and month by month. Each chart can be split by slot or by activity.":
    "Тот же период, разложенный по времени: часы по дням, сравнение дней недели между собой и итоги по неделям и месяцам. Каждый график можно разбить по слотам или по занятиям.",

  "What counts": "Что считается",
  "The composite": "Общий счёт",
  "Summary & trends": "Сводка и динамика",
  Banked: "В банке",
  "Granted every Monday and lost unused.":
    "Выдаётся каждый понедельник и сгорает неиспользованной.",
  "One for every week you keep clean. Carried until spent.":
    "По одной за каждую чистую неделю. Хранится, пока не потратите.",
  "Couldn't load your logbook": "Не удалось загрузить журнал",
  "The server answered, but your saved data didn't come back. Nothing has been changed — saving is switched off until it loads, so the stored copy stays exactly as it is.":
    "Сервер ответил, но сохранённые данные не пришли. Ничего не изменено — запись отключена до успешной загрузки, так что хранимая копия остаётся ровно такой, как есть.",
  "Try again": "Попробовать снова",
  "Your changes are not being saved. Retrying — keep this tab open. If it persists, sign out and back in.":
    "Ваши изменения не сохраняются. Повторяем — не закрывайте вкладку. Если не проходит, выйдите и войдите заново.",
  "Retry now": "Повторить сейчас",
  "Could not make a link": "Не удалось создать ссылку",
  "That link did not work": "Эта ссылка не сработала",
  "Sign in first — there's nowhere to write":
    "Сначала войдите — писать некуда",

  "This email is already registered but not confirmed yet — we've sent a fresh confirmation email.":
    "Эта почта уже зарегистрирована, но ещё не подтверждена — мы отправили новое письмо с подтверждением.",
}
