import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Enhanced Design System Colors
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8A8A8E',
  textTertiary: '#C7C7CC',
  separator: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  white: '#FFFFFF',
  black: '#000000',
  selectedDay: '#007AFF',
  selectedDayText: '#FFFFFF',
  todayBg: '#E3F2FD',
  todayText: '#007AFF',
  weekdayText: '#8A8A8E',
  prevNextText: '#C7C7CC',
};

interface CalendarDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
  initialDate?: string;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarDatePicker({
  visible,
  onClose,
  onDateSelect,
  initialDate,
  title = 'Select Date',
  minDate,
  maxDate = new Date(), // Default max date to today
}: CalendarDatePickerProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (initialDate) {
      try {
        const date = new Date(initialDate);
        return isNaN(date.getTime()) ? null : initialDate;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate) {
      try {
        const date = new Date(initialDate);
        return isNaN(date.getTime()) ? today : date;
      } catch {
        return today;
      }
    }
    return today;
  });

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const isDateDisabled = React.useCallback((date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }, [minDate, maxDate]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of the month and calculate starting position
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Previous month's days to fill the start
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const days: Array<{
      date: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dateString: string;
      isDisabled: boolean;
    }> = [];

    // Add previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, date);
      const dateString = dateObj.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selectedDate === dateString,
        dateString,
        isDisabled: isDateDisabled(dateObj),
      });
    }

    // Add current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      const dateObj = new Date(year, month, date);
      const dateString = dateObj.toISOString().split('T')[0];
      const isToday = dateObj.toDateString() === today.toDateString();
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected: selectedDate === dateString,
        dateString,
        isDisabled: isDateDisabled(dateObj),
      });
    }

    // Add next month's days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let date = 1; date <= remainingDays; date++) {
      const dateObj = new Date(year, month + 1, date);
      const dateString = dateObj.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selectedDate === dateString,
        dateString,
        isDisabled: isDateDisabled(dateObj),
      });
    }

    return days;
  }, [currentMonth, selectedDate, today, minDate, maxDate, isDateDisabled]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDatePress = (dateString: string, isDisabled: boolean) => {
    if (isDisabled) return;
    setSelectedDate(dateString);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const formatMonthYear = () => {
    return `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  };

  // Quick date selection buttons
  const getQuickDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    return [
      { label: 'Today', date: today },
      { label: 'Yesterday', date: yesterday },
      { label: 'Last Week', date: lastWeek },
    ].filter(item => !isDateDisabled(item.date));
  };

  const renderDay = (dayData: typeof calendarData[0]) => {
    const {
      date,
      isCurrentMonth,
      isToday,
      isSelected,
      dateString,
      isDisabled
    } = dayData;

    const dayStyle = [
      styles.dayContainer,
      isSelected && styles.selectedDay,
      isToday && !isSelected && styles.todayDay,
    ].filter(Boolean);

    const textStyle = [
      styles.dayText,
      !isCurrentMonth && styles.prevNextMonthText,
      isDisabled && styles.disabledDayText,
      isSelected && styles.selectedDayText,
      isToday && !isSelected && styles.todayText,
    ].filter(Boolean);

    return (
      <TouchableOpacity
        key={`${dateString}-${isCurrentMonth ? 'current' : (dayData.date > 15 ? 'next' : 'prev')}`}
        style={dayStyle}
        onPress={() => handleDatePress(dateString, isDisabled || !isCurrentMonth)}
        disabled={isDisabled || !isCurrentMonth}
        accessibilityLabel={`${MONTHS[currentMonth.getMonth()]} ${date}, ${currentMonth.getFullYear()}`}
        accessibilityRole="button"
      >
        <Text style={textStyle}>{date}</Text>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Quick Date Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickDatesContainer}>
            <View style={styles.quickDatesRow}>
              {getQuickDates().map((quickDate) => (
                <TouchableOpacity
                  key={quickDate.label}
                  style={[
                    styles.quickDateButton,
                    selectedDate === quickDate.date.toISOString().split('T')[0] && styles.quickDateButtonSelected
                  ]}
                  onPress={() => {
                    const dateString = quickDate.date.toISOString().split('T')[0];
                    setSelectedDate(dateString);
                    setCurrentMonth(quickDate.date);
                  }}
                >
                  <Text style={[
                    styles.quickDateText,
                    selectedDate === quickDate.date.toISOString().split('T')[0] && styles.quickDateTextSelected
                  ]}>
                    {quickDate.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <FontAwesome name="chevron-left" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>{formatMonthYear()}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <FontAwesome name="chevron-right" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdaysContainer}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={styles.weekdayHeader}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarData.map((dayData) => renderDay(dayData))}
          </View>

          {/* Selected Date Display */}
          {selectedDate && (
            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateLabel}>Selected:</Text>
              <Text style={styles.selectedDateValue}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !selectedDate && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!selectedDate}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: width - 40,
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 36,
  },
  quickDatesContainer: {
    marginBottom: 20,
    maxHeight: 50,
  },
  quickDatesRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  quickDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  quickDateButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  quickDateTextSelected: {
    color: COLORS.white,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.weekdayText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  prevNextMonthText: {
    color: COLORS.prevNextText,
  },
  disabledDayText: {
    color: COLORS.textTertiary,
  },
  selectedDay: {
    backgroundColor: COLORS.selectedDay,
  },
  selectedDayText: {
    color: COLORS.selectedDayText,
    fontWeight: '600',
  },
  todayDay: {
    backgroundColor: COLORS.todayBg,
  },
  todayText: {
    color: COLORS.todayText,
    fontWeight: '600',
  },
  selectedDateDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  selectedDateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});