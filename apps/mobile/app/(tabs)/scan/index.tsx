import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Button, Animated, Dimensions, SafeAreaView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';


import { BarcodeType } from '@beezly/types/dto/barcode'; // Assuming this path is correct
import { useRouter } from 'expo-router';
import ReceiptScanResult from '../../../src/components/ReceiptScanResult'; // Assuming this path is correct
import { useAchievementTracking } from '../../../src/hooks/useAchievementTracking';
import { useAuth } from '../../../src/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function ScanPage() {
    const [currentView, setCurrentView] = useState<'barcodeScan' | 'receiptScan' | 'barcodeResult' | 'receiptResult'>('barcodeScan');
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { trackBarcodeScanned } = useAchievementTracking();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanStatus, setScanStatus] = useState('Searching for barcode...');
    const [scannedData, setScannedData] = useState<{ barcode: string; type: string } | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const scanAnimation = useRef(new Animated.Value(0)).current;

    // This effect resets the scanner state and restarts the animation whenever the tab is focused
    useFocusEffect(
        useCallback(() => {
            // Reset state and activate camera
            setCurrentView('barcodeScan');
            setScannedData(null);
            setPhotoUri(null);
            setScanStatus('Searching for barcode...');
            setIsCameraActive(true);

            // Reset and start animation
            scanAnimation.setValue(0);
            const animation = Animated.loop(
                Animated.timing(scanAnimation, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: true,
                })
            );
            animation.start();

            // Cleanup function when the screen is unfocused
            return () => {
                animation.stop();
                setIsCameraActive(false);
            };
        }, [scanAnimation])
    );

    // Called on barcode scan success -> switches view to the result component
    const handleBarcodeScanned = ({ data, type }: { data: string; type: string }) => {
        setScannedData({ barcode: data, type: type as BarcodeType });
        setScanStatus('Scan Complete!');
        setCurrentView('barcodeResult');
        
        // Note: Achievement tracking is now handled by the backend in useProductInfo hook
        // No need to call trackBarcodeScanned here to avoid duplicate notifications
    };

    useEffect(() => {
        if (currentView === 'barcodeResult' && scannedData) {
            router.push(`/product-detail?scannedData=${JSON.stringify(scannedData)}`);
        }
    }, [scannedData, currentView]);

    // Called on receipt capture success
    const handleReceiptCapture = async () => {
        if (cameraRef.current && isCameraActive) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log("Receipt captured!", photo.uri);
                setPhotoUri(photo.uri);
                setCurrentView('receiptResult');
                setIsCameraActive(false); // Deactivate camera when showing result
            } catch (error) {
                console.error("Failed to capture receipt:", error);
            }
        }
    };

    if (!permission) {
        return <View style={styles.permissionContainer}><Text>Requesting for camera permission...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>We need your permission to show the camera.</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

    const barcodeScanLineTranslation = scanAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, height * 0.25 - 4] // 4 is the height of the scanLine itself
    });

    const scanLineStyle = {
        transform: [
            { 
                translateY: scanAnimation.interpolate({ 
                    inputRange: [0, 1], 
                    outputRange: [0, height * 0.25] 
                }) 
            }
        ],
    };

    const handleScanAgain = () => {
        setCurrentView('barcodeScan');
        setScannedData(null);
        setPhotoUri(null);
        setIsCameraActive(true); // Reactivate camera when returning to scan
    };

    if (currentView === 'receiptResult') {
        return <ReceiptScanResult pictureData={photoUri} onScanAgain={handleScanAgain} />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {isCameraActive ? (
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    onBarcodeScanned={currentView === 'barcodeScan' ? handleBarcodeScanned : undefined}
                    barcodeScannerSettings={{
                        barcodeTypes: ["code39", "ean8", "ean13", "codabar", "itf14", "code128", "upc_a", "upc_e"],
                    }}
                />
            ) : (
                <View style={[styles.camera, styles.cameraPlaceholder]} />
            )}

            <SafeAreaView style={styles.overlay}>
                {/* Top switcher UI - Fixed position */}
                <View style={styles.switcherContainer}>
                    <TouchableOpacity
                        style={[styles.switchButton, currentView === 'barcodeScan' && styles.switchButtonActive]}
                        onPress={() => setCurrentView('barcodeScan')}
                    >
                        <Text style={[styles.switchButtonText, currentView === 'barcodeScan' && styles.switchButtonTextActive]}>
                            Barcode
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.switchButton, currentView === 'receiptScan' && styles.switchButtonActive]}
                        onPress={() => setCurrentView('receiptScan')}
                    >
                        <Text style={[styles.switchButtonText, currentView === 'receiptScan' && styles.switchButtonTextActive]}>
                            Receipt
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Conditional UI based on the scanner mode */}
                {currentView === 'barcodeScan' ? (
                    <>
                        <View style={styles.barcodeOverlayContent}>
                            <View style={styles.topMessageContainer}>
                                <Text style={[styles.statusText, styles.statusTextSuccess]}>
                                    {scanStatus}
                                </Text>
                            </View>
                            {/* scanFrame만 남기고 오버레이 제거 */}
                            <View style={styles.scanFrame}>
                                <Text style={styles.scanFrameText}>Align barcode within the frame</Text>
                                <Animated.View style={[styles.scanLine, scanLineStyle]} />
                            </View>
                        </View>
                    </>
                ) : ( // This is for 'receiptScan' view
                    <>
                        <View style={styles.receiptOverlayContent}>
                            <View style={styles.guidanceFrame}>
                                <Text style={styles.guidanceText}>Align receipt within the frame</Text>
                            </View>
                            <View style={styles.controlsContainer}>
                                <TouchableOpacity style={styles.captureButton} onPress={handleReceiptCapture}>
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        ...StyleSheet.absoluteFillObject, // Camera takes full screen
    },
    cameraPlaceholder: {
        backgroundColor: 'black',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between', // Distribute content vertically
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Handle Android status bar
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionText: {
        fontSize: 16,
        marginBottom: 10,
    },
    switcherContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(40,40,40,0.7)',
        borderRadius: 25,
        height: 44,
        padding: 4,
        zIndex: 10,
        marginTop: 20, // Add some top margin for visual appeal
    },
    switchButton: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 20,
    },
    switchButtonActive: {
        backgroundColor: '#FEFEFE',
    },
    switchButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    switchButtonTextActive: {
        color: '#111827',
    },
    // Barcode Scan UI Styles
    barcodeOverlayContent: {
        flex: 1, // Take remaining space
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: height * 0.15, // Push content up slightly
    },
    topMessageContainer: {
        marginBottom: 40,
    },
    statusText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    statusTextSuccess: {
        color: '#20c997', // Vibrant Teal for success
    },
    // Modified scanFrame - now just a visual guide
    scanFrame: {
        width: width * 0.8,
        height: height * 0.25,
        borderWidth: 8,
        borderColor: 'rgba(255, 255, 255, 0.5)', // Still visible border
        borderRadius: 24,
        overflow: 'hidden', // Still needed for scanLine animation
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent', // Ensure it's transparent to see camera through
    },
    scanFrameText: {
        position: 'absolute',
        top: -40, // Positioned above the frame
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        zIndex: 1, // Ensure text is above the scan line
    },
    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: '#FFC107',
        top: 0, // Starts at the top of the scan frame
    },
    // Receipt Scan UI Styles
    receiptOverlayContent: {
        flex: 1, // Take remaining space
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: height * 0.1, // Push content up slightly for button
    },
    guidanceFrame: {
        width: width * 0.9,
        height: height * 0.6,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        borderStyle: 'dashed',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent', // Ensure it's transparent
    },
    guidanceText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 10,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 60,
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: 'black',
    },
});