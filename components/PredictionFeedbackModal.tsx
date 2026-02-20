import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { PredictionResult } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FeedbackOption {
    id: string;
    category: string;
    label: string;
    icon: string;
}

export interface FeedbackSubmission {
    predictionId?: string;
    damageType: string;
    confidence: number;
    severity: string;
    selectedFeedback: FeedbackOption[];
    timestamp: string;
    imageUri?: string;
}

interface PredictionFeedbackModalProps {
    visible: boolean;
    prediction: PredictionResult;
    imageUri?: string;
    onClose: () => void;
    onSubmitFeedback: (feedback: FeedbackSubmission) => void;
}

// ============================================
// FEEDBACK CATEGORIES & OPTIONS
// ============================================

const FEEDBACK_CATEGORIES = {
    wrongType: 'Wrong Damage Type',
    measurement: 'Incorrect Measurements',
    imageQuality: 'Image Quality Issues',
    perspective: 'Camera/Scale Problems',
    confusion: 'Context Confusion',
    uncertainty: 'Low Danger Detection',
} as const;

// Generate feedback options based on detected damage
function generateFeedbackOptions(
    prediction: PredictionResult,
    t: (key: string) => string,
    isArabic: boolean
): { category: string; options: FeedbackOption[] }[] {
    const detectedType = isArabic
        ? prediction.damage_label_ar
        : prediction.damage_label;
    const severity = prediction.severity;
    const confidence = prediction.confidence;

    const categories: { category: string; options: FeedbackOption[] }[] = [];

    // 1. Wrong Damage Type Options
    categories.push({
        category: t('feedback.categories.wrongType'),
        options: [
            {
                id: 'wrong_not_damage',
                category: 'wrongType',
                label: t('feedback.options.notActualDamage'),
                icon: 'xmark.circle.fill',
            },
            {
                id: 'wrong_different_type',
                category: 'wrongType',
                label: t('feedback.options.differentDamageType'),
                icon: 'arrow.left.arrow.right',
            },
        ],
    });

    // 2. Measurement Issues
    if (prediction.detected) {
        categories.push({
            category: t('feedback.categories.measurement'),
            options: [
                {
                    id: 'measurement_smaller',
                    category: 'measurement',
                    label: t('feedback.options.damageSmallerThanShown'),
                    icon: 'minus.circle.fill',
                },
                {
                    id: 'measurement_larger',
                    category: 'measurement',
                    label: t('feedback.options.damageLargerThanShown'),
                    icon: 'plus.circle.fill',
                },
            ],
        });
    }

    // 3. Image Quality Issues
    categories.push({
        category: t('feedback.categories.imageQuality'),
        options: [
            {
                id: 'quality_blurry',
                category: 'imageQuality',
                label: t('feedback.options.imageBlurry'),
                icon: 'camera.fill',
            },
            {
                id: 'quality_lighting',
                category: 'imageQuality',
                label: t('feedback.options.poorLighting'),
                icon: 'sun.min.fill',
            },
        ],
    });

    // 4. Context Confusion
    categories.push({
        category: t('feedback.categories.confusion'),
        options: [
            {
                id: 'confusion_shadow',
                category: 'confusion',
                label: t('feedback.options.shadowMistaken'),
                icon: 'moon.fill',
            },
            {
                id: 'confusion_object',
                category: 'confusion',
                label: t('feedback.options.objectMistaken'),
                icon: 'questionmark.circle.fill',
            },
        ],
    });

    // 5. Low Danger Detection Note (only if low danger score)
    const dangerScore = (prediction.danger_score ?? (prediction.severity_score * 100)) / 100;
    if (dangerScore < 0.6) {
        categories.push({
            category: t('feedback.categories.uncertainty'),
            options: [
                {
                    id: 'uncertainty_unsure',
                    category: 'uncertainty',
                    label: t('feedback.options.modelUnsure'),
                    icon: 'exclamationmark.triangle.fill',
                },
            ],
        });
    }

    return categories;
}

