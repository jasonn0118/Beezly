import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';

export default function ProfileEditPage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  
  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isLoading, setIsLoading] = useState(false);

  // Track if there are unsaved changes
  const hasChanges = 
    firstName !== (user?.firstName || '') || 
    lastName !== (user?.lastName || '');

  const handleSave = async () => {
    if (!hasChanges) {
      Alert.alert('No Changes', 'No changes to save.');
      return;
    }

    try {
      setIsLoading(true);
      
      await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Continue Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* User Info Header */}
          <View style={styles.userHeader}>
            <Ionicons name="person-circle" size={80} color="#FFC107" />
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                returnKeyType="done"
                editable={!isLoading}
              />
            </View>

            {/* Current Display Name Preview */}
            <View style={styles.previewGroup}>
              <Text style={styles.previewLabel}>Display Name Preview:</Text>
              <Text style={styles.previewText}>
                {firstName.trim() || lastName.trim()
                  ? `${firstName.trim()} ${lastName.trim()}`.trim()
                  : user?.email || 'No name set'}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
            onPress={handleCancel}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#212529" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  userHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  previewGroup: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
});