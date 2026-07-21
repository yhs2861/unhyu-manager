import {
  getSupportedRange,
  lunarToSolar,
  solarToLunar,
} from '@fullstackfamily/manseryeok';
import type { AppSettings } from '../types/settings';

export type SolarBirthday = {
  year: number;
  month: number;
  day: number;
};

const lunarBirthdayCache = new Map<string, SolarBirthday | null>();

function isValidBirthdaySetting(settings: AppSettings) {
  return (
    settings.birthdayMonth >= 1 &&
    settings.birthdayMonth <= 12 &&
    settings.birthdayDay >= 1 &&
    settings.birthdayDay <= 30
  );
}

function findWithLunarToSolar(
  lunarYears: number[],
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth: boolean,
  solarYear: number,
) {
  for (const lunarYear of lunarYears) {
    try {
      const result = lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth);

      if (result.solar.year === solarYear) {
        return result.solar;
      }
    } catch {
      // Invalid lunar dates and missing leap months are handled by the verified scan below.
    }
  }

  return null;
}

function findWithSolarYearScan(
  lunarYears: number[],
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth: boolean,
  solarYear: number,
) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(Date.UTC(solarYear, month, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const result = solarToLunar(solarYear, month, day);

      if (
        lunarYears.includes(result.lunar.year) &&
        result.lunar.month === lunarMonth &&
        result.lunar.day === lunarDay &&
        result.lunar.isLeapMonth === isLeapMonth
      ) {
        return result.solar;
      }
    }
  }

  return null;
}

function findLunarBirthday(
  lunarYears: number[],
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth: boolean,
  solarYear: number,
) {
  for (const lunarYear of lunarYears) {
    const solarBirthday =
      findWithLunarToSolar([lunarYear], lunarMonth, lunarDay, isLeapMonth, solarYear) ??
      findWithSolarYearScan([lunarYear], lunarMonth, lunarDay, isLeapMonth, solarYear);

    if (solarBirthday) {
      return solarBirthday;
    }
  }

  return null;
}

export function getSolarBirthdayForYear(settings: AppSettings, solarYear: number) {
  if (settings.birthdayCalendarType !== 'lunar' || !isValidBirthdaySetting(settings)) {
    return null;
  }

  const cacheKey = [
    solarYear,
    settings.birthdayMonth,
    settings.birthdayDay,
    settings.birthdayLeapMonth ? 'leap' : 'regular',
  ].join(':');

  if (lunarBirthdayCache.has(cacheKey)) {
    return lunarBirthdayCache.get(cacheKey) ?? null;
  }

  const supportedRange = getSupportedRange();

  if (solarYear < supportedRange.min || solarYear > supportedRange.max) {
    console.warn(
      `[BirthdayVacation] Korean lunar conversion does not support solar year ${solarYear}.`,
    );
    lunarBirthdayCache.set(cacheKey, null);
    return null;
  }

  try {
    const lunarYears = [solarYear - 1, solarYear].filter(
      (year) => year >= supportedRange.min && year <= supportedRange.max,
    );
    const exactBirthday = findLunarBirthday(
      lunarYears,
      settings.birthdayMonth,
      settings.birthdayDay,
      settings.birthdayLeapMonth,
      solarYear,
    );
    const solarBirthday =
      exactBirthday ??
      (settings.birthdayLeapMonth
        ? findLunarBirthday(
            lunarYears,
            settings.birthdayMonth,
            settings.birthdayDay,
            false,
            solarYear,
          )
        : null);

    if (!solarBirthday) {
      console.warn(
        `[BirthdayVacation] Unable to convert lunar birthday for solar year ${solarYear}.`,
      );
    }

    lunarBirthdayCache.set(cacheKey, solarBirthday);
    return solarBirthday;
  } catch (error) {
    console.warn(
      `[BirthdayVacation] Lunar birthday conversion failed for solar year ${solarYear}:`,
      error,
    );
    lunarBirthdayCache.set(cacheKey, null);
    return null;
  }
}
