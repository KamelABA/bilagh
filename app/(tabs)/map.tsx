import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface DamageReport {
    id: number;
    latitude: number;
    longitude: number;
    type: string;
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'resolved';
    descriptionKey: string;
}

export default function MapScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';

    const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);

    // Sample damage reports
    const damageReports: DamageReport[] = [
        {
            id: 1,
            latitude: 37.78825,
            longitude: -122.4324,
            type: t('reports.pothole'),
            severity: 'high',
            status: 'pending',
            descriptionKey: 'map.largePotholeOnMainRoad',
        },
        {
            id: 2,
            latitude: 37.78925,
            longitude: -122.4314,
            type: t('reports.crack'),
            severity: 'medium',
            status: 'in-progress',
            descriptionKey: 'map.roadSurfaceCrack',
        },
        {
            id: 3,
            latitude: 37.78725,
            longitude: -122.4344,
            type: t('reports.pothole'),
            severity: 'low',
            status: 'resolved',
            descriptionKey: 'map.smallPothole',
        },
    ];

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return '#FF6B6B';
            case 'medium':
                return '#FFE66D';
            case 'low':
                return '#4ECDC4';
            default:
                return '#999';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#FF6B6B';
            case 'in-progress':
                return '#FFE66D';
            case 'resolved':
                return '#4ECDC4';
            default:
                return '#999';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return t('reports.pending');
            case 'in-progress':
                return t('reports.inProgress');
            case 'resolved':
                return t('reports.resolved');
            default:
                return status;
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high':
                return t('map.high');
            case 'medium':
                return t('map.medium');
            case 'low':
                return t('map.low');
            default:
                return severity;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Web Map Placeholder */}
            <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0' }]}>
                <View style={styles.placeholderContent}>
                    <IconSymbol name="map.fill" size={64} color={isDark ? '#667eea' : '#764ba2'} />
                    <Text style={[styles.placeholderTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('map.mapViewWebPreview')}
                    </Text>
                    <Text style={[styles.placeholderText, { color: isDark ? '#999' : '#666' }]}>
                        {t('map.interactiveMapAvailable')}
                    </Text>
                    <Text style={[styles.placeholderSubtext, { color: isDark ? '#666' : '#999' }]}>
                        {t('map.useExpoGoApp')}
                    </Text>
                </View>
            </View>

            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('map.roadDamageMap')}
                </Text>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.high')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFE66D' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.medium')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.low')}</Text>
                    </View>
                </View>
            </View>

            {/* Reports List for Web */}
            <ScrollView style={styles.webScrollView}>
                <View style={[styles.reportsList, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <Text style={[styles.reportsTitle, { color: isDark ? '#fff' : '#000' }]}>
                        {t('map.damageReports')}
                    </Text>
                    {damageReports.map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            style={[styles.reportItem, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}
                            onPress={() => setSelectedReport(report)}
                        >
                            <View
                                style={[
                                    styles.reportMarker,
                                    { backgroundColor: getSeverityColor(report.severity) },
                                ]}
                            >
                                <IconSymbol
                                    name="exclamationmark.triangle.fill"
                                    size={16}
                                    color="#fff"
                                />
                            </View>
                            <View style={styles.reportInfo}>
                                <Text style={[styles.reportType, { color: isDark ? '#fff' : '#000' }]}>
                                    {report.type}
                                </Text>
                                <Text style={[styles.reportDescription, { color: isDark ? '#999' : '#666' }]}>
                                    {t(report.descriptionKey)}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: getStatusColor(report.status) + '20' },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusText,
                                        { color: getStatusColor(report.status) },
                                    ]}
                                >
                                    {getStatusLabel(report.status).toUpperCase()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Selected Report Card */}
            {selectedReport && (
                <View style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <View style={styles.reportHeader}>
                        <View>
                            <Text style={[styles.reportTypeDetail, { color: isDark ? '#fff' : '#000' }]}>
                                {selectedReport.type}
                            </Text>
                            <Text style={[styles.reportDescriptionDetail, { color: isDark ? '#999' : '#666' }]}>
                                {t(selectedReport.descriptionKey)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedReport(null)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? '#999' : '#666'} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.reportDetails}>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: isDark ? '#999' : '#666' }]}>
                                {t('reports.severity')}
                            </Text>
                            <View
                                style={[
                                    styles.badge,
                                    { backgroundColor: getSeverityColor(selectedReport.severity) + '20' },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.badgeText,
                                        { color: getSeverityColor(selectedReport.severity) },
                                    ]}
                                >
                                    {getSeverityLabel(selectedReport.severity).toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: isDark ? '#999' : '#666' }]}>
                                {t('reports.status')}
                            </Text>
                            <View
                                style={[
                                    styles.badge,
                                    { backgroundColor: getStatusColor(selectedReport.status) + '20' },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.badgeText,
                                        { color: getStatusColor(selectedReport.status) },
                                    ]}
                                >
                                    {getStatusLabel(selectedReport.status).toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapPlaceholder: {
        width: width,
        height: height * 0.35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContent: {
        alignItems: 'center',
        padding: 40,
    },
    placeholderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    placeholderText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    placeholderSubtext: {
        fontSize: 12,
        textAlign: 'center',
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
    },
    webScrollView: {
        flex: 1,
        marginTop: 20,
    },
    reportsList: {
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        marginBottom: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    reportsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    reportItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    reportMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    reportInfo: {
        flex: 1,
    },
    reportType: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    reportDescription: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '600',
    },
    reportCard: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    reportTypeDetail: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    reportDescriptionDetail: {
        fontSize: 14,
    },
    reportDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
