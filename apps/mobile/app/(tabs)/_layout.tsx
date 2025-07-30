import { Tabs, router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { ScanResetProvider, useScanReset } from '../../src/contexts/ScanResetContext';

const colors = {
  yellow: '#FFC700',
  dark: '#1F2937',
  grayLight: '#F9FAFB',
  white: '#FFFFFF',
  gray500: '#6B7280',
};

const styles = StyleSheet.create({
  bottomNav: {
    backgroundColor: colors.dark,
    height: 80,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    // position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Shadow equivalent for React Native
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, // For Android
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  scanButtonContainer: {
    transform: [{ translateY: -20 }], // Equivalent to -translate-y-8 (approx 32px)
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonCircle: {
    width: 64, // w-20 in tailwind is 80px, but 64px looks better for a circle
    height: 64,
    backgroundColor: colors.yellow,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});

function TabContent() {
  const { resetScan } = useScanReset();

  return (
    <Tabs
      initialRouteName='scan/index'
      screenOptions={{
        headerShown: false, // Hide default header
        tabBarStyle: styles.bottomNav,
        tabBarActiveTintColor: colors.yellow, // beezly-yellow-text
        tabBarInactiveTintColor: colors.white, // text-white
        tabBarShowLabel: false, // We'll render custom labels
      }}>
      <Tabs.Screen
        name="search/index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabButton}>
              <FontAwesome name="trophy" size={24} color={color} />
              <Text style={[styles.tabLabel, { color: color }]}>Search</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan/index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanButtonContainer}>
              <View style={styles.scanButtonCircle}>
                <FontAwesome name="barcode" size={32} color={colors.dark} />
              </View>
            </View>
          )
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default action to handle navigation manually
            e.preventDefault();
            // Navigate to the scan tab
            router.navigate('/scan');
            // Trigger scan reset via context
            resetScan();
          },
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabButton}>
              <FontAwesome name="home" size={24} color={color} />
              <Text style={[styles.tabLabel, { color: color }]}>Profile</Text>
            </View>
          ),

        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <ScanResetProvider>
      <TabContent />
    </ScanResetProvider>
  );
}