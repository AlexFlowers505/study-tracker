/* ---------------------------------------------------------------
   The overview numbers and the forecast.

   One function serves both scopes: "Overall stats" hands it every logged
   day, "Stats" hands it the selected period, and the shape that comes back
   is the same either way — so the two can never disagree about what
   "lessons done" means.
--------------------------------------------------------------- */

import type { Day, DayKey, Project, Settings, Slot } from "../types/model"
import { addDays, daysBetween, fromKey } from "./date"
import { dayBreakdown, makeIsIgnored } from "./stats"

export interface OverviewTotals {
  totalMinutes: number
  lessonsDone: number
  examsDone: number
  activeDays: number
  daysSinceStart: number
  emptyDays: number
  totalLessons: number
  totalExams: number
  lessonsRemaining: number
  examsRemaining: number
  avgMinutesPerLesson: number | null
  avgLessonsPerActiveDay: number | null
  estRemainingMinutes: number | null
  estRemainingCalendarDays: number | null
  estFinishDate: Date | null
  avgHoursPerDay: number | null
  avgHoursPerLesson: number | null
  avgLessonsPerDay: number | null
  avgDaysPerExam: number | null
  avgLessonsPerWeek: number | null
  avgLessonsPerMonth: number | null
  avgLessonsPer3Months: number | null
}

export function computeOverviewStats(
  keys: DayKey[],
  days: Record<DayKey, Day>,
  slots: Slot[],
  settings: Settings,
  startDate: Date,
  endDateCutoff: Date,
): OverviewTotals {
  let totalMinutes = 0
  let lessonsDone = 0
  let examsDone = 0
  let activeDays = 0
  keys.forEach((k) => {
    const entry = days[k]
    const { total } = dayBreakdown(entry, slots)
    if (total > 0) activeDays += 1
    totalMinutes += total
    lessonsDone += Number(entry.lessons) || 0
    if (entry.exam) examsDone += 1
  })

  const daysSinceStart = Math.max(daysBetween(startDate, endDateCutoff) + 1, 1)
  const emptyDays = Math.max(daysSinceStart - activeDays, 0)

  const totalLessons = settings.totalLessons || 0
  const totalExams = settings.totalExams || 0
  const lessonsRemaining = Math.max(totalLessons - lessonsDone, 0)
  const examsRemaining = Math.max(totalExams - examsDone, 0)

  const avgMinutesPerLesson =
    lessonsDone > 0 ? totalMinutes / lessonsDone : null
  const avgLessonsPerActiveDay =
    activeDays > 0 ? lessonsDone / activeDays : null
  const activeRatio = daysSinceStart > 0 ? activeDays / daysSinceStart : 1

  const today = new Date()
  let estRemainingMinutes: number | null = null
  let estRemainingCalendarDays: number | null = null
  let estFinishDate: Date | null = null
  if (avgMinutesPerLesson && lessonsRemaining > 0)
    estRemainingMinutes = avgMinutesPerLesson * lessonsRemaining
  if (avgLessonsPerActiveDay && lessonsRemaining > 0) {
    const estActiveDaysNeeded = lessonsRemaining / avgLessonsPerActiveDay
    estRemainingCalendarDays =
      activeRatio > 0
        ? Math.ceil(estActiveDaysNeeded / activeRatio)
        : Math.ceil(estActiveDaysNeeded)
    estFinishDate = addDays(today, estRemainingCalendarDays)
  }

  // Plain calendar-day averages (not "active days only") — matches how "average
  // days per exam" is naturally understood: total elapsed days / count.
  const avgHoursPerDay =
    daysSinceStart > 0 ? totalMinutes / 60 / daysSinceStart : null
  const avgHoursPerLesson =
    avgMinutesPerLesson != null ? avgMinutesPerLesson / 60 : null
  const avgLessonsPerDay =
    daysSinceStart > 0 ? lessonsDone / daysSinceStart : null
  const avgDaysPerExam = examsDone > 0 ? daysSinceStart / examsDone : null
  const avgLessonsPerWeek =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 7) : null
  const avgLessonsPerMonth =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 30.44) : null
  const avgLessonsPer3Months =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 91.31) : null

  return {
    totalMinutes,
    lessonsDone,
    examsDone,
    activeDays,
    daysSinceStart,
    emptyDays,
    totalLessons,
    totalExams,
    lessonsRemaining,
    examsRemaining,
    avgMinutesPerLesson,
    avgLessonsPerActiveDay,
    estRemainingMinutes,
    estRemainingCalendarDays,
    estFinishDate,
    avgHoursPerDay,
    avgHoursPerLesson,
    avgLessonsPerDay,
    avgDaysPerExam,
    avgLessonsPerWeek,
    avgLessonsPerMonth,
    avgLessonsPer3Months,
  }
}

/**
 * Project-wide totals and forecast — deliberately NOT scoped to the chosen
 * period, since "lessons done", "exams passed" and the forecast are only
 * meaningful against the project's total lesson and exam counts.
 */
export function computeOverallAllTime(project: Project): OverviewTotals {
  const { days, slots, settings, weekIgnore = {}, monthIgnore = {} } = project
  const isIgnored = makeIsIgnored(weekIgnore, monthIgnore)
  const keys = Object.keys(days)
    .sort()
    .filter((k) => !isIgnored(k, days[k]))
  const start = settings.startDate
    ? fromKey(settings.startDate)
    : keys[0]
      ? fromKey(keys[0])
      : new Date()
  const today = new Date()
  const cutoff =
    settings.endDate && fromKey(settings.endDate) < today
      ? fromKey(settings.endDate)
      : today
  return computeOverviewStats(keys, days, slots, settings, start, cutoff)
}
