import PredictionFeedbackModal, { FeedbackSubmission } from '@/components/PredictionFeedbackModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { apiService, PredictionResult } from '@/services/api';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface PredictionDisplayProps {
    result: PredictionResult;
    imageUri: string;
    onClose: () => void;
    onProceedToReport: () => void;
    onFeedback: (feedback: FeedbackSubmission) => void;
    isDark: boolean;
    t: (key: string) => string;
    isArabic: boolean;
}

function PredictionDisplay({ result, imageUri, onClose, onProceedToReport, onFeedback, isDark, t, isArabic }: PredictionDisplayProps) {
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const getSeverityColor = (severity: string): [string, string] => {
        switch (severity) {
            case 'high': return ['#FF416C', '#FF4B2B'];
            case 'medium': return ['#F7971E', '#FFD200'];
            case 'low': return ['#56ab2f', '#a8e063'];
            default: return ['#667eea', '#764ba2'];
        }
    };

    const getSeverityColorFromScore = (score: number): string => {
        if (score >= 0.66) return '#FF0000';  // Red
        if (score >= 0.33) return '#FFFF00';  // Yellow
        return '#00FF00';  // Green
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high': return 'exclamationmark.triangle.fill';
            case 'medium': return 'exclamationmark.circle.fill';
            case 'low': return 'info.circle.fill';
            default: return 'checkmark.circle.fill';
        }
    };

    // Use severity_score from backend (0-1 scale based on area ratio)
    const severityScore = result.severity_score ?? result.confidence;
    const severityPercent = Math.round(severityScore * 100);
    const confidencePercent = Math.round(result.confidence * 100);
    const boundingBoxColor = result.color ?? getSeverityColorFromScore(severityScore);

    return (
        <ScrollView
            style={[styles.resultScrollView, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Image with Bounding Box */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="contain" />

                {result.detected && (
                    <>
                        {/* Bounding Box Overlay */}
                        <View style={[styles.boundingBox, { borderColor: boundingBoxColor }]}>
                            {/* Corner markers */}
                            <View style={[styles.cornerTL, { backgroundColor: boundingBoxColor }]} />
                            <View style={[styles.cornerTR, { backgroundColor: boundingBoxColor }]} />
                            <View style={[styles.cornerBL, { backgroundColor: boundingBoxColor }]} />
                            <View style={[styles.cornerBR, { backgroundColor: boundingBoxColor }]} />
                        </View>

                        {/* Label Badge on Image */}
                        <View style={[styles.imageLabelBadge, { backgroundColor: boundingBoxColor }]}>
                            <Text style={styles.imageLabelText}>
                                {isArabic ? result.damage_label_ar : result.damage_label}
                            </Text>
                            <Text style={styles.imageConfidenceText}>
                                | Severity: {severityScore.toFixed(2)}
                            </Text>
                        </View>
                    </>
                )}

                {!result.detected && (
                    <View style={styles.noDetectionOverlay}>
                        <LinearGradient
                            colors={['rgba(78, 205, 196, 0.9)', 'rgba(68, 160, 141, 0.9)']}
                            style={styles.noDetectionBadge}
                        >
                            <IconSymbol name="checkmark.circle.fill" size={32} color="#fff" />
                            <Text style={styles.noDetectionBadgeText}>{t('camera.roadIsGood')}</Text>
                        </LinearGradient>
                    </View>
                )}
            </View>

            {/* Feedback Button - Right after image */}
            <TouchableOpacity
                style={[
                    styles.feedbackButton,
                    {
                        backgroundColor: isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.08)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(102, 126, 234, 0.4)' : 'rgba(102, 126, 234, 0.3)',
                    }
                ]}
                onPress={() => setShowFeedbackModal(true)}
            >
                <IconSymbol name="hand.thumbsdown.fill" size={20} color="#667eea" />
                <Text style={[styles.feedbackButtonText, { color: '#667eea' }]}>
                    {t('feedback.title')}
                </Text>
                <IconSymbol name="chevron.right" size={16} color="#667eea" />
            </TouchableOpacity>

            {/* Road Condition Card - Shows when no damage detected */}
            {!result.detected && (
                <View style={[styles.roadConditionCard, { backgroundColor: isDark ? 'rgba(78, 205, 196, 0.15)' : 'rgba(78, 205, 196, 0.1)' }]}>
                    <View style={styles.roadConditionHeader}>
                        <LinearGradient
                            colors={['#4ECDC4', '#44A08D']}
                            style={styles.roadConditionIcon}
                        >
                            <IconSymbol name="checkmark.shield.fill" size={28} color="#fff" />
                        </LinearGradient>
                        <View style={styles.roadConditionTextContainer}>
                            <Text style={[styles.roadConditionTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('camera.roadConditionGood')}
                            </Text>
                            <Text style={[styles.roadConditionSubtitle, { color: isDark ? '#999' : '#666' }]}>
                                {t('camera.confidenceScore')}: {result.confidence.toFixed(3)}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.roadConditionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                    <Text style={[styles.roadConditionMessage, { color: isDark ? '#aaa' : '#555' }]}>
                        {result.confidence < 0.1
                            ? t('camera.notRoadOrNoIssue')
                            : t('camera.roadInGoodCondition')}
                    </Text>

                    <View style={styles.roadConditionTips}>
                        <View style={styles.tipItem}>
                            <IconSymbol name="camera.fill" size={16} color="#4ECDC4" />
                            <Text style={[styles.tipItemText, { color: isDark ? '#999' : '#666' }]}>
                                {t('camera.tipClearPhoto')}
                            </Text>
                        </View>
                        <View style={styles.tipItem}>
                            <IconSymbol name="sun.max.fill" size={16} color="#4ECDC4" />
                            <Text style={[styles.tipItemText, { color: isDark ? '#999' : '#666' }]}>
                                {t('camera.tipGoodLighting')}
                            </Text>
                        </View>
                        <View style={styles.tipItem}>
                            <IconSymbol name="road.lanes" size={16} color="#4ECDC4" />
                            <Text style={[styles.tipItemText, { color: isDark ? '#999' : '#666' }]}>
                                {t('camera.tipFocusOnDamage')}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Severity Scale (0-1) */}
            <View style={[styles.severityScaleCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.severityScaleTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('camera.severityScale')}
                </Text>

                <View style={styles.severityScaleContainer}>
                    {/* Scale Labels */}
                    <View style={styles.scaleLabels}>
                        <Text style={[styles.scaleLabel, { color: isDark ? '#999' : '#666' }]}>0</Text>
                        <Text style={[styles.scaleLabel, { color: isDark ? '#999' : '#666' }]}>0.33</Text>
                        <Text style={[styles.scaleLabel, { color: isDark ? '#999' : '#666' }]}>0.66</Text>
                        <Text style={[styles.scaleLabel, { color: isDark ? '#999' : '#666' }]}>1</Text>
                    </View>

                    {/* Gradient Scale Bar */}
                    <View style={styles.scaleBarContainer}>
                        <LinearGradient
                            colors={['#00FF00', '#FFFF00', '#FF0000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.scaleBar}
                        />

                        {/* Current Value Indicator */}
                        <View style={[styles.scaleIndicator, { left: `${Math.min(severityScore * 100, 100)}%` }]}>
                            <View style={[styles.indicatorLine, { backgroundColor: isDark ? '#fff' : '#000' }]} />
                            <View style={[styles.indicatorDot, { backgroundColor: boundingBoxColor, borderColor: isDark ? '#fff' : '#000' }]} />
                        </View>
                    </View>

                    {/* Threshold Labels */}
                    <View style={styles.thresholdLabels}>
                        <Text style={[styles.thresholdLabel, { color: '#00FF00' }]}>{t('reports.low')}</Text>
                        <Text style={[styles.thresholdLabel, { color: '#FFFF00' }]}>{t('reports.medium')}</Text>
                        <Text style={[styles.thresholdLabel, { color: '#FF0000' }]}>{t('reports.high')}</Text>
                    </View>
                </View>

                {/* Current Score Display */}
                <View style={styles.scoreDisplay}>
                    <Text style={[styles.scoreLabel, { color: isDark ? '#999' : '#666' }]}>{t('camera.severity')}:</Text>
                    <Text style={[styles.scoreValue, { color: boundingBoxColor }]}>
                        {severityScore.toFixed(2)}
                    </Text>
                </View>
            </View>

            {/* Detection Details */}
            {result.detected && (
                <View style={[styles.detailsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={styles.detailHeader}>
                        <LinearGradient
                            colors={getSeverityColor(result.severity)}
                            style={styles.detailIconContainer}
                        >
                            <IconSymbol
                                name={getSeverityIcon(result.severity)}
                                size={24}
                                color="#fff"
                            />
                        </LinearGradient>
                        <View style={styles.detailHeaderText}>
                            <Text style={[styles.detailTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {isArabic ? result.damage_label_ar : result.damage_label}
                            </Text>
                            <Text style={[styles.detailSubtitle, { color: isDark ? '#999' : '#666' }]}>
                                {result.damage_type}
                            </Text>
                        </View>
                        <View style={styles.severityBadgeContainer}>
                            <LinearGradient
                                colors={getSeverityColor(result.severity)}
                                style={styles.severityBadge}
                            >
                                <Text style={styles.severityBadgeText}>
                                    {t(`reports.${result.severity}`)}
                                </Text>
                            </LinearGradient>
                        </View>
                    </View>

                    <View style={styles.separator} />

                    {/* Confidence Bar */}
                    <View style={styles.confidenceRow}>
                        <Text style={[styles.confidenceLabel, { color: isDark ? '#999' : '#666' }]}>
                            {t('camera.confidence')}
                        </Text>
                        <View style={styles.confidenceBarWrapper}>
                            <View style={[styles.confidenceBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <LinearGradient
                                    colors={getSeverityColor(result.severity)}
                                    style={[styles.confidenceBarFill, { width: `${confidencePercent}%` }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                            <Text style={[styles.confidenceValue, { color: isDark ? '#fff' : '#000' }]}>
                                {confidencePercent}%
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* All Predictions */}
            {result.all_predictions && result.all_predictions.length > 0 && (
                <View style={[styles.allPredictionsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <Text style={[styles.allPredictionsTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('camera.allPredictions')}
                    </Text>
                    {result.all_predictions.slice(0, 4).map((pred, index) => (
                        <View key={index} style={styles.predictionItem}>
                            <View style={styles.predictionLabelRow}>
                                <Text style={[styles.predictionLabel, { color: isDark ? '#ccc' : '#333' }]}>
                                    {pred.label}
                                </Text>
                                <Text style={[styles.predictionScore, { color: isDark ? '#999' : '#666' }]}>
                                    {pred.confidence.toFixed(3)}
                                </Text>
                            </View>
                            <View style={styles.predictionBarContainer}>
                                <View style={[styles.predictionBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <View
                                        style={[
                                            styles.predictionBarFill,
                                            {
                                                width: `${Math.max(pred.confidence * 100, 2)}%`,
                                                backgroundColor: index === 0 ? getSeverityColorFromScore(pred.severity ?? pred.confidence) : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Message */}
            <Text style={[styles.messageText, { color: isDark ? '#999' : '#666' }]}>
                {result.message}
            </Text>

            {/* Actions */}
            <View style={styles.resultActions}>
                <TouchableOpacity onPress={onClose} style={styles.resultActionButton}>
                    <View style={[styles.secondaryButton, { borderColor: isDark ? '#444' : '#ddd' }]}>
                        <IconSymbol name="arrow.counterclockwise" size={20} color={isDark ? '#fff' : '#000'} />
                        <Text style={[styles.secondaryButtonText, { color: isDark ? '#fff' : '#000' }]}>
                            {t('camera.retake')}
                        </Text>
                    </View>
                </TouchableOpacity>

                {result.detected && (
                    <TouchableOpacity onPress={onProceedToReport} style={styles.resultActionButton}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.primaryButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="doc.text.fill" size={20} color="#fff" />
                            <Text style={styles.primaryButtonText}>{t('camera.createReport')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Feedback Modal */}
            <PredictionFeedbackModal
                visible={showFeedbackModal}
                prediction={result}
                imageUri={imageUri}
                onClose={() => setShowFeedbackModal(false)}
                onSubmitFeedback={(feedback) => {
                    setShowFeedbackModal(false);
                    onFeedback(feedback);
                }}
            />
        </ScrollView>
    );
}

export default function CameraScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t, locale } = useTranslation();
    const isDark = colorScheme === 'dark';
    const isArabic = locale === 'ar';
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
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
                // Use lower quality to reduce file size for faster upload
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5, // 50% quality to reduce file size
                    skipProcessing: false,
                });
                if (photo) {
                    console.log('Camera - Photo captured:', photo.uri);
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
            quality: 0.5, // 50% quality to reduce file size for faster upload
        });

        if (!result.canceled) {
            console.log('Camera - Image picked:', result.assets[0].uri);
            setCapturedImage(result.assets[0].uri);
        }
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setPredictionResult(null);
        setIsAnalyzing(false);
    };

    const analyzeImage = async () => {
        if (!capturedImage) return;

        setIsAnalyzing(true);
        setPredictionResult(null);

        try {
            console.log('Camera Analysis - Starting prediction for:', capturedImage);
            const result = await apiService.predictDamage(capturedImage);
            console.log('Camera Analysis - Success:', result);
            setPredictionResult(result);
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Camera Analysis - Error:', errorMessage);

            // Determine error type and show helpful message
            let userMessage = '';
            if (errorMessage.includes('Network request failed') || errorMessage.includes('network')) {
                userMessage = `Cannot connect to server\n\nPossible causes:\n• Backend server not running\n• Phone and computer on different WiFi\n• Wrong IP address in app settings\n• Firewall blocking connection\n\nTechnical: ${errorMessage}`;
            } else if (errorMessage.includes('timeout')) {
                userMessage = `Connection timeout\n\nThe server took too long to respond.\n\nTry:\n• Check if backend is running\n• Restart the backend server\n\nTechnical: ${errorMessage}`;
            } else if (errorMessage.includes('500') || errorMessage.includes('Internal')) {
                userMessage = `Server error\n\nThe backend encountered an error processing the image.\n\nCheck backend terminal for details.\n\nTechnical: ${errorMessage}`;
            } else {
                userMessage = `Analysis failed\n\n${errorMessage}`;
            }

            Alert.alert(
                t('common.error'),
                userMessage,
                [{ text: t('common.done'), onPress: () => setIsAnalyzing(false) }]
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const proceedToReport = () => {
        // Save photo and prediction globally and navigate to reports
        (global as any).capturedPhotoUri = capturedImage;
        (global as any).predictionResult = predictionResult;
        router.push('/reports');
        setCapturedImage(null);
        setPredictionResult(null);
    };

    // Handle feedback submission
    const handleFeedbackSubmit = (feedback: FeedbackSubmission) => {
        console.log('📋 Feedback received:', feedback);
        // TODO: Send feedback to backend for model improvement
        Alert.alert(
            t('common.success'),
            'Thank you for your feedback! It will help improve our detection.',
            [{ text: t('common.done') }]
        );
    };

    // Show prediction result with image
    if (predictionResult && capturedImage) {
        return (
            <View style={styles.container}>
                <PredictionDisplay
                    result={predictionResult}
                    imageUri={capturedImage}
                    onClose={retakePhoto}
                    onProceedToReport={proceedToReport}
                    onFeedback={handleFeedbackSubmit}
                    isDark={isDark}
                    t={t}
                    isArabic={isArabic}
                />
            </View>
        );
    }

    // Show image preview with analyze button
    if (capturedImage) {
        return (
            <View style={styles.container}>
                <Image source={{ uri: capturedImage }} style={styles.preview} />

                {/* Analyzing Modal */}
                <Modal visible={isAnalyzing} transparent animationType="fade">
                    <View style={styles.analyzingOverlay}>
                        <View style={[styles.analyzingCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <ActivityIndicator size="large" color="#667eea" />
                            <Text style={[styles.analyzingText, { color: isDark ? '#fff' : '#000' }]}>
                                {t('camera.analyzing')}
                            </Text>
                            <Text style={[styles.analyzingSubtext, { color: isDark ? '#999' : '#666' }]}>
                                {t('camera.analyzingSubtext')}
                            </Text>
                        </View>
                    </View>
                </Modal>

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
                    <TouchableOpacity onPress={analyzeImage} style={styles.controlButton} disabled={isAnalyzing}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.controlButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="wand.and.stars" size={24} color="#fff" />
                            <Text style={styles.controlButtonText}>{t('camera.analyze')}</Text>
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
                        <Text style={styles.iconButtonLabel}>{t('camera.gallery')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                        <View style={styles.captureButtonInner} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                        <View style={styles.iconButtonInner}>
                            <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color="#fff" />
                        </View>
                        <Text style={styles.iconButtonLabel}>{t('camera.flip')}</Text>
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
        width: 70,
        alignItems: 'center',
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
    iconButtonLabel: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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
    // Analyzing Modal Styles
    analyzingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingCard: {
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        marginHorizontal: 40,
    },
    analyzingText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    analyzingSubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    // Result Display Styles
    resultScrollView: {
        flex: 1,
    },
    resultScrollContent: {
        paddingTop: 50,
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    // Image with Bounding Box
    imageContainer: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    resultImage: {
        width: '100%',
        height: '100%',
    },
    boundingBox: {
        position: 'absolute',
        top: '10%',
        left: '10%',
        right: '10%',
        bottom: '10%',
        borderWidth: 3,
        borderStyle: 'dashed',
        borderRadius: 8,
    },
    cornerTL: {
        position: 'absolute',
        top: -3,
        left: -3,
        width: 20,
        height: 20,
        borderTopLeftRadius: 8,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: 'inherit',
        backgroundColor: 'transparent',
    },
    cornerTR: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 20,
        height: 20,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        position: 'absolute',
        bottom: -3,
        left: -3,
        width: 20,
        height: 20,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        width: 20,
        height: 20,
        borderBottomRightRadius: 8,
    },
    imageLabelBadge: {
        position: 'absolute',
        top: '10%',
        left: '10%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: -30,
        marginLeft: -3,
    },
    imageLabelText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    imageConfidenceText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '600',
    },
    noDetectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDetectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
    },
    noDetectionBadgeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    // Road Condition Card (No Damage)
    roadConditionCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(78, 205, 196, 0.3)',
    },
    roadConditionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roadConditionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roadConditionTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    roadConditionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    roadConditionSubtitle: {
        fontSize: 13,
        marginTop: 4,
    },
    roadConditionDivider: {
        height: 1,
        marginVertical: 16,
    },
    roadConditionMessage: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 16,
    },
    roadConditionTips: {
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderRadius: 12,
        padding: 16,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    tipItemText: {
        fontSize: 13,
        marginLeft: 12,
        flex: 1,
    },
    // Severity Scale
    severityScaleCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    severityScaleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    severityScaleContainer: {
        marginBottom: 12,
    },
    scaleLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    scaleLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    scaleBarContainer: {
        height: 16,
        borderRadius: 8,
        overflow: 'visible',
        position: 'relative',
    },
    scaleBar: {
        height: 16,
        borderRadius: 8,
    },
    scaleIndicator: {
        position: 'absolute',
        top: -6,
        marginLeft: -8,
        alignItems: 'center',
    },
    indicatorLine: {
        width: 2,
        height: 28,
    },
    indicatorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        marginTop: -4,
    },
    thresholdLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 4,
    },
    thresholdLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    scoreDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128,128,128,0.2)',
    },
    scoreLabel: {
        fontSize: 14,
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Details Card
    detailsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    detailSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(128,128,128,0.2)',
        marginVertical: 16,
    },
    severityBadgeContainer: {},
    severityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    severityBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    confidenceRow: {
        marginTop: 4,
    },
    confidenceLabel: {
        fontSize: 13,
        marginBottom: 8,
    },
    confidenceBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    confidenceBarBg: {
        flex: 1,
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginRight: 12,
    },
    confidenceBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    confidenceValue: {
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 50,
        textAlign: 'right',
    },
    // All Predictions
    allPredictionsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    allPredictionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    predictionItem: {
        marginBottom: 14,
    },
    predictionLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    predictionLabel: {
        fontSize: 13,
    },
    predictionScore: {
        fontSize: 13,
        fontWeight: '600',
    },
    predictionBarContainer: {},
    predictionBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    predictionBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    messageText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    resultActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    resultActionButton: {
        flex: 1,
        marginHorizontal: 6,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    // Feedback Button
    feedbackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    feedbackButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
    },
});
