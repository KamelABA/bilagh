import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Damage types
const DAMAGE_TYPES = [
    { id: 'pothole', labelKey: 'reports.pothole' },
    { id: 'crack', labelKey: 'reports.crack' },
    { id: 'debris', labelKey: 'reports.debris' },
];

// Severity levels
const SEVERITY_LEVELS = [
    { id: 'low', labelKey: 'reports.low', color: '#4ECDC4' },
    { id: 'medium', labelKey: 'reports.medium', color: '#FFD200' },
    { id: 'high', labelKey: 'reports.high', color: '#FF4B2B' },
];

interface FormErrors {
    type?: string;
    location?: string;
    description?: string;
}

interface Report {
    id: string;
    type: string;
    location: string;
    description: string | null;
    severity: string;
    status: string;
    created_at: string;
    image_url: string | null;
    verified_at?: string | null;
    approved_at?: string | null;
    updated_at?: string | null;
}

// Status timeline steps in order
const STATUS_STEPS = [
    { key: 'pending', labelKey: 'reports.submitted', descKey: 'reports.submittedDesc' },
    { key: 'verified', labelKey: 'reports.verified', descKey: 'reports.verifiedDesc' },
    { key: 'approved', labelKey: 'reports.approved', descKey: 'reports.approvedDesc' },
    { key: 'assigned', labelKey: 'reports.assigned', descKey: 'reports.assignedDesc' },
    { key: 'in-progress', labelKey: 'reports.inProgress', descKey: 'reports.repairInProgress' },
    { key: 'resolved', labelKey: 'reports.resolved', descKey: 'reports.issueFixed' },
];

