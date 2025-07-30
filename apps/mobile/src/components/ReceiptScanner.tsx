import React, { useRef } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ReceiptScanner({ onCapture }: { onCapture: () => void }) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    const handleCapture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log('Photo captured:', photo.uri);
                onCapture();
            } catch (error) {
                console.error('Failed to take picture:', error);
            }
        }
    };

    if (!permission || !permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Button onPress={requestPermission} title="Grant Camera Permission" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef}>
                <View style={styles.overlay}>
                    {/* Top guidance text */}
                    <View style={styles.topGuidance}>
                        <Text style={styles.guidanceText}>Fit the receipt to the screen</Text>
                    </View>

                    {/* Larger capture area */}
                    <View style={styles.captureArea} />

                    {/* Bottom controls with shutter button */}
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topGuidance: {
        marginTop: 140, // Space for the top switcher
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    guidanceText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    captureArea: {
        width: width * 0.9, // 90% of screen width
        height: '60%', // 60% of screen height
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        borderStyle: 'dashed',
        borderRadius: 24,
        position: 'absolute', // Position in the center
        top: '20%',
    },
    controlsContainer: {
        width: '100%',
        paddingBottom: 60,
        alignItems: 'center',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: 'black',
    },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
