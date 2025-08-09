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
  selectedBg: '#007AFF',
  selectedText: '#FFFFFF',
};

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: string) => void;
  initialTime?: string;
  title?: string;
  is24Hour?: boolean;
}

export default function TimePicker({
  visible,
  onClose,
  onTimeSelect,
  initialTime,
  title = 'Select Time',
  is24Hour = false,
}: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (initialTime) {
      const [hour] = initialTime.split(':');
      return parseInt(hour, 10);
    }
    return new Date().getHours();
  });

  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (initialTime) {
      const [, minute] = initialTime.split(':');
      return parseInt(minute, 10);
    }
    return Math.round(new Date().getMinutes() / 5) * 5; // Round to nearest 5 minutes
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(() => {
    if (initialTime && !is24Hour) {
      const [hour] = initialTime.split(':');
      return parseInt(hour, 10) >= 12 ? 'PM' : 'AM';
    }
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
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

  const hours = useMemo(() => {
    return is24Hour 
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 12 }, (_, i) => i + 1);
  }, [is24Hour]);

  const minutes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i * 5);
  }, []);

  const formatTime = () => {
    if (is24Hour) {
      return `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    } else {
      const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
      return `${displayHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    }
  };

  const getCurrentTimeString = () => {
    if (is24Hour) {
      return `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    } else {
      let hour24 = selectedHour;
      if (selectedPeriod === 'PM' && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedPeriod === 'AM' && selectedHour === 12) {
        hour24 = 0;
      }
      return `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    }
  };

  const handleConfirm = () => {
    onTimeSelect(getCurrentTimeString());
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Quick time selection buttons
  const getQuickTimes = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.round(now.getMinutes() / 5) * 5;
    
    return [
      { label: 'Now', hour: currentHour, minute: currentMinute },
      { label: '9:00 AM', hour: 9, minute: 0 },
      { label: '12:00 PM', hour: 12, minute: 0 },
      { label: '6:00 PM', hour: 18, minute: 0 },
      { label: '8:00 PM', hour: 20, minute: 0 },
    ];
  };

  const handleQuickTimeSelect = (hour: number, minute: number) => {
    if (is24Hour) {
      setSelectedHour(hour);
      setSelectedMinute(minute);
    } else {
      if (hour === 0) {
        setSelectedHour(12);
        setSelectedPeriod('AM');
      } else if (hour <= 12) {
        setSelectedHour(hour);
        setSelectedPeriod(hour === 12 ? 'PM' : 'AM');
      } else {
        setSelectedHour(hour - 12);
        setSelectedPeriod('PM');
      }
      setSelectedMinute(minute);
    }
  };

  const renderTimeColumn = (
    values: number[],
    selectedValue: number,
    onSelect: (value: number) => void,
    formatter?: (value: number) => string
  ) => (
    <ScrollView
      style={styles.timeColumn}
      contentContainerStyle={styles.timeColumnContent}
      showsVerticalScrollIndicator={false}
    >
      {values.map((value) => (
        <TouchableOpacity
          key={value}
          style={[
            styles.timeItem,
            selectedValue === value && styles.selectedTimeItem,
          ]}
          onPress={() => onSelect(value)}
        >
          <Text
            style={[
              styles.timeText,
              selectedValue === value && styles.selectedTimeText,
            ]}
          >
            {formatter ? formatter(value) : value.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

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

          {/* Quick Time Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTimesContainer}>
            <View style={styles.quickTimesRow}>
              {getQuickTimes().map((quickTime) => (
                <TouchableOpacity
                  key={quickTime.label}
                  style={styles.quickTimeButton}
                  onPress={() => handleQuickTimeSelect(quickTime.hour, quickTime.minute)}
                >
                  <Text style={styles.quickTimeText}>{quickTime.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Current Time Display */}
          <View style={styles.currentTimeDisplay}>
            <Text style={styles.currentTimeLabel}>Selected Time:</Text>
            <Text style={styles.currentTimeValue}>{formatTime()}</Text>
          </View>

          {/* Time Selector */}
          <View style={styles.timeSelectorContainer}>
            <View style={styles.timeColumnsContainer}>
              {/* Hours */}
              <View style={styles.columnContainer}>
                <Text style={styles.columnLabel}>
                  {is24Hour ? 'Hour' : 'Hour'}
                </Text>
                {renderTimeColumn(
                  hours,
                  is24Hour ? selectedHour : (selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour),
                  (hour) => {
                    if (is24Hour) {
                      setSelectedHour(hour);
                    } else {
                      // Convert 12-hour to 24-hour for internal storage
                      if (selectedPeriod === 'AM') {
                        setSelectedHour(hour === 12 ? 0 : hour);
                      } else {
                        setSelectedHour(hour === 12 ? 12 : hour + 12);
                      }
                    }
                  }
                )}
              </View>

              {/* Separator */}
              <View style={styles.separator}>
                <Text style={styles.separatorText}>:</Text>
              </View>

              {/* Minutes */}
              <View style={styles.columnContainer}>
                <Text style={styles.columnLabel}>Minute</Text>
                {renderTimeColumn(minutes, selectedMinute, setSelectedMinute)}
              </View>

              {/* AM/PM for 12-hour format */}
              {!is24Hour && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.columnContainer}>
                    <Text style={styles.columnLabel}>Period</Text>
                    <ScrollView
                      style={styles.timeColumn}
                      contentContainerStyle={styles.timeColumnContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {['AM', 'PM'].map((period) => (
                        <TouchableOpacity
                          key={period}
                          style={[
                            styles.timeItem,
                            selectedPeriod === period && styles.selectedTimeItem,
                          ]}
                          onPress={() => {
                            setSelectedPeriod(period as 'AM' | 'PM');
                            // Update hour accordingly
                            const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
                            if (period === 'AM') {
                              setSelectedHour(displayHour === 12 ? 0 : displayHour);
                            } else {
                              setSelectedHour(displayHour === 12 ? 12 : displayHour + 12);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.timeText,
                              selectedPeriod === period && styles.selectedTimeText,
                            ]}
                          >
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
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
  quickTimesContainer: {
    marginBottom: 20,
    maxHeight: 50,
  },
  quickTimesRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  quickTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  quickTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  currentTimeDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentTimeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  currentTimeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  timeSelectorContainer: {
    marginBottom: 20,
  },
  timeColumnsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 200,
  },
  columnContainer: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnContent: {
    paddingVertical: 8,
  },
  timeItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimeItem: {
    backgroundColor: COLORS.selectedBg,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  selectedTimeText: {
    color: COLORS.selectedText,
    fontWeight: '600',
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  separatorText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
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
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});