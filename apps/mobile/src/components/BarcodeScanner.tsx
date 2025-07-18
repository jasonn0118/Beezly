import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Animated, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

export default function ScanScreen({ onScanSuccess }: { onScanSuccess: (data: { type: string; data: string }) => void }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanStatus, setScanStatus] = useState('Searching for barcode...');
    const scanAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // This effect runs when the screen becomes active
        setScanned(false);
        Animated.loop(
            Animated.timing(scanAnimation, { toValue: 1, duration: 2500, useNativeDriver: true })
        ).start();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return; // Prevent multiple scans

        setScanned(true);
        setScanStatus('Scan Complete!');
        
        // Wait a moment before navigating
        setTimeout(() => {
            onScanSuccess({ type, data });
        }, 800);
    };

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>We need your permission to show the camera.</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

    const animatedScanLineStyle = {
        transform: [
            {
                translateY: scanAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, height * 0.25],
                }),
            },
        ],
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["code39", "ean8", "ean13", "codabar", "itf14", "code128", "upc_a", "upc_e"] }}
            >
                <View style={styles.overlay}>
                    {/* Status Message at the top */}
                    <View style={styles.topMessageContainer}>
                         <Text style={[styles.statusText, scanned && styles.statusTextSuccess]}>
                            {scanStatus}
                         </Text>
                    </View>

                    {/* Scan Frame in the center */}
                    <View style={styles.scanFrame}>
                        <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />
                    </View>
                    
                    {/* Empty view to balance layout */}
                    <View style={{ flex: 1 }} />
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    topMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        shadowColor: '#FFC107',
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionText: {
        fontSize: 18,
        marginBottom: 20,
    },
});