// Generate explanation based on prediction result
function generateExplanation(
    prediction: PredictionResult,
    t: (key: string) => string,
    isArabic: boolean
): string {
    const damageType = isArabic
        ? prediction.damage_label_ar
        : prediction.damage_label;
    const dangerScore = Math.round(prediction.danger_score ?? (prediction.severity_score * 100));
    const severity = prediction.danger_level ?? prediction.severity;

    if (!prediction.detected) {
        return t('feedback.explanations.noDamageDetected');
    }

    return t('feedback.explanations.damageDetected')
        .replace('{type}', damageType || 'Unknown')
        .replace('{dangerScore}', dangerScore.toString())
        .replace('{severity}', t(`reports.${severity}`));
}

// Generate reasons for potential uncertainty
function generateUncertaintyReasons(
    prediction: PredictionResult,
    t: (key: string) => string
): string[] {
    const reasons: string[] = [];

    const dangerScore = (prediction.danger_score ?? (prediction.severity_score * 100)) / 100;

    if (dangerScore < 0.5) {
        reasons.push(t('feedback.reasons.lowConfidence'));
    }
    if (dangerScore < 0.7 && dangerScore >= 0.5) {
        reasons.push(t('feedback.reasons.moderateConfidence'));
    }
    if (prediction.bounding_boxes && prediction.bounding_boxes.length > 1) {
        reasons.push(t('feedback.reasons.multipleDetections'));
    }
    if (dangerScore < 0.3) {
        reasons.push(t('feedback.reasons.smallDamageArea'));
    }

    // Always add at least one reason
    if (reasons.length === 0) {
        reasons.push(t('feedback.reasons.generalUncertainty'));
    }

    return reasons;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PredictionFeedbackModal({
    visible,
    prediction,
    imageUri,
    onClose,
    onSubmitFeedback,
}: PredictionFeedbackModalProps) {
    const colorScheme = useColorScheme();
    const { t, locale } = useTranslation();
    const isDark = colorScheme === 'dark';
    const isArabic = locale === 'ar';

    const [selectedOptions, setSelectedOptions] = useState<FeedbackOption[]>([]);

    const explanation = useMemo(
        () => generateExplanation(prediction, t, isArabic),
        [prediction, t, isArabic]
    );

    const uncertaintyReasons = useMemo(
        () => generateUncertaintyReasons(prediction, t),
        [prediction, t]
    );

    const feedbackCategories = useMemo(
        () => generateFeedbackOptions(prediction, t, isArabic),
        [prediction, t, isArabic]
    );

    const toggleOption = (option: FeedbackOption) => {
        setSelectedOptions((prev) => {
            const exists = prev.find((o) => o.id === option.id);
            if (exists) {
                return prev.filter((o) => o.id !== option.id);
            }
            return [...prev, option];
        });
    };

    const isSelected = (optionId: string) =>
        selectedOptions.some((o) => o.id === optionId);

    const handleSubmit = () => {
        const feedbackData: FeedbackSubmission = {
            damageType: prediction.damage_type || 'none',
            confidence: prediction.danger_score ?? (prediction.severity_score * 100),
            severity: prediction.danger_level ?? prediction.severity,
            selectedFeedback: selectedOptions,
            timestamp: new Date().toISOString(),
            imageUri,
        };

        console.log('📋 Feedback JSON:', JSON.stringify(feedbackData, null, 2));
        onSubmitFeedback(feedbackData);
        setSelectedOptions([]);
        onClose();
    };

    const getSeverityColor = (severity: string): [string, string] => {
        switch (severity) {
            case 'high':
                return ['#FF416C', '#FF4B2B'];
            case 'medium':
                return ['#F7971E', '#FFD200'];
            case 'low':
                return ['#56ab2f', '#a8e063'];
            default:
                return ['#667eea', '#764ba2'];
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.container,
                        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={getSeverityColor(prediction.danger_level ?? prediction.severity)}
                            style={styles.headerIcon}
                        >
                            <IconSymbol
                                name="hand.thumbsdown.fill"
                                size={24}
                                color="#fff"
                            />
                        </LinearGradient>
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: isDark ? '#fff' : '#000' },
                            ]}
                        >
                            {t('feedback.title')}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <IconSymbol
                                name="xmark.circle.fill"
                                size={28}
                                color={isDark ? '#666' : '#999'}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Explanation Card */}
                        <View
                            style={[
                                styles.explanationCard,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(102, 126, 234, 0.15)'
                                        : 'rgba(102, 126, 234, 0.08)',
                                },
                            ]}
                        >
                            <IconSymbol
                                name="info.circle.fill"
                                size={20}
                                color="#667eea"
                            />
                            <Text
                                style={[
                                    styles.explanationText,
                                    { color: isDark ? '#ddd' : '#333' },
                                ]}
                            >
                                {explanation}
                            </Text>
                        </View>

                        {/* Uncertainty Reasons */}
                        {uncertaintyReasons.length > 0 && (
                            <View style={styles.reasonsSection}>
                                <Text
                                    style={[
                                        styles.reasonsTitle,
                                        { color: isDark ? '#999' : '#666' },
                                    ]}
                                >
                                    {t('feedback.possibleReasons')}
                                </Text>
                                {uncertaintyReasons.map((reason, index) => (
                                    <View key={index} style={styles.reasonItem}>
                                        <View
                                            style={[
                                                styles.reasonBullet,
                                                { backgroundColor: '#FFD200' },
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.reasonText,
                                                { color: isDark ? '#bbb' : '#555' },
                                            ]}
                                        >
                                            {reason}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Feedback Options */}
                        <Text
                            style={[
                                styles.sectionTitle,
                                { color: isDark ? '#fff' : '#000' },
                            ]}
                        >
                            {t('feedback.selectFeedback')}
                        </Text>

                        {feedbackCategories.map((category, catIndex) => (
                            <View key={catIndex} style={styles.categorySection}>
                                <Text
                                    style={[
                                        styles.categoryTitle,
                                        { color: isDark ? '#888' : '#666' },
                                    ]}
                                >
                                    {category.category}
                                </Text>
                                {category.options.map((option) => (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[
                                            styles.optionButton,
                                            {
                                                backgroundColor: isSelected(option.id)
                                                    ? isDark
                                                        ? 'rgba(102, 126, 234, 0.3)'
                                                        : 'rgba(102, 126, 234, 0.15)'
                                                    : isDark
                                                        ? 'rgba(255,255,255,0.05)'
                                                        : 'rgba(0,0,0,0.03)',
                                                borderColor: isSelected(option.id)
                                                    ? '#667eea'
                                                    : isDark
                                                        ? 'rgba(255,255,255,0.1)'
                                                        : 'rgba(0,0,0,0.08)',
                                            },
                                        ]}
                                        onPress={() => toggleOption(option)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol
                                            name={option.icon as any}
                                            size={20}
                                            color={isSelected(option.id) ? '#667eea' : isDark ? '#888' : '#666'}
                                        />
                                        <Text
                                            style={[
                                                styles.optionText,
                                                {
                                                    color: isSelected(option.id)
                                                        ? '#667eea'
                                                        : isDark
                                                            ? '#ddd'
                                                            : '#333',
                                                },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected(option.id) && (
                                            <IconSymbol
                                                name="checkmark.circle.fill"
                                                size={20}
                                                color="#667eea"
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer Actions */}
                    <View
                        style={[
                            styles.footer,
                            {
                                borderTopColor: isDark
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.cancelButton,
                                {
                                    borderColor: isDark ? '#444' : '#ddd',
                                },
                            ]}
                            onPress={onClose}
                        >
                            <Text
                                style={[
                                    styles.cancelButtonText,
                                    { color: isDark ? '#fff' : '#000' },
                                ]}
                            >
                                {t('common.cancel')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                {
                                    opacity: selectedOptions.length === 0 ? 0.5 : 1,
                                },
                            ]}
                            onPress={handleSubmit}
                            disabled={selectedOptions.length === 0}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.submitButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <IconSymbol name="paperplane.fill" size={18} color="#fff" />
                                <Text style={styles.submitButtonText}>
                                    {t('feedback.submit')} ({selectedOptions.length})
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        width: '100%',
        maxHeight: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        // Removed flex: 1 to allow content to determine height up to max
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
    },
    explanationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    explanationText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 10,
    },
    reasonsSection: {
        marginBottom: 20,
    },
    reasonsTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    reasonBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 10,
    },
    reasonText: {
        fontSize: 13,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    categorySection: {
        marginBottom: 16,
    },
    categoryTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1.5,
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default PredictionFeedbackModal;
