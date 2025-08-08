import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from '@expo/vector-icons';

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
};

interface ModernDateTimePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  title?: string;
}

export default function ModernDateTimePicker({
  date,
  onDateChange,
  onTimeChange,
  mode = 'datetime',
  title = 'Receipt Date & Time',
}: ModernDateTimePickerProps) {
  // Always show pickers on iOS for better UX, use state for Android
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [currentMode, setCurrentMode] = useState<'date' | 'time'>('date');

  const handleDatePress = () => {
    if (Platform.OS === 'android') {
      setCurrentMode('date');
      setShowDatePicker(true);
    } else {
      // iOS shows picker inline
      setShowDatePicker(!showDatePicker);
    }
  };

  const handleTimePress = () => {
    if (Platform.OS === 'android') {
      setCurrentMode('time');
      setShowTimePicker(true);
    } else {
      // iOS shows picker inline
      setShowTimePicker(!showTimePicker);
    }
  };

  const onDatePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const onTimePickerChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedTime) {
      onTimeChange(selectedTime);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.pickersContainer}>
        {/* Date Picker Section */}
        {(mode === 'date' || mode === 'datetime') && (
          <View style={styles.pickerSection}>
            <View style={styles.pickerHeader}>
              <FontAwesome name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.pickerLabel}>Date</Text>
            </View>
            <View style={styles.directPicker}>
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={onDatePickerChange}
                maximumDate={new Date()} // Can't select future dates
              />
            </View>
          </View>
        )}

        {/* Time Picker Section */}
        {(mode === 'time' || mode === 'datetime') && (
          <View style={styles.pickerSection}>
            <View style={styles.pickerHeader}>
              <FontAwesome name="clock-o" size={20} color={COLORS.primary} />
              <Text style={styles.pickerLabel}>Time</Text>
            </View>
            <View style={styles.directPicker}>
              <DateTimePicker
                testID="timePicker"
                value={date}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={onTimePickerChange}
              />
            </View>
          </View>
        )}
      </View>

      {/* Android Modal Pickers */}
      {Platform.OS === 'android' && showDatePicker && currentMode === 'date' && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          display="default"
          onChange={onDatePickerChange}
          maximumDate={new Date()} // Can't select future dates
        />
      )}

      {Platform.OS === 'android' && showTimePicker && currentMode === 'time' && (
        <DateTimePicker
          testID="timePicker"
          value={date}
          mode="time"
          display="default"
          onChange={onTimePickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickersContainer: {
    gap: 12,
  },
  pickerSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerButton: {
    padding: 16,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  pickerLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  directPicker: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inlinePicker: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
    backgroundColor: COLORS.background,
  },
});