import React, { useState, useCallback, useEffect  } from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ScanScreen from '../../../src/components/BarcodeScanner';
import ScanResultScreen from '../../../src/components/ScanResultScreen';
import { useScanReset } from '../../../src/contexts/ScanResetContext';

export default function ScanPage() {
    // 'scan' 또는 'result' 중 현재 보여줄 뷰를 관리하는 상태
    const [currentView, setCurrentView] = useState('scan');
    const [scannedData, setScannedData] = useState<{ type: string; data: string } | null>(null);

    const { resetTrigger } = useScanReset();

    useEffect(() => {
      console.log('ScanPage: resetTrigger changed to', resetTrigger);
      setCurrentView('scan');
      setScannedData(null);
    }, [resetTrigger]);

    useFocusEffect(
      useCallback(() => {
        console.log('ScanPage: useFocusEffect triggered.');
        // This will still run when the tab gains focus from another tab
        // but the useEffect for resetKey handles the re-press on the same tab.
      }, [])
    );

    // ScanScreen에서 스캔 성공 시 호출될 함수
    const handleScanSuccess = (data: { type: string; data: string }) => {
        setScannedData(data);
        setCurrentView('result'); // 결과 뷰로 전환
    };

    // ScanResultScreen에서 '다시 스캔' 시 호출될 함수
    const handleScanAgain = () => {
        setScannedData(null);
        setCurrentView('scan'); // 스캔 뷰로 전환
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {currentView === 'scan' ? (
                <ScanScreen onScanSuccess={handleScanSuccess} />
            ) : (
                <ScanResultScreen scannedData={scannedData} onScanAgain={handleScanAgain} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});