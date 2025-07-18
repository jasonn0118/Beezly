import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Button, Animated, Dimensions } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ScanPage() {
    // This state controls which scanner is active: 'barcode' or 'receipt'
    const [scannerMode, setScannerMode] = useState('barcode');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const scanAnimation = useRef(new Animated.Value(0)).current;

    // This effect resets the view to the barcode scanner whenever the tab is focused
    useFocusEffect(
      useCallback(() => {
        setScannerMode('barcode');
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

    // Called on barcode scan success -> navigates to the result page
    const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
        router.push({
            pathname: "../../src/components/BarcordScanResult",
            params: { type, data }
        });
    };
    
    // Called on receipt capture success -> navigates to the result page
    const handleReceiptCapture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log("Receipt captured!", photo.uri);
                router.push({
                    pathname: "/scan/result",
                    params: { type: 'receipt', data: photo.uri }
                });
            } catch (error) {
                console.error("Failed to capture receipt:", error);
            }
        }
    };

    if (!permission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                // Only enable barcode scanning when in barcode mode
                onBarcodeScanned={scannerMode === 'barcode' ? handleBarcodeScanned : undefined}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "code128"],
                }}
            >
                <View style={styles.overlay}>
                    {/* Top switcher UI */}
                    <View style={styles.switcherContainer}>
                        <TouchableOpacity
                            style={[styles.switchButton, scannerMode === 'barcode' && styles.switchButtonActive]}
                            onPress={() => setScannerMode('barcode')}
                        >
                            <Text style={[styles.switchButtonText, scannerMode === 'barcode' && styles.switchButtonTextActive]}>
                                Barcode
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.switchButton, scannerMode === 'receipt' && styles.switchButtonActive]}
                            onPress={() => setScannerMode('receipt')}
                        >
                            <Text style={[styles.switchButtonText, scannerMode === 'receipt' && styles.switchButtonTextActive]}>
                                Receipt
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Conditional UI based on the scanner mode */}
                    {scannerMode === 'barcode' ? (
                        <View style={styles.scanFrame}>
                            <Animated.View style={[styles.scanLine, scanLineStyle]} />
                        </View>
                    ) : (
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
    },
    scanLine: {
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
});
