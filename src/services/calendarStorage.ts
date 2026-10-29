/**
 * Storage and calculations for Sổ Giỗ Chạp (Ancestral Memorials)
 * and Daily Buddhist Practice Diary Integration
 */

import { convertSolarToLunar, jdFromDate, jdToDate } from './lunarCalendar';
import { StorageService } from './storage';
import { ChantSession } from '../types';

export interface MemorialRecord {
  id: string;
  name: string;
  relationship: string;
  lunarDay: number;
  lunarMonth: number;
  notes?: string;
  createdAt: string;
}

export interface MemorialUpcomingInfo {
  record: MemorialRecord;
  nextSolarDate: Date;
  daysRemaining: number;
  isToday: boolean;
  isSoon: boolean; // within 7 days
}

const MEMORIAL_STORAGE_KEY = 'tuduong_memorial_records_v1';
const CALENDAR_PREF_KEY = 'tuduong_calendar_pref_v1';

export interface CalendarPreferences {
  vegetarianMode: 'nhi_trai' | 'luc_trai' | 'thap_trai';
  showHoangDaoInMonth: boolean;
  notifyMemorials: boolean;
}

export const DEFAULT_CALENDAR_PREFS: CalendarPreferences = {
  vegetarianMode: 'thap_trai',
  showHoangDaoInMonth: true,
  notifyMemorials: true
};

export class CalendarStorageService {
  /**
   * Get all ancestral memorial records
   */
  public static getMemorials(): MemorialRecord[] {
    try {
      const data = localStorage.getItem(MEMORIAL_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error loading memorials:', e);
    }
    // Default initial examples for first time users
    return [
      {
        id: 'memorial-sample-1',
        name: 'Giỗ Cụ Bà Cố',
        relationship: 'Cụ Bà',
        lunarDay: 15,
        lunarMonth: 7,
        notes: 'Lễ cúng chay trang nghiêm, tụng kinh Vu Lan Báo Hiếu hồi hướng công đức',
        createdAt: new Date().toISOString()
      }
    ];
  }

  public static saveMemorial(record: MemorialRecord): MemorialRecord[] {
    const list = this.getMemorials();
    const existingIndex = list.findIndex(r => r.id === record.id);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }
    try {
      localStorage.setItem(MEMORIAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving memorial:', e);
    }
    return list;
  }

  public static deleteMemorial(id: string): MemorialRecord[] {
    const list = this.getMemorials().filter(r => r.id !== id);
    try {
      localStorage.setItem(MEMORIAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error deleting memorial:', e);
    }
    return list;
  }

  /**
   * Calculate next Solar date for a given Lunar Day/Month
   */
  public static findNextSolarDateForLunar(lunarDay: number, lunarMonth: number, fromDate: Date = new Date()): Date {
    const currentYear = fromDate.getFullYear();
    // Search within current year and next year (+- 400 days)
    const startJd = jdFromDate(fromDate.getDate(), fromDate.getMonth() + 1, currentYear);

    for (let offset = 0; offset <= 420; offset++) {
      const checkJd = startJd + offset;
      const solar = jdToDate(checkJd);
      const lunar = convertSolarToLunar(solar.day, solar.month, solar.year);
      if (lunar.day === lunarDay && lunar.month === lunarMonth) {
        return new Date(solar.year, solar.month - 1, solar.day);
      }
    }

    return new Date(currentYear, fromDate.getMonth(), fromDate.getDate() + 30);
  }

  /**
   * Get upcoming memorial records sorted by closest date
   */
  public static getUpcomingMemorials(fromDate: Date = new Date()): MemorialUpcomingInfo[] {
    const list = this.getMemorials();
    const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

    const result: MemorialUpcomingInfo[] = list.map(rec => {
      const nextSolar = this.findNextSolarDateForLunar(rec.lunarDay, rec.lunarMonth, today);
      const diffMs = nextSolar.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return {
        record: rec,
        nextSolarDate: nextSolar,
        daysRemaining,
        isToday: daysRemaining === 0,
        isSoon: daysRemaining > 0 && daysRemaining <= 7
      };
    });

    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Get calendar preferences
   */
  public static getPreferences(): CalendarPreferences {
    try {
      const data = localStorage.getItem(CALENDAR_PREF_KEY);
      if (data) {
        return { ...DEFAULT_CALENDAR_PREFS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error loading calendar prefs:', e);
    }
    return DEFAULT_CALENDAR_PREFS;
  }

  public static savePreferences(prefs: CalendarPreferences): void {
    try {
      localStorage.setItem(CALENDAR_PREF_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Error saving calendar prefs:', e);
    }
  }

  /**
   * Get daily practice summary for a specific date (YYYY-MM-DD)
   */
  public static getPracticeStatsForDate(dateStr: string): {
    totalCount: number;
    totalSeconds: number;
    sessions: ChantSession[];
  } {
    const history = StorageService.getHistory();
    const sessions = history.filter(s => s.startedAt && s.startedAt.startsWith(dateStr));
    const totalCount = sessions.reduce((acc, s) => acc + s.count, 0);
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

    return {
      totalCount,
      totalSeconds,
      sessions
    };
  }
}