export default function ReportsScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState<'submit' | 'reports'>('submit');
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Form state
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [damageType, setDamageType] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [description, setDescription] = useState<string>('');
    const [severity, setSeverity] = useState<string>('medium');
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Location picker state
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Reports list state
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Type selector modal
    const [showTypeSelector, setShowTypeSelector] = useState(false);

    // Report detail modal for tracking
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showReportDetail, setShowReportDetail] = useState(false);

    // Listen for photo and prediction from camera - use useFocusEffect to capture on every navigation
    useFocusEffect(
        useCallback(() => {
            const photoUri = (global as any).capturedPhotoUri;
            const prediction = (global as any).predictionResult;

            if (photoUri) {
                console.log('Captured photo from camera:', photoUri);
                setCapturedPhoto(photoUri);
                (global as any).capturedPhotoUri = null;
            }

            if (prediction && prediction.detected) {
                console.log('Prediction from camera:', prediction);
                // Auto-fill from AI prediction
                if (prediction.damage_label) {
                    const typeMap: { [key: string]: string } = {
                        'Pothole': 'pothole',
                        'Crack': 'crack',
                        'Road Debris': 'debris',
                        'Debris': 'debris',
                        'Alligator Crack': 'crack',
                        'Longitudinal Crack': 'crack',
                        'Transverse Crack': 'crack',
                    };
                    setDamageType(typeMap[prediction.damage_label] || 'pothole');
                }
                if (prediction.severity) {
                    setSeverity(prediction.severity);
                }
                (global as any).predictionResult = null;
            }
        }, [])
    );

    // Fetch user reports
    const fetchReports = useCallback(async () => {
        setLoadingReports(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(API_ENDPOINTS.REPORTS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoadingReports(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchReports();
        }
    }, [activeTab, fetchReports]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReports();
    }, [fetchReports]);

    // Get current location
    const getCurrentLocation = async () => {
        setIsGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('common.error'), t('reports.locationPermissionRequired'));
                return;
            }

            const locationResult = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setLatitude(locationResult.coords.latitude);
            setLongitude(locationResult.coords.longitude);

            // Reverse geocode to get address
            const [address] = await Location.reverseGeocodeAsync({
                latitude: locationResult.coords.latitude,
                longitude: locationResult.coords.longitude,
            });

            if (address) {
                const addressParts = [
                    address.street,
                    address.city,
                    address.region,
                ].filter(Boolean);
                setLocation(addressParts.join(', ') || `${locationResult.coords.latitude.toFixed(6)}, ${locationResult.coords.longitude.toFixed(6)}`);
            }

            setFormErrors(prev => ({ ...prev, location: undefined }));
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert(t('common.error'), t('reports.locationFailed'));
        } finally {
            setIsGettingLocation(false);
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const errors: FormErrors = {};

        if (!damageType) {
            errors.type = t('reports.typeRequired');
        }

        if (!location.trim()) {
            errors.location = t('reports.locationRequired');
        }

        if (!description.trim()) {
            errors.description = t('reports.descriptionRequired');
        }

        console.log('Form validation errors:', errors);
        console.log('Form data:', { damageType, location, description, severity });

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit report
    const handleSubmit = async () => {
        console.log('Submit button pressed');

        if (!validateForm()) {
            console.log('Validation failed');
            // Scroll to top to show errors
            if (Platform.OS === 'web') {
                window.alert(t('reports.pleaseFixErrors'));
            } else {
                Alert.alert(t('common.error'), t('reports.pleaseFixErrors'));
            }
            return;
        }

        console.log('Validation passed, submitting...');
        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert(t('common.error'), t('auth.loginRequired'));
                router.replace('/login');
                return;
            }

            let imageUrl = null;

            // Upload photo to Cloudinary if we have one
            if (capturedPhoto) {
                console.log('Uploading photo to Cloudinary...');
                try {
                    // Create form data for image upload
                    const formData = new FormData();
                    const filename = capturedPhoto.split('/').pop() || 'photo.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : 'image/jpeg';

                    formData.append('file', {
                        uri: capturedPhoto,
                        name: filename,
                        type: type,
                    } as any);

                    const uploadResponse = await fetch(API_ENDPOINTS.UPLOAD_IMAGE, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                        body: formData,
                    });

                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        imageUrl = uploadResult.url;
                        console.log('Photo uploaded:', imageUrl);
                    } else {
                        console.error('Photo upload failed:', await uploadResponse.text());
                    }
                } catch (uploadError) {
                    console.error('Photo upload error:', uploadError);
                    // Continue without image if upload fails
                }
            }

            const reportData = {
                type: damageType,
                location: location,
                latitude: latitude,
                longitude: longitude,
                description: description,
                severity: severity,
                image_url: imageUrl,
            };

            console.log('Sending report data:', reportData);
            console.log('API URL:', API_ENDPOINTS.REPORTS);

            const response = await fetch(API_ENDPOINTS.REPORTS, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportData),
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Report created:', result);

                // Reset form
                setCapturedPhoto(null);
                setDamageType('');
                setLocation('');
                setLatitude(null);
                setLongitude(null);
                setDescription('');
                setSeverity('medium');
                setFormErrors({});

                if (Platform.OS === 'web') {
                    window.alert(t('reports.submitSuccess'));
                    // Switch to reports tab
                    setActiveTab('reports');
                    fetchReports();
                } else {
                    Alert.alert(
                        t('common.success'),
                        t('reports.submitSuccess'),
                        [
                            {
                                text: t('common.done'),
                                onPress: () => {
                                    // Switch to reports tab
                                    setActiveTab('reports');
                                    fetchReports();
                                },
                            },
                        ]
                    );
                }
            } else {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                if (Platform.OS === 'web') {
                    window.alert(errorData.detail || t('reports.submitFailed'));
                } else {
                    Alert.alert(t('common.error'), errorData.detail || t('reports.submitFailed'));
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            if (Platform.OS === 'web') {
                window.alert(t('reports.submitFailed'));
            } else {
                Alert.alert(t('common.error'), t('reports.submitFailed'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFilterLabel = (filter: string) => {
        switch (filter) {
            case 'all': return t('reports.all');
            case 'pending': return t('reports.pending');
            case 'in-progress': return t('reports.inProgress');
            case 'resolved': return t('reports.resolved');
            default: return filter;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FF6B6B';
            case 'in-progress': return '#FFD200';
            case 'resolved': return '#4ECDC4';
            default: return '#999';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return t('reports.justNow');
        if (diffHours < 24) return `${diffHours}h ${t('reports.ago')}`;
        if (diffDays < 7) return `${diffDays}d ${t('reports.ago')}`;
        return date.toLocaleDateString();
    };

    const filteredReports = selectedFilter === 'all'
        ? reports
        : reports.filter(r => r.status === selectedFilter);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>{t('reports.reports')}</Text>
                <Text style={styles.headerSubtitle}>
                    {activeTab === 'submit' ? t('reports.submitNewDamageReport') : `${reports.length} ${t('reports.totalReports')}`}
                </Text>

                {/* Tab Switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('submit')}
                        activeOpacity={0.7}
                        style={[styles.tab, activeTab === 'submit' && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'submit' ? '#0B5394' : '#fff' }]}>
                            {t('reports.submit')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('reports')}
                        activeOpacity={0.7}
                        style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'reports' ? '#0B5394' : '#fff' }]}>
                            {t('reports.myReports')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {activeTab === 'submit' ? (
                // Submit Form
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Damage Type */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.type')} <Text style={styles.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowTypeSelector(true)}
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                                formErrors.type && styles.inputError
                            ]}
                        >
                            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#0B5394" />
                            <Text style={[
                                styles.inputText,
                                { color: damageType ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999') }
                            ]}>
                                {damageType ? t(`reports.${damageType}`) : t('reports.selectType')}
                            </Text>
                            <IconSymbol name="chevron.right" size={16} color={isDark ? '#666' : '#999'} />
                        </TouchableOpacity>
                        {formErrors.type && <Text style={styles.errorText}>{formErrors.type}</Text>}
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.location')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={[
                            styles.input,
                            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                            formErrors.location && styles.inputError
                        ]}>
                            <IconSymbol name="location.fill" size={20} color="#0B5394" />
                            <TextInput
                                placeholder={t('reports.enterLocation')}
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                style={[styles.textInput, { color: isDark ? '#fff' : '#000' }]}
                                value={location}
                                onChangeText={(text) => {
                                    setLocation(text);
                                    if (text.trim()) setFormErrors(prev => ({ ...prev, location: undefined }));
                                }}
                            />
                        </View>
                        {formErrors.location && <Text style={styles.errorText}>{formErrors.location}</Text>}

                        {/* Location Buttons */}
                        <View style={styles.locationButtons}>
                            <TouchableOpacity
                                style={[styles.locationButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                                onPress={getCurrentLocation}
                                disabled={isGettingLocation}
                            >
                                {isGettingLocation ? (
                                    <ActivityIndicator size="small" color="#0B5394" />
                                ) : (
                                    <IconSymbol name="location.fill" size={16} color="#0B5394" />
                                )}
                                <Text style={[styles.locationButtonText, { color: '#0B5394' }]}>
                                    {t('reports.useCurrentLocation')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {latitude && longitude && (
                            <View style={[styles.coordsBox, { backgroundColor: isDark ? '#1a1a1a' : '#e8f4f8' }]}>
                                <IconSymbol name="mappin.circle.fill" size={16} color="#4ECDC4" />
                                <Text style={[styles.coordsText, { color: isDark ? '#999' : '#666' }]}>
                                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.description')} <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={[
                            styles.textArea,
                            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                            formErrors.description && styles.inputError
                        ]}>
                            <TextInput
                                placeholder={t('reports.enterDescription')}
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                style={[styles.textAreaInput, { color: isDark ? '#fff' : '#000' }]}
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={(text) => {
                                    setDescription(text);
                                    if (text.trim()) setFormErrors(prev => ({ ...prev, description: undefined }));
                                }}
                            />
                        </View>
                        {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
                    </View>

                    {/* Severity */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.severity')}
                        </Text>
                        <View style={styles.severityContainer}>
                            {SEVERITY_LEVELS.map((level) => (
                                <TouchableOpacity
                                    key={level.id}
                                    onPress={() => setSeverity(level.id)}
                                    style={[
                                        styles.severityOption,
                                        {
                                            backgroundColor: severity === level.id
                                                ? level.color + '20'
                                                : (isDark ? '#1a1a1a' : '#fff'),
                                            borderColor: severity === level.id ? level.color : 'transparent',
                                        }
                                    ]}
                                >
                                    <View style={[styles.severityDot, { backgroundColor: level.color }]} />
                                    <Text style={[
                                        styles.severityText,
                                        { color: severity === level.id ? level.color : (isDark ? '#999' : '#666') }
                                    ]}>
                                        {t(level.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Photo */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.photo')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/camera')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.photoUpload, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                {capturedPhoto ? (
                                    <View style={styles.photoPreview}>
                                        <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
                                        <TouchableOpacity
                                            style={styles.changePhotoButton}
                                            onPress={() => router.push('/camera')}
                                        >
                                            <IconSymbol name="camera.fill" size={16} color="#fff" />
                                            <Text style={styles.changePhotoText}>{t('reports.changePhoto')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <IconSymbol name="camera.fill" size={40} color={isDark ? '#666' : '#999'} />
                                        <Text style={[styles.photoPlaceholderText, { color: isDark ? '#666' : '#999' }]}>
                                            {t('reports.tapToTakePhoto')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={isSubmitting ? ['#999', '#777'] : ['#0B5394', '#4A7C2C']}
                            style={styles.submitButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                            )}
                            <Text style={styles.submitText}>
                                {isSubmitting ? t('reports.submitting') : t('reports.submitReport')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : (
                // Reports List
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filters}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    >
                        {['all', 'pending', 'in-progress', 'resolved'].map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setSelectedFilter(filter)}
                                activeOpacity={0.7}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: selectedFilter === filter
                                            ? '#0B5394'
                                            : isDark ? '#1a1a1a' : '#fff',
                                    },
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    {
                                        color: selectedFilter === filter
                                            ? '#fff'
                                            : isDark ? '#999' : '#666',
                                    },
                                ]}>
                                    {getFilterLabel(filter)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView
                        style={styles.list}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B5394']} />
                        }
                    >
                        {loadingReports ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0B5394" />
                            </View>
                        ) : filteredReports.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                <IconSymbol name="doc.text.fill" size={50} color={isDark ? '#666' : '#999'} />
                                <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('reports.noReports')}
                                </Text>
                                <Text style={[styles.emptyText, { color: isDark ? '#999' : '#666' }]}>
                                    {t('reports.noReportsDesc')}
                                </Text>
                            </View>
                        ) : (
                            filteredReports.map((report) => (
                                <TouchableOpacity
                                    key={report.id}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedReport(report);
                                        setShowReportDetail(true);
                                    }}
                                    style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                                >
                                    {/* Image thumbnail if available */}
                                    {report.image_url && (
                                        <Image
                                            source={{ uri: report.image_url }}
                                            style={styles.reportImage}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={styles.reportHeader}>
                                        <Text style={[styles.reportType, { color: isDark ? '#fff' : '#000' }]}>
                                            {t(`reports.${report.type}`) || report.type}
                                        </Text>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: getStatusColor(report.status) + '20' }
                                        ]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                                {getFilterLabel(report.status).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    {report.description && (
                                        <Text
                                            style={[styles.reportDescription, { color: isDark ? '#999' : '#666' }]}
                                            numberOfLines={2}
                                        >
                                            {report.description}
                                        </Text>
                                    )}
                                    <View style={styles.reportFooter}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <IconSymbol name="location.fill" size={14} color={isDark ? '#999' : '#666'} />
                                            <Text
                                                style={[styles.reportLocation, { color: isDark ? '#999' : '#666' }]}
                                                numberOfLines={1}
                                            >
                                                {report.location}
                                            </Text>
                                        </View>
                                        <Text style={[styles.reportDate, { color: isDark ? '#999' : '#666' }]}>
                                            {formatDate(report.created_at)}
                                        </Text>
                                    </View>
                                    {/* Track progress hint */}
                                    <View style={styles.trackHint}>
                                        <IconSymbol name="arrow.right.circle.fill" size={14} color="#0B5394" />
                                        <Text style={styles.trackHintText}>{t('reports.tapToTrack')}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </>
            )}

            {/* Type Selector Modal */}
            <Modal
                visible={showTypeSelector}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTypeSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('reports.selectType')}
                        </Text>
                        {DAMAGE_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.typeOption,
                                    damageType === type.id && styles.typeOptionSelected,
                                    { borderColor: damageType === type.id ? '#0B5394' : (isDark ? '#333' : '#eee') }
                                ]}
                                onPress={() => {
                                    setDamageType(type.id);
                                    setFormErrors(prev => ({ ...prev, type: undefined }));
                                    setShowTypeSelector(false);
                                }}
                            >
                                <Text style={[
                                    styles.typeOptionText,
                                    { color: damageType === type.id ? '#0B5394' : (isDark ? '#fff' : '#000') }
                                ]}>
                                    {t(type.labelKey)}
                                </Text>
                                {damageType === type.id && (
                                    <IconSymbol name="checkmark.circle.fill" size={20} color="#0B5394" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => setShowTypeSelector(false)}
                        >
                            <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Report Detail Modal with Status Timeline */}
            <Modal
                visible={showReportDetail}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReportDetail(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        {/* Header */}
                        <View style={styles.detailHeader}>
                            <Text style={[styles.detailTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('reports.reportDetails')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowReportDetail(false)}
                                style={styles.closeButton}
                            >
                                <IconSymbol name="xmark.circle.fill" size={28} color={isDark ? '#666' : '#999'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedReport && (
                                <>
                                    {/* Report Image */}
                                    {selectedReport.image_url && (
                                        <Image
                                            source={{ uri: selectedReport.image_url }}
                                            style={styles.detailImage}
                                            resizeMode="cover"
                                        />
                                    )}

                                    {/* Report Info */}
                                    <View style={styles.detailInfo}>
                                        <Text style={[styles.detailType, { color: isDark ? '#fff' : '#000' }]}>
                                            {t(`reports.${selectedReport.type}`) || selectedReport.type}
                                        </Text>
                                        <View style={styles.detailRow}>
                                            <IconSymbol name="location.fill" size={16} color="#0B5394" />
                                            <Text style={[styles.detailText, { color: isDark ? '#ccc' : '#333' }]}>
                                                {selectedReport.location}
                                            </Text>
                                        </View>
                                        {selectedReport.description && (
                                            <Text style={[styles.detailDescription, { color: isDark ? '#999' : '#666' }]}>
                                                {selectedReport.description}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Status Timeline */}
                                    <View style={styles.timelineContainer}>
                                        <Text style={[styles.timelineTitle, { color: isDark ? '#fff' : '#000' }]}>
                                            {t('reports.statusTimeline')}
                                        </Text>

                                        {STATUS_STEPS.map((step, index) => {
                                            const statusOrder = ['pending', 'verified', 'approved', 'assigned', 'in-progress', 'resolved'];
                                            const currentIndex = statusOrder.indexOf(selectedReport.status);
                                            const stepIndex = statusOrder.indexOf(step.key);

                                            // Handle rejected status
                                            const isRejected = selectedReport.status === 'rejected';
                                            const isCompleted = !isRejected && stepIndex <= currentIndex;
                                            const isCurrent = step.key === selectedReport.status;
                                            const isLast = index === STATUS_STEPS.length - 1;

                                            // Get timestamp for this step
                                            let timestamp = null;
                                            if (step.key === 'pending' && isCompleted) timestamp = selectedReport.created_at;
                                            if (step.key === 'verified' && isCompleted) timestamp = selectedReport.verified_at;
                                            if (step.key === 'approved' && isCompleted) timestamp = selectedReport.approved_at;
                                            if (step.key === 'resolved' && isCompleted) timestamp = selectedReport.updated_at;

                                            return (
                                                <View key={step.key} style={styles.timelineStep}>
                                                    <View style={styles.timelineLeft}>
                                                        <View style={[
                                                            styles.timelineDot,
                                                            isCompleted && styles.timelineDotCompleted,
                                                            isCurrent && styles.timelineDotCurrent,
                                                            isRejected && isCurrent && styles.timelineDotRejected,
                                                        ]}>
                                                            {isCompleted && !isCurrent && (
                                                                <IconSymbol name="checkmark" size={12} color="#fff" />
                                                            )}
                                                            {isCurrent && (
                                                                <View style={[
                                                                    styles.currentDotInner,
                                                                    isRejected && { backgroundColor: '#FF4B2B' }
                                                                ]} />
                                                            )}
                                                        </View>
                                                        {!isLast && (
                                                            <View style={[
                                                                styles.timelineLine,
                                                                isCompleted && stepIndex < currentIndex && styles.timelineLineCompleted,
                                                            ]} />
                                                        )}
                                                    </View>
                                                    <View style={styles.timelineRight}>
                                                        <Text style={[
                                                            styles.timelineLabel,
                                                            { color: isCompleted ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999') },
                                                            isCurrent && { fontWeight: 'bold' },
                                                        ]}>
                                                            {t(step.labelKey)}
                                                        </Text>
                                                        {isCurrent && (
                                                            <Text style={[styles.timelineDesc, { color: isDark ? '#999' : '#666' }]}>
                                                                {isRejected ? t('reports.reportRejectedDesc') : t(step.descKey)}
                                                            </Text>
                                                        )}
                                                        {timestamp && (
                                                            <Text style={[styles.timelineTime, { color: isDark ? '#666' : '#999' }]}>
                                                                {formatDate(timestamp)}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
        marginBottom: 16,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    required: {
        color: '#FF4B2B',
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        gap: 10,
    },
    inputError: {
        borderWidth: 1,
        borderColor: '#FF4B2B',
    },
    inputText: {
        flex: 1,
        fontSize: 15,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
    },
    errorText: {
        color: '#FF4B2B',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    locationButtons: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    locationButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
    coordsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        gap: 8,
    },
    coordsText: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    textArea: {
        padding: 16,
        borderRadius: 12,
        minHeight: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    textAreaInput: {
        fontSize: 15,
        textAlignVertical: 'top',
    },
    severityContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    severityOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 2,
        gap: 6,
    },
    severityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    severityText: {
        fontSize: 13,
        fontWeight: '600',
    },
    photoUpload: {
        borderRadius: 12,
        minHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    photoPreview: {
        position: 'relative',
        width: '100%',
        height: 200,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B5394',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    changePhotoText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    photoPlaceholder: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    photoPlaceholderText: {
        fontSize: 14,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 10,
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    filters: {
        marginTop: 12,
        marginBottom: 20,
        maxHeight: 40,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyState: {
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    reportCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    reportImage: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        marginBottom: 12,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reportType: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    reportDescription: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    reportFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reportLocation: {
        fontSize: 14,
        marginLeft: 4,
        flex: 1,
    },
    reportDate: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 12,
    },
    typeOptionSelected: {
        backgroundColor: 'rgba(11, 83, 148, 0.1)',
    },
    typeOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalCancel: {
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    modalCancelText: {
        color: '#FF4B2B',
        fontSize: 16,
        fontWeight: '600',
    },
    // Track hint on report cards
    trackHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(11, 83, 148, 0.1)',
        gap: 6,
    },
    trackHintText: {
        color: '#0B5394',
        fontSize: 12,
        fontWeight: '500',
    },
    // Detail modal styles
    detailModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '90%',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    detailImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    detailInfo: {
        marginBottom: 20,
    },
    detailType: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 15,
        flex: 1,
    },
    detailDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
    },
    // Timeline styles
    timelineContainer: {
        backgroundColor: 'rgba(11, 83, 148, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    timelineStep: {
        flexDirection: 'row',
        minHeight: 44,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 30,
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotCompleted: {
        backgroundColor: '#4ECDC4',
    },
    timelineDotCurrent: {
        backgroundColor: '#0B5394',
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    timelineDotRejected: {
        backgroundColor: '#FF4B2B',
    },
    currentDotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#ddd',
        marginVertical: 4,
    },
    timelineLineCompleted: {
        backgroundColor: '#4ECDC4',
    },
    timelineRight: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 8,
    },
    timelineLabel: {
        fontSize: 15,
    },
    timelineDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    timelineTime: {
        fontSize: 11,
        marginTop: 4,
    },
});
