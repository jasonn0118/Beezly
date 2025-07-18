import React, { useRef } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

export default function ReceiptScanner({ onCapture }: { onCapture: () => void }) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    // 사진 촬영을 처리하는 함수
    const handleCapture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log('사진 촬영 성공:', photo.uri);
                // 촬영 성공 후 콜백 함수를 호출합니다.
                onCapture();
            } catch (error) {
                console.error('사진 촬영 실패:', error);
            }
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text>카메라 권한이 필요합니다.</Text>
                <Button onPress={requestPermission} title="권한 요청" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef}>
                <View style={styles.overlay}>
                    {/* 안내 프레임 */}
                    <View style={styles.guidanceFrame}>
                        <Text style={styles.guidanceText}>프레임 안에 영수증을 맞춰주세요</Text>
                    </View>
                    {/* 하단 컨트롤 영역 */}
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
        paddingTop: '30%', // 상단 여백
        paddingBottom: '15%', // 하단 여백
    },
    guidanceFrame: {
        width: width * 0.9,
        flex: 1, // 남은 공간을 모두 차지
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
        bottom: 60, // 하단에서의 위치
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
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
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
