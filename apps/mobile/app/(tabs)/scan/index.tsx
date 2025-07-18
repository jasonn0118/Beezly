import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Button, Animated, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Import your components
import BarcordScanResult from '../../../src/components/BarcordScanResult';

const { width, height } = Dimensions.get('window');

export default function ScanPage() {
    // This state now controls everything: 'barcodeScan', 'receiptScan', 'barcodeResult'
    const [currentView, setCurrentView] = useState('barcodeScan');
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedData, setScannedData] = useState<{ type: string; data: string } | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const scanAnimation = useRef(new Animated.Value(0)).current;

    // This effect resets the view to the barcode scanner whenever the tab is focused
    useFocusEffect(
      useCallback(() => {
        setCurrentView('barcodeScan');
        setScannedData(null);
      }, [])
    );

    // Start the scan line animation
    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(scanAnimation, { toValue: 1, duration: 2500, useNativeDriver: true })
        );
        animation.start();
        return () => animation.stop(); // Clean up animation on unmount
    }, [scanAnimation]);

    // Called on barcode scan success -> switches view to the result component
    const handleBarcodeScanned = (data: { type: string; data: string }) => {
        setScannedData(data);
        setCurrentView('barcodeResult');
    };
    
    // Called on receipt capture success
    const handleReceiptCapture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log("Receipt captured!", photo.uri);
                // Here you would navigate to a ReceiptResultScreen
                // For now, we'll just log it.
            } catch (error) {
                console.error("Failed to capture receipt:", error);
            }
        }
    };

    // Called from the result screen to go back to scanning
    const handleScanAgain = () => {
        setCurrentView('barcodeScan');
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>We need your permission to show the camera.</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

    const scanLineStyle = {
        transform: [{ translateY: scanAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.25] }) }],
    };
    
    // If the view is a result screen, we don't need the camera.
    if (currentView === 'barcodeResult') {
        return <BarcordScanResult scannedData={scannedData} onScanAgain={handleScanAgain} />;
    }

    // Otherwise, show the camera and the scanner UI
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                onBarcodeScanned={currentView === 'barcodeScan' ? handleBarcodeScanned : undefined}
                barcodeScannerSettings={{
                    barcodeTypes: ["code39", "ean8", "ean13", "codabar", "itf14", "code128", "upc_a", "upc_e"],
                }}
            >
                <View style={styles.overlay}>
                    {/* Top switcher UI */}
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
                        <View style={styles.scanFrame}>
                            <Text style={styles.scanFrameText}>Align barcode within the frame</Text>
                            <Animated.View style={[styles.scanLine, scanLineStyle]} />
                        </View>
                    ) : ( // This is for 'receiptScan' view
                        <>
                            <View style={styles.guidanceFrame}>
                                <Text style={styles.guidanceText}>Align receipt within the frame</Text>
                            </View>
                            <View style={styles.controlsContainer}>
                                <TouchableOpacity style={styles.captureButton} onPress={handleReceiptCapture}>
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
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
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: 'rgba(40,40,40,0.7)',
        borderRadius: 25,
        height: 44,
        padding: 4,
        zIndex: 10,
    },
    switchButton: {
        flex: 1,
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
    // Barcode Styles
    scanFrame: {
        width: width * 0.8,
        height: height * 0.25,
        borderWidth: 8,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrameText: {
        position: 'absolute',
        top: -40, // Positioned above the frame
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: '#FFC107',
    },
    // Receipt Styles
    guidanceFrame: {
        width: width * 0.9,
        height: height * 0.6,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        borderStyle: 'dashed',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
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
    topMessageContainer: {
        position: 'absolute',
        top: 0,
        width: '100%',
        alignItems: 'center',
        paddingTop: 20,
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
});
