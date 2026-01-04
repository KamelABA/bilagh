import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ReportUser {
    id: number;
    full_name: string | null;
    email: string;
    phone: string | null;
}

interface VerificationReport {
    id: number;
    type: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    severity: 'low' | 'medium' | 'high';
    status: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    user_id: number;
    user: ReportUser;
}

export default function VerificationScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const router = useRouter();
    const isDark = colorScheme === 'dark';
    const cameraRef = useRef<CameraView>(null);

    const [permission, requestPermission] = useCameraPermissions();
    const [currentStep, setCurrentStep] = useState<'list' | 'verify' | 'camera' | 'submit'>('list');
    const [selectedReport, setSelectedReport] = useState<VerificationReport | null>(null);
    const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<'confirmed' | 'not_found' | 'resolved' | null>(null);

    // API states
    const [reports, setReports] = useState<VerificationReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch reports from API
    const fetchReports = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_ENDPOINTS.AGENT_REPORTS}?status=pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setReports(data);
            } else {
                console.error('Failed to fetch reports');
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReports();
    }, [fetchReports]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getReporterName = (user: ReportUser) => {
        return user.full_name || user.email.split('@')[0];
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#FF4B2B';
            case 'medium': return '#FFD200';
            case 'low': return '#4ECDC4';
            default: return '#999';
        }
    };

    const handleSelectReport = (report: VerificationReport) => {
        setSelectedReport(report);
        setCurrentStep('verify');
    };

    const openInMaps = (lat: number, lng: number, label?: string) => {
        // Store the location globally so the map can center on it
        (global as any).mapTargetLocation = {
            latitude: lat,
            longitude: lng,
            label: label || 'Report Location',
        };
        // Navigate to the agent map screen
        router.push('/(agent)/map');
    };

    const handleStartCamera = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(t('common.error'), t('camera.cameraPermissionRequired'));
                return;
            }
        }
        setCurrentStep('camera');
    };

    const handleTakePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (photo) {
                    setVerificationPhoto(photo.uri);
                    setCurrentStep('submit');
                }
            } catch (error) {
                Alert.alert(t('common.error'), t('camera.failedToTakePicture'));
            }
        }
    };

    const handleSubmitVerification = async () => {
        if (!verificationStatus) {
            Alert.alert(t('common.error'), t('agent.selectStatus'));
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token || !selectedReport) return;

            // Map verification status to report status
            let newStatus = 'pending';
            if (verificationStatus === 'confirmed') {
                newStatus = 'verified';
            } else if (verificationStatus === 'not_found') {
                newStatus = 'rejected';
            } else if (verificationStatus === 'resolved') {
                newStatus = 'resolved';
            }

            // Update report status via API
            const response = await fetch(API_ENDPOINTS.AGENT_VERIFY_REPORT(selectedReport.id), {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                }),
            });

            if (response.ok) {
                Alert.alert(
                    t('common.success'),
                    t('agent.verificationSubmitted'),
                    [
                        {
                            text: t('common.done'),
                            onPress: () => {
                                setCurrentStep('list');
                                setSelectedReport(null);
                                setVerificationPhoto(null);
                                setNotes('');
                                setVerificationStatus(null);
                                fetchReports(); // Refresh the list
                            },
                        },
                    ]
                );
            } else {
                const errorData = await response.text();
                Alert.alert(
                    t('common.error'),
                    `${t('agent.verificationFailed')}\n\nStatus: ${response.status}\nDetails: ${errorData}`
                );
            }
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                `${t('agent.verificationFailed')}\n\nError: ${error?.message || String(error)}`
            );
        }
    };

    // List View
    if (currentStep === 'list') {
        if (loading) {
            return (
                <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 16 }}>{t('common.loading')}</Text>
                </View>
            );
        }

        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('agent.onsiteVerification')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: isDark ? '#999' : '#666' }]}>
                        {reports.length} {t('reports.pending')} {t('reports.reports').toLowerCase()}
                    </Text>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
                    }
                >
                    {reports.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <IconSymbol name="checkmark.circle.fill" size={60} color="#4ECDC4" />
                            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('agent.allCaughtUp')}
                            </Text>
                            <Text style={[styles.emptyText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.noReportsToVerify')}
                            </Text>
                        </View>
                    ) : (
                        reports.map((report) => (
                            <TouchableOpacity
                                key={report.id}
                                style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                                onPress={() => handleSelectReport(report)}
                            >
                                {/* Thumbnail if image exists */}
                                {report.image_url && (
                                    <Image
                                        source={{ uri: report.image_url }}
                                        style={styles.reportThumbnail}
                                    />
                                )}
                                <View style={[styles.reportSeverity, { backgroundColor: getSeverityColor(report.severity) }]} />
                                <View style={styles.reportContent}>
                                    <View style={styles.reportHeader}>
                                        <Text style={[styles.reportType, { color: isDark ? '#fff' : '#000' }]}>
                                            {report.type}
                                        </Text>
                                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) + '20' }]}>
                                            <Text style={[styles.severityText, { color: getSeverityColor(report.severity) }]}>
                                                {report.severity.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.reportLocation, { color: isDark ? '#999' : '#666' }]}>
                                        {report.location}
                                    </Text>
                                    {report.description && (
                                        <Text style={[styles.reportDescription, { color: isDark ? '#777' : '#888' }]} numberOfLines={2}>
                                            {report.description}
                                        </Text>
                                    )}
                                    <View style={styles.reportMeta}>
                                        <Text style={[styles.reportMetaText, { color: isDark ? '#666' : '#999' }]}>
                                            {t('agent.reportedBy')}: {getReporterName(report.user)}
                                        </Text>
                                        <Text style={[styles.reportMetaText, { color: isDark ? '#666' : '#999' }]}>
                                            {formatDate(report.created_at)}
                                        </Text>
                                    </View>
                                    {report.user.phone && (
                                        <Text style={[styles.reportPhone, { color: '#667eea' }]}>
                                            📞 {report.user.phone}
                                        </Text>
                                    )}
                                </View>
                                <IconSymbol name="chevron.right" size={20} color={isDark ? '#666' : '#999'} />
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    }

    // Verify View
    if (currentStep === 'verify' && selectedReport) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <TouchableOpacity onPress={() => setCurrentStep('list')} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color="#667eea" />
                        <Text style={styles.backText}>{t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('agent.verifyReport')}
                    </Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Report Details */}
                    <View style={[styles.detailCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <View style={styles.detailHeader}>
                            <Text style={[styles.detailTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {selectedReport.type}
                            </Text>
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedReport.severity) + '20' }]}>
                                <Text style={[styles.severityText, { color: getSeverityColor(selectedReport.severity) }]}>
                                    {selectedReport.severity.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <IconSymbol name="location.fill" size={16} color="#667eea" />
                            <Text style={[styles.detailText, { color: isDark ? '#999' : '#666' }]}>
                                {selectedReport.location}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <IconSymbol name="person.fill" size={16} color="#667eea" />
                            <Text style={[styles.detailText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.reportedBy')}: {getReporterName(selectedReport.user)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <IconSymbol name="envelope.fill" size={16} color="#667eea" />
                            <Text style={[styles.detailText, { color: isDark ? '#999' : '#666' }]}>
                                {selectedReport.user.email}
                            </Text>
                        </View>

                        {selectedReport.user.phone && (
                            <View style={styles.detailRow}>
                                <IconSymbol name="phone.fill" size={16} color="#667eea" />
                                <Text style={[styles.detailText, { color: isDark ? '#999' : '#666' }]}>
                                    {selectedReport.user.phone}
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <IconSymbol name="clock.fill" size={16} color="#667eea" />
                            <Text style={[styles.detailText, { color: isDark ? '#999' : '#666' }]}>
                                {formatDate(selectedReport.created_at)}
                            </Text>
                        </View>

                        {selectedReport.description && (
                            <View style={[styles.descriptionBox, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                                <Text style={[styles.descriptionLabel, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('reports.description')}:
                                </Text>
                                <Text style={[styles.descriptionText, { color: isDark ? '#999' : '#666' }]}>
                                    {selectedReport.description}
                                </Text>
                            </View>
                        )}

                        {/* User's Photo */}
                        {selectedReport.image_url && (
                            <View style={styles.photoSection}>
                                <Text style={[styles.photoSectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('agent.reportedPhoto')}
                                </Text>
                                <View style={[styles.reportPhotoContainer, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                                    <Image
                                        source={{ uri: selectedReport.image_url }}
                                        style={styles.reportPhoto}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.aiDetectionBadge}>
                                        <LinearGradient
                                            colors={['#667eea', '#764ba2']}
                                            style={styles.aiDetectionGradient}
                                        >
                                            <Text style={styles.aiDetectionText}>
                                                🤖 {t('agent.aiDetected')}: {selectedReport.type}
                                            </Text>
                                            <Text style={styles.aiSeverityText}>
                                                {t('reports.severity')}: {t(`reports.${selectedReport.severity}`)}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Coordinates - Clickable to open in Maps */}
                        {selectedReport.latitude && selectedReport.longitude && (
                            <TouchableOpacity
                                onPress={() => openInMaps(
                                    selectedReport.latitude!,
                                    selectedReport.longitude!,
                                    `${selectedReport.type} - ${selectedReport.location}`
                                )}
                                style={[styles.coordsSection, { backgroundColor: isDark ? '#0a0a0a' : '#e8f4f8' }]}
                                activeOpacity={0.7}
                            >
                                <IconSymbol name="mappin.circle.fill" size={16} color="#4ECDC4" />
                                <Text style={[styles.coordsText, { color: isDark ? '#999' : '#666' }]}>
                                    📍 {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                                </Text>
                                <View style={styles.openMapBadge}>
                                    <Text style={styles.openMapText}>{t('agent.openInMaps')}</Text>
                                    <IconSymbol name="chevron.right" size={12} color="#4ECDC4" />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Instructions */}
                    <View style={[styles.instructionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <Text style={[styles.instructionTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.instructions')}
                        </Text>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionNumber}>
                                <Text style={styles.instructionNumberText}>1</Text>
                            </View>
                            <Text style={[styles.instructionText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.instruction1')}
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionNumber}>
                                <Text style={styles.instructionNumberText}>2</Text>
                            </View>
                            <Text style={[styles.instructionText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.instruction2')}
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <View style={styles.instructionNumber}>
                                <Text style={styles.instructionNumberText}>3</Text>
                            </View>
                            <Text style={[styles.instructionText, { color: isDark ? '#999' : '#666' }]}>
                                {t('agent.instruction3')}
                            </Text>
                        </View>
                    </View>

                    {/* Start Verification Button */}
                    <TouchableOpacity onPress={handleStartCamera}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.startButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="camera.fill" size={24} color="#fff" />
                            <Text style={styles.startButtonText}>{t('agent.takeVerificationPhoto')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    }

    // Camera View
    if (currentStep === 'camera') {
        return (
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back">
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraHeader}>
                            <TouchableOpacity onPress={() => setCurrentStep('verify')} style={styles.cameraClose}>
                                <IconSymbol name="xmark" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cameraGuide}>
                            <View style={styles.cameraFrame}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                            <Text style={styles.cameraGuideText}>{t('agent.alignDamage')}</Text>
                        </View>

                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        );
    }

    // Submit View
    if (currentStep === 'submit') {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <TouchableOpacity onPress={() => setCurrentStep('camera')} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color="#667eea" />
                        <Text style={styles.backText}>{t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('agent.submitVerification')}
                    </Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Photo Preview */}
                    {verificationPhoto && (
                        <View style={styles.photoPreview}>
                            <Image source={{ uri: verificationPhoto }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={styles.retakeButton}
                                onPress={() => setCurrentStep('camera')}
                            >
                                <IconSymbol name="camera.rotate.fill" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Status Selection */}
                    <View style={[styles.statusCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <Text style={[styles.statusTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.verificationStatus')}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.statusOption,
                                verificationStatus === 'confirmed' && styles.statusSelected,
                                { borderColor: verificationStatus === 'confirmed' ? '#FF4B2B' : (isDark ? '#333' : '#eee') }
                            ]}
                            onPress={() => setVerificationStatus('confirmed')}
                        >
                            <View style={[styles.statusIcon, { backgroundColor: '#FF4B2B20' }]}>
                                <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF4B2B" />
                            </View>
                            <View style={styles.statusContent}>
                                <Text style={[styles.statusLabel, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('agent.damageConfirmed')}
                                </Text>
                                <Text style={[styles.statusDesc, { color: isDark ? '#999' : '#666' }]}>
                                    {t('agent.damageConfirmedDesc')}
                                </Text>
                            </View>
                            {verificationStatus === 'confirmed' && (
                                <IconSymbol name="checkmark.circle.fill" size={24} color="#FF4B2B" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.statusOption,
                                verificationStatus === 'resolved' && styles.statusSelected,
                                { borderColor: verificationStatus === 'resolved' ? '#4ECDC4' : (isDark ? '#333' : '#eee') }
                            ]}
                            onPress={() => setVerificationStatus('resolved')}
                        >
                            <View style={[styles.statusIcon, { backgroundColor: '#4ECDC420' }]}>
                                <IconSymbol name="checkmark.circle.fill" size={20} color="#4ECDC4" />
                            </View>
                            <View style={styles.statusContent}>
                                <Text style={[styles.statusLabel, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('agent.alreadyResolved')}
                                </Text>
                                <Text style={[styles.statusDesc, { color: isDark ? '#999' : '#666' }]}>
                                    {t('agent.alreadyResolvedDesc')}
                                </Text>
                            </View>
                            {verificationStatus === 'resolved' && (
                                <IconSymbol name="checkmark.circle.fill" size={24} color="#4ECDC4" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.statusOption,
                                verificationStatus === 'not_found' && styles.statusSelected,
                                { borderColor: verificationStatus === 'not_found' ? '#FFD200' : (isDark ? '#333' : '#eee') }
                            ]}
                            onPress={() => setVerificationStatus('not_found')}
                        >
                            <View style={[styles.statusIcon, { backgroundColor: '#FFD20020' }]}>
                                <IconSymbol name="questionmark.circle.fill" size={20} color="#FFD200" />
                            </View>
                            <View style={styles.statusContent}>
                                <Text style={[styles.statusLabel, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('agent.notFound')}
                                </Text>
                                <Text style={[styles.statusDesc, { color: isDark ? '#999' : '#666' }]}>
                                    {t('agent.notFoundDesc')}
                                </Text>
                            </View>
                            {verificationStatus === 'not_found' && (
                                <IconSymbol name="checkmark.circle.fill" size={24} color="#FFD200" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Notes */}
                    <View style={[styles.notesCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <Text style={[styles.notesTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('agent.additionalNotes')}
                        </Text>
                        <TextInput
                            style={[
                                styles.notesInput,
                                {
                                    backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
                                    color: isDark ? '#fff' : '#000'
                                }
                            ]}
                            placeholder={t('agent.notesPlaceholder')}
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity onPress={handleSubmitVerification}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.submitButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>{t('agent.submitVerification')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backText: {
        color: '#667eea',
        fontSize: 16,
        marginLeft: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    reportSeverity: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginRight: 12,
    },
    reportThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    reportContent: {
        flex: 1,
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    reportType: {
        fontSize: 16,
        fontWeight: '600',
    },
    reportLocation: {
        fontSize: 13,
        marginBottom: 8,
    },
    reportMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    reportMetaText: {
        fontSize: 11,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    severityText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    detailCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailText: {
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    instructionCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    instructionNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    instructionText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        marginBottom: 20,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    cameraHeader: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    cameraClose: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraGuide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraFrame: {
        width: width * 0.8,
        height: width * 0.8,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#fff',
        borderWidth: 3,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    cameraGuideText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 20,
        textAlign: 'center',
    },
    cameraControls: {
        paddingBottom: 50,
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 65,
        height: 65,
        borderRadius: 33,
        backgroundColor: '#fff',
    },
    photoPreview: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: 250,
    },
    retakeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 12,
    },
    statusSelected: {
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
    },
    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statusContent: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    statusDesc: {
        fontSize: 12,
    },
    notesCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
    },
    notesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    notesInput: {
        borderRadius: 12,
        padding: 16,
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    emptyState: {
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    reportDescription: {
        fontSize: 12,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    reportPhone: {
        fontSize: 12,
        marginTop: 4,
    },
    descriptionBox: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
    },
    descriptionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    photoSection: {
        marginTop: 20,
    },
    photoSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    reportPhotoContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    reportPhoto: {
        width: '100%',
        height: 250,
        borderRadius: 12,
    },
    aiDetectionBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    aiDetectionGradient: {
        padding: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    aiDetectionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    aiSeverityText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
    coordsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
    },
    coordsText: {
        fontSize: 12,
        fontFamily: 'monospace',
        flex: 1,
    },
    openMapBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    openMapText: {
        fontSize: 11,
        color: '#4ECDC4',
        fontWeight: '600',
    },
});
