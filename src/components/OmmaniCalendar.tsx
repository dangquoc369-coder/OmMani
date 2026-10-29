import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  Clock,
  Compass,
  AlertTriangle,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  X,
  Flame,
  Award
} from 'lucide-react';
import {
  convertSolarToLunar,
  getFullDayDetails,
  DayCalendarDetails,
  BUDDHIST_FEAST_DAYS,
  checkVegetarianDays
} from '../services/lunarCalendar';
import {
  CalendarStorageService,
  MemorialRecord,
  CalendarPreferences
} from '../services/calendarStorage';
import { ChantSession } from '../types';

interface OmmaniCalendarProps {
  onClose: () => void;
  onStartChantingFromCalendar?: () => void;
  practiceHistory: ChantSession[];
}

type CalendarTab = 'calendar' | 'vegetarian_feast' | 'memorial' | 'practice';

export const OmmaniCalendar: React.FC<OmmaniCalendarProps> = ({
  onClose,
  onStartChantingFromCalendar,
  practiceHistory
}) => {
  // Navigation & Current View
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendar');

  // Preferences & Memorials
  const [prefs, setPrefs] = useState<CalendarPreferences>(() => CalendarStorageService.getPreferences());
  const [memorials, setMemorials] = useState<MemorialRecord[]>(() => CalendarStorageService.getMemorials());

  // Add Memorial Dialog
  const [showAddMemorial, setShowAddMemorial] = useState(false);
  const [memName, setMemName] = useState('');
  const [memRelation, setMemRelation] = useState('Gia tiên');
  const [memDay, setMemDay] = useState(15);
  const [memMonth, setMemMonth] = useState(7);
  const [memNotes, setMemNotes] = useState('');

  // Selected Day Details
  const selectedDayDetails: DayCalendarDetails = useMemo(() => {
    return getFullDayDetails(selectedDate);
  }, [selectedDate]);

  // Practice stats for selected day
  const selectedDayPractice = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const sessions = practiceHistory.filter(s => s.startedAt && s.startedAt.startsWith(dateStr));
    const totalCount = sessions.reduce((acc, s) => acc + s.count, 0);
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    return { sessions, totalCount, totalSeconds };
  }, [selectedDate, practiceHistory]);

  // Generate Days in Month Grid
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    // Monday is 1st day of week in VN (0 = Sun, 1 = Mon... -> Mon=0, Sun=6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      lunarDay: number;
      lunarMonth: number;
      isToday: boolean;
      isSelected: boolean;
      hasFeast: boolean;
      isVegetarian: boolean;
      hasPractice: boolean;
      hasMemorial: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const date = new Date(currentYear, currentMonth - 1, d);
      const lunar = convertSolarToLunar(d, currentMonth, currentYear);
      days.push({
        date,
        isCurrentMonth: false,
        lunarDay: lunar.day,
        lunarMonth: lunar.month,
        isToday: false,
        isSelected: false,
        hasFeast: !!BUDDHIST_FEAST_DAYS[`${lunar.day}/${lunar.month}`],
        isVegetarian: false,
        hasPractice: false,
        hasMemorial: false
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const lunar = convertSolarToLunar(day, currentMonth + 1, currentYear);
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();
      const isSelected =
        day === selectedDate.getDate() &&
        currentMonth === selectedDate.getMonth() &&
        currentYear === selectedDate.getFullYear();

      const feast = !!BUDDHIST_FEAST_DAYS[`${lunar.day}/${lunar.month}`];
      const veg = checkVegetarianDays(lunar.day, 30);
      let isVeg = false;
      if (prefs.vegetarianMode === 'nhi_trai') isVeg = veg.isNhiTrai;
      else if (prefs.vegetarianMode === 'luc_trai') isVeg = veg.isLucTrai;
      else isVeg = veg.isThapTrai;

      // Check practice history for this day
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasPractice = practiceHistory.some(s => s.startedAt && s.startedAt.startsWith(dStr) && s.count > 0);

      // Check memorial for this lunar day
      const hasMemorial = memorials.some(m => m.lunarDay === lunar.day && m.lunarMonth === lunar.month);

      days.push({
        date,
        isCurrentMonth: true,
        lunarDay: lunar.day,
        lunarMonth: lunar.month,
        isToday,
        isSelected,
        hasFeast: feast,
        isVegetarian: isVeg,
        hasPractice,
        hasMemorial
      });
    }

    // Trailing padding to make multiples of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      const lunar = convertSolarToLunar(i, currentMonth + 2, currentYear);
      days.push({
        date,
        isCurrentMonth: false,
        lunarDay: lunar.day,
        lunarMonth: lunar.month,
        isToday: false,
        isSelected: false,
        hasFeast: !!BUDDHIST_FEAST_DAYS[`${lunar.day}/${lunar.month}`],
        isVegetarian: false,
        hasPractice: false,
        hasMemorial: false
      });
    }

    return days;
  }, [currentYear, currentMonth, today, selectedDate, prefs.vegetarianMode, practiceHistory, memorials]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  // Handle Vegetarian Mode Change
  const handleVegModeChange = (mode: 'nhi_trai' | 'luc_trai' | 'thap_trai') => {
    const updated = { ...prefs, vegetarianMode: mode };
    setPrefs(updated);
    CalendarStorageService.savePreferences(updated);
  };

  // Add Memorial Record
  const handleSaveMemorial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim()) return;
    const newRec: MemorialRecord = {
      id: 'memorial-' + Date.now(),
      name: memName.trim(),
      relationship: memRelation.trim() || 'Gia tiên',
      lunarDay: Number(memDay),
      lunarMonth: Number(memMonth),
      notes: memNotes.trim(),
      createdAt: new Date().toISOString()
    };
    const updated = CalendarStorageService.saveMemorial(newRec);
    setMemorials(updated);
    setShowAddMemorial(false);
    setMemName('');
    setMemNotes('');
  };

  const handleDeleteMemorial = (id: string) => {
    const updated = CalendarStorageService.deleteMemorial(id);
    setMemorials(updated);
  };

  // Upcoming Memorials list
  const upcomingMemorials = useMemo(() => {
    return CalendarStorageService.getUpcomingMemorials(today);
  }, [memorials, today]);

  // List of Buddhist feasts for the current solar/lunar month
  const currentMonthFeasts = useMemo(() => {
    const list: Array<{ solarDate: Date; lunarDay: number; lunarMonth: number; events: any[] }> = [];
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const lunar = convertSolarToLunar(d, currentMonth + 1, currentYear);
      const key = `${lunar.day}/${lunar.month}`;
      const events = BUDDHIST_FEAST_DAYS[key];
      if (events && events.length > 0) {
        list.push({
          solarDate: date,
          lunarDay: lunar.day,
          lunarMonth: lunar.month,
          events
        });
      }
    }
    return list;
  }, [currentYear, currentMonth]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#071716] border border-[#dfb15b]/30 rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 xs:px-4 sm:px-6 py-3 border-b border-[#dfb15b]/20 bg-[#09201f]/90">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#dfb15b]/30 to-[#0e3532] border border-[#dfb15b]/40 flex items-center justify-center text-[#dfb15b]">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-sacred text-base sm:text-lg font-bold text-[#faeed1] tracking-wide">
                  LỊCH PHẬT GIÁO OMMANI
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#dfb15b]/15 text-[#dfb15b] border border-[#dfb15b]/30">
                  Âm Dương Vạn Niên
                </span>
              </div>
              <p className="text-[11px] text-[#9fb8b5] hidden xs:block">
                Can Chi, Giờ Hoàng Đạo, Trai Nhật & Nhật Ký Tu Tập
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-[#9fb8b5] hover:text-[#faeed1] hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#dfb15b]/15 px-3 sm:px-6 bg-[#071918] overflow-x-auto gap-1 sm:gap-2 py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-[#dfb15b]/20 text-[#faeed1] border border-[#dfb15b]/40 shadow-sm'
                : 'text-[#9fb8b5] hover:text-[#faeed1] hover:bg-white/5'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#dfb15b]" />
            Lịch Tháng & Chi Tiết
          </button>

          <button
            onClick={() => setActiveTab('vegetarian_feast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'vegetarian_feast'
                ? 'bg-[#dfb15b]/20 text-[#faeed1] border border-[#dfb15b]/40 shadow-sm'
                : 'text-[#9fb8b5] hover:text-[#faeed1] hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#dfb15b]" />
            Ngày Ăn Chay & Ngày Vía
          </button>

          <button
            onClick={() => setActiveTab('memorial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'memorial'
                ? 'bg-[#dfb15b]/20 text-[#faeed1] border border-[#dfb15b]/40 shadow-sm'
                : 'text-[#9fb8b5] hover:text-[#faeed1] hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-[#dfb15b]" />
            Sổ Giỗ Chạp Gia Tiên
            {upcomingMemorials.some(u => u.isToday || u.isSoon) && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeTab === 'practice'
                ? 'bg-[#dfb15b]/20 text-[#faeed1] border border-[#dfb15b]/40 shadow-sm'
                : 'text-[#9fb8b5] hover:text-[#faeed1] hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#dfb15b]" />
            Nhật Ký Tu Tập
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-6 space-y-5">
          {/* TAB 1: CALENDAR VIEW */}
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Month Grid */}
              <div className="lg:col-span-7 bg-[#0a2321]/60 border border-[#dfb15b]/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
                {/* Month Navigation Bar */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-serif-sacred text-base sm:text-lg font-bold text-[#faeed1]">
                      Tháng {currentMonth + 1} / {currentYear}
                    </h3>
                    <p className="text-[11px] text-[#dfb15b]">
                      Năm Âm Lịch: {selectedDayDetails.canChi.yearCanChi}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={goToToday}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#dfb15b]/15 text-[#dfb15b] border border-[#dfb15b]/30 hover:bg-[#dfb15b]/25 transition-all"
                    >
                      Hôm nay
                    </button>
                    <button
                      onClick={prevMonth}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9fb8b5] hover:text-[#faeed1]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9fb8b5] hover:text-[#faeed1]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Labels (VN: T2 - CN) */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wd, i) => (
                    <div
                      key={wd}
                      className={`text-[11px] font-semibold py-1 ${
                        i === 6 ? 'text-red-400' : 'text-[#84a3a0]'
                      }`}
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1">
                  {calendarGrid.map((item, idx) => {
                    const isSunday = item.date.getDay() === 0;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(item.date)}
                        className={`min-h-[48px] sm:min-h-[58px] p-1 rounded-xl flex flex-col items-center justify-between transition-all relative group ${
                          !item.isCurrentMonth
                            ? 'opacity-30 bg-transparent'
                            : item.isSelected
                            ? 'bg-gradient-to-b from-[#dfb15b]/35 to-[#b3883b]/20 border-2 border-[#dfb15b] shadow-lg shadow-[#dfb15b]/10'
                            : item.isToday
                            ? 'bg-[#dfb15b]/15 border border-[#dfb15b]/50'
                            : 'bg-[#0d2a28]/60 hover:bg-[#0f3431] border border-white/5'
                        }`}
                      >
                        {/* Top: Solar Day */}
                        <div className="flex items-center justify-between w-full px-1">
                          <span
                            className={`text-xs sm:text-sm font-semibold ${
                              item.isSelected
                                ? 'text-[#faeed1] font-bold'
                                : item.isToday
                                ? 'text-[#dfb15b] font-bold'
                                : isSunday
                                ? 'text-red-300'
                                : 'text-[#e5dfd3]'
                            }`}
                          >
                            {item.date.getDate()}
                          </span>

                          {/* Dots / Indicators */}
                          <div className="flex items-center gap-0.5">
                            {item.hasFeast && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#dfb15b] shadow-sm shadow-[#dfb15b]"
                                title="Ngày Vía Phật / Đại lễ"
                              />
                            )}
                            {item.isVegetarian && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                title="Ngày Ăn Chay"
                              />
                            )}
                            {item.hasPractice && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                                title="Đã có khóa tu tập"
                              />
                            )}
                            {item.hasMemorial && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-rose-500"
                                title="Ngày Giỗ gia tiên"
                              />
                            )}
                          </div>
                        </div>

                        {/* Bottom: Lunar Day & Month */}
                        <div className="w-full text-center pb-0.5">
                          <span
                            className={`text-[10px] leading-tight block ${
                              item.lunarDay === 1 || item.lunarDay === 15
                                ? 'text-[#dfb15b] font-bold'
                                : 'text-[#82a39f]'
                            }`}
                          >
                            {item.lunarDay === 1 ? `${item.lunarDay}/${item.lunarMonth}` : item.lunarDay}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[#dfb15b]/15 text-[10px] sm:text-[11px] text-[#9fb8b5]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#dfb15b]" />
                    <span>Ngày Vía Phật</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Ngày Ăn Chay ({prefs.vegetarianMode === 'thap_trai' ? 'Thập Trai' : prefs.vegetarianMode === 'luc_trai' ? 'Lục Trai' : 'Nhị Trai'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Đã Tu Tập</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Giỗ Gia Tiên</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Day Details Card */}
              <div className="lg:col-span-5 space-y-4">
                {/* Main Day Card */}
                <div className="bg-gradient-to-b from-[#0b2826] to-[#071918] border border-[#dfb15b]/30 rounded-2xl p-4 shadow-lg space-y-3">
                  {/* Solar vs Lunar Banner */}
                  <div className="flex items-center justify-between border-b border-[#dfb15b]/15 pb-3">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#9fb8b5]">
                        Dương Lịch
                      </span>
                      <div className="text-xl sm:text-2xl font-bold text-[#faeed1]">
                        {selectedDayDetails.solarDay} Tháng {selectedDayDetails.solarMonth}, {selectedDayDetails.solarYear}
                      </div>
                      <span className="text-xs text-[#82a39f]">
                        Thứ {selectedDayDetails.solarDate.getDay() === 0 ? 'Chủ Nhật' : selectedDayDetails.solarDate.getDay() + 1}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-[#dfb15b]">
                        Âm Lịch
                      </span>
                      <div className="text-2xl sm:text-3xl font-serif-sacred font-bold text-[#dfb15b]">
                        {selectedDayDetails.lunar.day} / {selectedDayDetails.lunar.month}
                      </div>
                      <span className="text-xs text-[#faeed1]/80">
                        {selectedDayDetails.canChi.yearCanChi}
                      </span>
                    </div>
                  </div>

                  {/* Can Chi & Astrological Elements */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0e3532]/50 p-2 rounded-xl border border-white/5">
                      <span className="text-[#84a3a0] block text-[10px]">Can Chi Ngày:</span>
                      <span className="font-semibold text-[#faeed1]">
                        Ngày {selectedDayDetails.canChi.dayCanChi}
                      </span>
                    </div>
                    <div className="bg-[#0e3532]/50 p-2 rounded-xl border border-white/5">
                      <span className="text-[#84a3a0] block text-[10px]">Can Chi Tháng:</span>
                      <span className="font-semibold text-[#faeed1]">
                        Tháng {selectedDayDetails.canChi.monthCanChi}
                      </span>
                    </div>
                    <div className="bg-[#0e3532]/50 p-2 rounded-xl border border-white/5">
                      <span className="text-[#84a3a0] block text-[10px]">Ngũ Hành Nạp Âm:</span>
                      <span className="font-semibold text-[#dfb15b]">
                        {selectedDayDetails.canChi.napAm}
                      </span>
                    </div>
                    <div className="bg-[#0e3532]/50 p-2 rounded-xl border border-white/5">
                      <span className="text-[#84a3a0] block text-[10px]">Tiết Khí:</span>
                      <span className="font-semibold text-[#8ce2d9]">
                        {selectedDayDetails.canChi.tietKhi}
                      </span>
                    </div>
                  </div>

                  {/* Buddhist Feast & Vegetarian Badge if Applicable */}
                  {selectedDayDetails.buddhistEvents.length > 0 && (
                    <div className="bg-gradient-to-r from-[#dfb15b]/20 to-[#0e3532] border border-[#dfb15b]/40 rounded-xl p-3 space-y-1">
                      {selectedDayDetails.buddhistEvents.map((ev, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-1.5 text-[#dfb15b] font-bold text-xs sm:text-sm">
                            <Sparkles className="w-4 h-4 text-[#dfb15b] shrink-0" />
                            {ev.name}
                          </div>
                          <p className="text-[11px] text-[#faeed1]/90 mt-0.5 leading-relaxed">
                            {ev.significance}
                          </p>
                          {ev.mantraRecommendation && (
                            <div className="mt-1 text-[11px] text-[#8ce2d9] font-medium">
                              Khuyên niệm: {ev.mantraRecommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vegetarian Day Alert */}
                  {(selectedDayDetails.isThapTrai || selectedDayDetails.isNhiTrai) && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>
                        Hôm nay là ngày <strong>Ăn Chay Thanh Tịnh</strong> ({selectedDayDetails.lunar.day === 1 ? 'Mùng 1' : selectedDayDetails.lunar.day === 15 ? 'Rằm' : 'Trai Nhật'}). Khởi tâm từ bi phóng sanh tu phúc.
                      </span>
                    </div>
                  )}

                  {/* Dhammapada Verse of the Day */}
                  <div className="bg-[#071918]/80 border border-[#dfb15b]/20 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#dfb15b] font-serif-sacred">
                      <BookOpen className="w-3.5 h-3.5 text-[#dfb15b]" />
                      Lời Phật Dạy (Kinh Pháp Cú #{selectedDayDetails.dhammapada.verse})
                    </div>
                    <p className="text-sm sm:text-base italic text-[#fff4d6] leading-relaxed font-calligraphy tracking-wide">
                      "{selectedDayDetails.dhammapada.vietnamese}"
                    </p>
                    <p className="text-[11px] text-[#9fb8b5] font-sans-viet leading-relaxed pt-0.5">
                      Ý nghĩa: {selectedDayDetails.dhammapada.meaning}
                    </p>
                  </div>

                  {/* Departure Direction & Age Clashes */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#9fb8b5]">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-[#dfb15b]" />
                        Hướng Xuất Hành:
                      </span>
                      <span className="text-[#faeed1] font-medium">
                        Hỷ Thần: {selectedDayDetails.hyThanDirection} | Tài Thần: {selectedDayDetails.taiThanDirection}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#9fb8b5]">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Tuổi Xung Ngày:
                      </span>
                      <span className="text-amber-200/90 text-right">
                        {selectedDayDetails.tuoiXung[0]}
                      </span>
                    </div>
                  </div>

                  {/* Practice on this day */}
                  <div className="border-t border-[#dfb15b]/15 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#faeed1]">
                        <Flame className="w-3.5 h-3.5 text-[#dfb15b]" />
                        <span>Hành Trì Ngày Này:</span>
                      </div>
                      <span className="text-xs font-bold text-[#dfb15b]">
                        {selectedDayPractice.totalCount.toLocaleString('vi-VN')} câu niệm
                      </span>
                    </div>

                    {selectedDayPractice.totalCount > 0 ? (
                      <p className="text-[11px] text-[#9fb8b5] mt-1">
                        Tổng cộng {Math.round(selectedDayPractice.totalSeconds / 60)} phút thiền & niệm Phật qua {selectedDayPractice.sessions.length} khóa lễ.
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#698a87] mt-1">
                        Chưa có khóa niệm nào được lưu trong ngày này.
                      </p>
                    )}

                    {onStartChantingFromCalendar && (
                      <button
                        onClick={() => {
                          onClose();
                          onStartChantingFromCalendar();
                        }}
                        className="w-full mt-3 py-2 px-3 rounded-xl bg-gradient-to-r from-[#dfb15b] to-[#b3883b] text-[#071716] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#dfb15b]/20 hover:opacity-95 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Bắt Đầu Khóa Niệm Ngay
                      </button>
                    )}
                  </div>
                </div>

                {/* Giờ Hoàng Đạo Accordion / List */}
                <div className="bg-[#0a2321]/70 border border-[#dfb15b]/20 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#faeed1] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#dfb15b]" />
                      Giờ Hoàng Đạo Trong Ngày
                    </h4>
                    <span className="text-[10px] text-[#dfb15b]">
                      6 Giờ Hoàng Đạo / 6 Giờ Hắc Đạo
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedDayDetails.hoangDaoHours.map((h, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                          h.isAuspicious
                            ? 'bg-[#0e3532]/70 border-emerald-500/30 text-emerald-200'
                            : 'bg-black/20 border-white/5 text-[#73928f]'
                        }`}
                      >
                        <div>
                          <span className="font-semibold block">{h.hourName}</span>
                          <span className="text-[9px] opacity-75">{h.timeSpan}</span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            h.isAuspicious
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/5 text-[#82a39f]'
                          }`}
                        >
                          {h.isAuspicious ? 'Hoàng Đạo' : 'Hắc Đạo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEGETARIAN DAYS & BUDDHIST FEASTS */}
          {activeTab === 'vegetarian_feast' && (
            <div className="space-y-5">
              {/* Mode selector for vegetarian practice */}
              <div className="bg-[#0a2321]/80 border border-[#dfb15b]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif-sacred text-sm sm:text-base font-bold text-[#faeed1]">
                    Chế Độ Ngày Ăn Chay (Trai Giới)
                  </h3>
                  <p className="text-xs text-[#9fb8b5]">
                    Được đánh dấu tự động bằng chấm xanh trên lịch tháng
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#071918] p-1 rounded-xl border border-[#dfb15b]/20 shrink-0">
                  <button
                    onClick={() => handleVegModeChange('nhi_trai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      prefs.vegetarianMode === 'nhi_trai'
                        ? 'bg-[#dfb15b] text-[#071716] font-bold'
                        : 'text-[#9fb8b5] hover:text-[#faeed1]'
                    }`}
                  >
                    Nhị Trai (2 ngày)
                  </button>
                  <button
                    onClick={() => handleVegModeChange('luc_trai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      prefs.vegetarianMode === 'luc_trai'
                        ? 'bg-[#dfb15b] text-[#071716] font-bold'
                        : 'text-[#9fb8b5] hover:text-[#faeed1]'
                    }`}
                  >
                    Lục Trai (6 ngày)
                  </button>
                  <button
                    onClick={() => handleVegModeChange('thap_trai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      prefs.vegetarianMode === 'thap_trai'
                        ? 'bg-[#dfb15b] text-[#071716] font-bold'
                        : 'text-[#9fb8b5] hover:text-[#faeed1]'
                    }`}
                  >
                    Thập Trai (10 ngày)
                  </button>
                </div>
              </div>

              {/* Mode Description */}
              <div className="text-xs text-[#82a39f] bg-[#071918]/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                {prefs.vegetarianMode === 'nhi_trai' && (
                  <span>
                    <strong>Nhị Trai:</strong> Ăn chay 2 ngày mỗi tháng vào ngày Mùng 1 và Ngày Rằm (15 Âm lịch). Phù hợp cho Phật tử mới bắt đầu tu tập hoặc bận rộn.
                  </span>
                )}
                {prefs.vegetarianMode === 'luc_trai' && (
                  <span>
                    <strong>Lục Trai:</strong> Ăn chay 6 ngày mỗi tháng vào ngày mùng 8, 14, 15, 23, 29, 30 Âm lịch (hoặc 28, 29 nếu tháng thiếu). Theo Kinh Địa Tạng, giữ lục trai diệt trừ tội chướng.
                  </span>
                )}
                {prefs.vegetarianMode === 'thap_trai' && (
                  <span>
                    <strong>Thập Trai (Khuyên dùng):</strong> Ăn chay 10 ngày mỗi tháng vào ngày mùng 1, 8, 14, 15, 18, 23, 24, 28, 29, 30 Âm lịch. Kinh Địa Tạng dạy: Trong 10 ngày này, chư thiên tuần tra nhân gian, trì trai niệm Phật được tiêu trừ trăm ngàn tai ách.
                  </span>
                )}
              </div>

              {/* All Buddhist Feasts in the Year */}
              <div className="space-y-3">
                <h3 className="font-serif-sacred text-base font-bold text-[#dfb15b] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#dfb15b]" />
                  Danh Mục Các Ngày Lễ Vía Phật Giáo Trọng Đại (Âm Lịch)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(BUDDHIST_FEAST_DAYS).map(([dateKey, events]) => {
                    const [d, m] = dateKey.split('/');
                    const ev = events[0];
                    return (
                      <div
                        key={dateKey}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          ev.isMajor
                            ? 'bg-gradient-to-r from-[#dfb15b]/15 via-[#0e3532]/60 to-[#071918] border-[#dfb15b]/40 shadow-sm'
                            : 'bg-[#0a2321]/60 border-white/5 hover:border-[#dfb15b]/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dfb15b]/20 text-[#dfb15b] border border-[#dfb15b]/30">
                              Ngày {d} Tháng {m} Âm Lịch
                            </span>
                            <h4 className="font-bold text-sm sm:text-base text-[#faeed1] mt-1.5 font-serif-sacred tracking-wide">
                              {ev.name}
                            </h4>
                          </div>
                          {ev.isMajor && (
                            <span className="text-[10px] text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-serif-sacred">
                              Đại Lễ
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#9fb8b5] mt-1.5 leading-relaxed font-sans-viet">
                          {ev.significance}
                        </p>

                        {ev.mantraRecommendation && (
                          <div className="mt-2 text-xs text-[#dfb15b] font-medium flex items-center gap-1.5 bg-[#dfb15b]/10 px-2.5 py-1 rounded-lg border border-[#dfb15b]/20">
                            <BookOpen className="w-3.5 h-3.5 text-[#dfb15b] shrink-0" />
                            <span>Khuyên tụng: <strong className="font-calligraphy text-sm font-normal text-[#faeed1]">{ev.mantraRecommendation}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANCESTRAL MEMORIAL BOOK (SỔ GIỖ CHẠP GIA TIÊN) */}
          {activeTab === 'memorial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-sacred text-base font-bold text-[#faeed1] flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    Sổ Giỗ Chạp & Tưởng Nhớ Gia Tiên
                  </h3>
                  <p className="text-xs text-[#9fb8b5]">
                    Lưu trữ ngày giỗ theo Âm lịch, tự động quy đổi ngày Dương lịch và nhắc nhở
                  </p>
                </div>

                <button
                  onClick={() => setShowAddMemorial(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#dfb15b] to-[#b3883b] text-[#071716] font-bold text-xs flex items-center gap-1 shadow-md shadow-[#dfb15b]/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm Ngày Giỗ
                </button>
              </div>

              {/* Add Memorial Modal Form */}
              {showAddMemorial && (
                <form
                  onSubmit={handleSaveMemorial}
                  className="bg-[#0a2321] border border-[#dfb15b]/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#dfb15b]/20 pb-2">
                    <h4 className="font-bold text-sm text-[#dfb15b]">
                      Thêm Ngày Giỗ Gia Tiên
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddMemorial(false)}
                      className="text-[#9fb8b5] hover:text-[#faeed1]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[#9fb8b5] mb-1">Tên ngày giỗ / Họ tên người mất:</label>
                      <input
                        type="text"
                        required
                        value={memName}
                        onChange={e => setMemName(e.target.value)}
                        placeholder="Ví dụ: Giỗ Cụ Bà Cố, Giỗ Cha..."
                        className="w-full bg-[#071918] border border-[#dfb15b]/30 rounded-xl px-3 py-2 text-[#faeed1] focus:outline-none focus:border-[#dfb15b]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#9fb8b5] mb-1">Quan hệ:</label>
                      <input
                        type="text"
                        value={memRelation}
                        onChange={e => setMemRelation(e.target.value)}
                        placeholder="Ví dụ: Ông, Bà, Cha, Mẹ, Anh..."
                        className="w-full bg-[#071918] border border-[#dfb15b]/30 rounded-xl px-3 py-2 text-[#faeed1] focus:outline-none focus:border-[#dfb15b]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#9fb8b5] mb-1">Ngày Âm Lịch (1 - 30):</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        required
                        value={memDay}
                        onChange={e => setMemDay(Number(e.target.value))}
                        className="w-full bg-[#071918] border border-[#dfb15b]/30 rounded-xl px-3 py-2 text-[#faeed1] focus:outline-none focus:border-[#dfb15b]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#9fb8b5] mb-1">Tháng Âm Lịch (1 - 12):</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        required
                        value={memMonth}
                        onChange={e => setMemMonth(Number(e.target.value))}
                        className="w-full bg-[#071918] border border-[#dfb15b]/30 rounded-xl px-3 py-2 text-[#faeed1] focus:outline-none focus:border-[#dfb15b]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#9fb8b5] mb-1">Ghi chú / Món cúng chay / Khóa lễ:</label>
                      <input
                        type="text"
                        value={memNotes}
                        onChange={e => setMemNotes(e.target.value)}
                        placeholder="Ví dụ: Làm mâm cỗ chay thanh tịnh, tụng kinh Vu Lan hồi hướng..."
                        className="w-full bg-[#071918] border border-[#dfb15b]/30 rounded-xl px-3 py-2 text-[#faeed1] focus:outline-none focus:border-[#dfb15b]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMemorial(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-[#9fb8b5] hover:text-[#faeed1] text-xs"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#dfb15b] text-[#071716] font-bold text-xs"
                    >
                      Lưu Vào Sổ Giỗ
                    </button>
                  </div>
                </form>
              )}

              {/* Memorials List */}
              <div className="space-y-2.5">
                {upcomingMemorials.length === 0 ? (
                  <div className="text-center py-10 text-[#698a87] text-xs">
                    Chưa có ngày giỗ nào trong sổ. Nhấn "Thêm Ngày Giỗ" để bắt đầu ghi nhớ.
                  </div>
                ) : (
                  upcomingMemorials.map((item, idx) => (
                    <div
                      key={item.record.id || idx}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        item.isToday
                          ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-900/20'
                          : item.isSoon
                          ? 'bg-[#0f2e2b] border-[#dfb15b]/40'
                          : 'bg-[#0a2321]/60 border-white/5'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#faeed1]">
                            {item.record.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#82a39f]">
                            {item.record.relationship}
                          </span>
                          {item.isToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                              Hôm Nay Là Ngày Giỗ
                            </span>
                          )}
                          {item.isSoon && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                              Còn {item.daysRemaining} ngày nữa
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#9fb8b5] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[#dfb15b] font-medium">
                            Âm Lịch: Ngày {item.record.lunarDay} Tháng {item.record.lunarMonth}
                          </span>
                          <span>•</span>
                          <span>
                            Dương Lịch Năm Nay: {item.nextSolarDate.getDate()}/{item.nextSolarDate.getMonth() + 1}/{item.nextSolarDate.getFullYear()}
                          </span>
                        </div>

                        {item.record.notes && (
                          <p className="text-[11px] text-[#6e938f] italic">
                            "{item.record.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleDeleteMemorial(item.record.id)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-[#84a3a0] hover:text-rose-400 flex items-center justify-center transition-all"
                          title="Xóa khỏi sổ giỗ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRACTICE HISTORY & STATS */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="bg-[#0a2321]/80 border border-[#dfb15b]/20 rounded-2xl p-4">
                <h3 className="font-serif-sacred text-base font-bold text-[#faeed1] flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-[#dfb15b]" />
                  Tổng Kết Hành Trình Tu Tập
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center mt-3">
                  <div className="bg-[#0e3532]/70 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#9fb8b5] block">Tổng Khóa Lễ:</span>
                    <span className="text-lg font-bold text-[#faeed1]">
                      {practiceHistory.length}
                    </span>
                  </div>
                  <div className="bg-[#0e3532]/70 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#9fb8b5] block">Tổng Câu Niệm:</span>
                    <span className="text-lg font-bold text-[#dfb15b]">
                      {practiceHistory.reduce((acc, s) => acc + s.count, 0).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="bg-[#0e3532]/70 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#9fb8b5] block">Tổng Thời Gian:</span>
                    <span className="text-lg font-bold text-[#8ce2d9]">
                      {Math.round(practiceHistory.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)} phút
                    </span>
                  </div>
                  <div className="bg-[#0e3532]/70 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#9fb8b5] block">Đạt Mục Tiêu:</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {practiceHistory.filter(s => s.reachedTarget).length} khóa
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#dfb15b] uppercase tracking-wider">
                  Các Khóa Lễ Gần Nhất
                </h4>

                {practiceHistory.length === 0 ? (
                  <div className="text-center py-8 text-[#698a87] text-xs">
                    Chưa có khóa lễ nào được lưu trữ. Hãy bắt đầu niệm Phật để ghi nhận công đức.
                  </div>
                ) : (
                  practiceHistory.slice(0, 10).map((session, i) => {
                    const sessionDate = new Date(session.startedAt);
                    const lunar = convertSolarToLunar(sessionDate.getDate(), sessionDate.getMonth() + 1, sessionDate.getFullYear());
                    return (
                      <div
                        key={session.id || i}
                        className="bg-[#0a2321]/50 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#faeed1]">
                            {session.chantTitle}
                          </div>
                          <div className="text-[10px] text-[#9fb8b5] flex items-center gap-2 mt-0.5">
                            <span>
                              {sessionDate.toLocaleDateString('vi-VN')} ({lunar.day}/{lunar.month} Âm)
                            </span>
                            <span>•</span>
                            <span>{Math.round(session.durationSeconds / 60)} phút</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-[#dfb15b]">
                            {session.count.toLocaleString('vi-VN')} câu
                          </span>
                          {session.reachedTarget && (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Viên mãn
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
