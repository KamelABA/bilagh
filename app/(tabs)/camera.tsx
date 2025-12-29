import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <View style={styles.permissionContainer}>
                    <IconSymbol name="camera.fill" size={64} color={isDark ? '#667eea' : '#764ba2'} />
                    <Text style={[styles.permissionTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('camera.cameraPermissionRequired')}
                    </Text>
                    <Text style={[styles.permissionText, { color: isDark ? '#999' : '#666' }]}>
                        {t('camera.cameraPermissionText')}
                    </Text>
                    <TouchableOpacity onPress={requestPermission}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.permissionButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.permissionButtonText}>{t('camera.grantPermission')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (photo) {
                    setCapturedImage(photo.uri);
                }
            } catch (error) {
                Alert.alert(t('common.error'), t('camera.failedToTakePicture'));
            }
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setCapturedImage(result.assets[0].uri);
        }
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const submitReport = () => {
        // Save photo globally and navigate to reports
        (global as any).capturedPhotoUri = capturedImage;
        router.push('/reports');
        setCapturedImage(null);
    };

    if (capturedImage) {
        return (
            <View style={styles.container}>
                <Image source={{ uri: capturedImage }} style={styles.preview} />
                <View style={styles.previewControls}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.controlButton}>
                        <LinearGradient
                            colors={['#FF6B6B', '#FF8E53']}
                            style={styles.controlButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="arrow.counterclockwise" size={24} color="#fff" />
                            <Text style={styles.controlButtonText}>{t('camera.retake')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={submitReport} style={styles.controlButton}>
                        <LinearGradient
                            colors={['#4ECDC4', '#44A08D']}
                            style={styles.controlButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                            <Text style={styles.controlButtonText}>{t('camera.submit')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerText}>{t('camera.reportRoadDamage')}</Text>
                </View>

                {/* Camera Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                        <View style={styles.iconButtonInner}>
                            <IconSymbol name="photo.fill" size={28} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                        <View style={styles.captureButtonInner} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                        <View style={styles.iconButtonInner}>
                            <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Tips */}
                <View style={styles.tipsContainer}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
                        style={styles.tipCard}
                    >
                        <IconSymbol name="lightbulb.fill" size={20} color="#FFE66D" />
                        <Text style={styles.tipText}>
                            {t('camera.cameraTip')}
                        </Text>
                    </LinearGradient>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    permissionButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    headerText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconButton: {
        width: 60,
        height: 60,
    },
    iconButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
    },
    tipsContainer: {
        position: 'absolute',
        top: 140,
        left: 20,
        right: 20,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    tipText: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
    },
    preview: {
        flex: 1,
        width: width,
        height: height,
    },
    previewControls: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    controlButton: {
        flex: 1,
        marginHorizontal: 8,
    },
    controlButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    controlButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
