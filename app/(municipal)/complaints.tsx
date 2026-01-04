import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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

interface Report {
    id: number;
    type: string;
    location: string;
    description: string;
    status: string;
    severity: string;
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    user: {
        id: number;
        full_name: string | null;
        email: string;
        phone: string | null;
    };
}

interface Agent {
    id: number;
    name: string;
    email: string;
}

export default function ComplaintsScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';

    const [reports, setReports] = useState<Report[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('verified');
    const [processing, setProcessing] = useState(false);

    const fetchReports = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const url = selectedFilter === 'all'
                ? API_ENDPOINTS.MUNICIPAL_ALL_REPORTS
                : `${API_ENDPOINTS.MUNICIPAL_REPORTS}?status=${selectedFilter}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedFilter]);

    const fetchAgents = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(API_ENDPOINTS.MUNICIPAL_AGENTS, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setAgents(data);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    }, []);

    useEffect(() => {
        fetchReports();
        fetchAgents();
    }, [fetchReports, fetchAgents]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReports();
    }, [fetchReports]);

    const handleApprove = async () => {
        if (!selectedReport) return;
        setProcessing(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(
                `${API_ENDPOINTS.MUNICIPAL_APPROVE(selectedReport.id)}?notes=${encodeURIComponent(notes)}`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (response.ok) {
                Alert.alert(t('common.success'), t('municipal.reportApproved'));
                setShowActionModal(false);
                setSelectedReport(null);
                setNotes('');
                fetchReports();
            } else {
                Alert.alert(t('common.error'), t('municipal.actionFailed'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('municipal.actionFailed'));
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedReport) return;
        setProcessing(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(
                `${API_ENDPOINTS.MUNICIPAL_REJECT(selectedReport.id)}?notes=${encodeURIComponent(notes)}`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (response.ok) {
                Alert.alert(t('common.success'), t('municipal.reportRejected'));
                setShowActionModal(false);
                setSelectedReport(null);
                setNotes('');
                fetchReports();
            } else {
                Alert.alert(t('common.error'), t('municipal.actionFailed'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('municipal.actionFailed'));
        } finally {
            setProcessing(false);
        }
    };

    const handleAssign = async (agentId: number) => {
        if (!selectedReport) return;
        setProcessing(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(
                `${API_ENDPOINTS.MUNICIPAL_ASSIGN(selectedReport.id)}?agent_id=${agentId}&notes=${encodeURIComponent(notes)}`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (response.ok) {
                Alert.alert(t('common.success'), t('municipal.taskAssigned'));
                setShowAssignModal(false);
                setSelectedReport(null);
                setNotes('');
                fetchReports();
            } else {
                Alert.alert(t('common.error'), t('municipal.actionFailed'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('municipal.actionFailed'));
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FFD200';
            case 'verified': return '#0B5394';
            case 'approved': return '#4A7C2C';
            case 'rejected': return '#FF4B2B';
            case 'assigned': return '#4A7C2C';
            case 'in-progress': return '#FF6B6B';
            case 'resolved': return '#4A7C2C';
            default: return '#999';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#FF4B2B';
            case 'medium': return '#FFD200';
            case 'low': return '#4A7C2C';
            default: return '#999';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const filters = ['verified', 'approved', 'assigned', 'rejected', 'all'];

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <ActivityIndicator size="large" color="#0B5394" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>
                    {t('municipal.complaints')}
                </Text>
                <Text style={styles.headerSubtitle}>
                    {t('municipal.reviewAndApprove')}
                </Text>
            </LinearGradient>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        onPress={() => {
                            setSelectedFilter(filter);
                            setLoading(true);
                        }}
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
                            { color: selectedFilter === filter ? '#fff' : isDark ? '#999' : '#666' },
                        ]}>
                            {t(`municipal.filter_${filter}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Reports List */}
            <ScrollView
                style={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B5394']} />
                }
            >
                {reports.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <IconSymbol name="doc.text.fill" size={48} color={isDark ? '#333' : '#ddd'} />
                        <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('municipal.noReports')}
                        </Text>
                    </View>
                ) : (
                    reports.map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                            onPress={() => {
                                setSelectedReport(report);
                                setShowActionModal(true);
                            }}
                        >
                            {report.image_url && (
                                <Image source={{ uri: report.image_url }} style={styles.reportImage} />
                            )}
                            <View style={styles.reportContent}>
                                <View style={styles.reportHeader}>
                                    <Text style={[styles.reportType, { color: isDark ? '#fff' : '#000' }]}>
                                        {report.type}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                            {report.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.reportLocation, { color: isDark ? '#999' : '#666' }]} numberOfLines={1}>
                                    📍 {report.location}
                                </Text>
                                <View style={styles.reportMeta}>
                                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) + '20' }]}>
                                        <Text style={[styles.severityText, { color: getSeverityColor(report.severity) }]}>
                                            {report.severity.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={[styles.reportDate, { color: isDark ? '#666' : '#999' }]}>
                                        {formatDate(report.created_at)}
                                    </Text>
                                </View>
                                <Text style={[styles.reporterInfo, { color: isDark ? '#666' : '#999' }]}>
                                    {t('municipal.reportedBy')}: {report.user.full_name || report.user.email}
                                </Text>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color={isDark ? '#666' : '#999'} />
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Modal */}
            <Modal visible={showActionModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('municipal.reviewReport')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowActionModal(false)}>
                                <IconSymbol name="xmark.circle.fill" size={28} color={isDark ? '#666' : '#999'} />
                            </TouchableOpacity>
                        </View>

                        {selectedReport && (
                            <ScrollView style={styles.modalBody}>
                                {selectedReport.image_url && (
                                    <Image source={{ uri: selectedReport.image_url }} style={styles.modalImage} />
                                )}
                                <Text style={[styles.modalReportType, { color: isDark ? '#fff' : '#000' }]}>
                                    {selectedReport.type}
                                </Text>
                                <Text style={[styles.modalReportLocation, { color: isDark ? '#999' : '#666' }]}>
                                    📍 {selectedReport.location}
                                </Text>
                                {selectedReport.description && (
                                    <Text style={[styles.modalReportDesc, { color: isDark ? '#999' : '#666' }]}>
                                        {selectedReport.description}
                                    </Text>
                                )}

                                <Text style={[styles.inputLabel, { color: isDark ? '#fff' : '#000' }]}>
                                    {t('municipal.notes')}
                                </Text>
                                <TextInput
                                    style={[styles.notesInput, {
                                        backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
                                        color: isDark ? '#fff' : '#000'
                                    }]}
                                    placeholder={t('municipal.addNotes')}
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={3}
                                />

                                <View style={styles.actionButtons}>
                                    {selectedReport.status === 'verified' && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.rejectButton, processing && styles.disabledButton]}
                                                onPress={handleReject}
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <ActivityIndicator color="#fff" size="small" />
                                                ) : (
                                                    <>
                                                        <IconSymbol name="xmark" size={18} color="#fff" />
                                                        <Text style={styles.buttonText}>{t('municipal.reject')}</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.approveButton, processing && styles.disabledButton]}
                                                onPress={handleApprove}
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <ActivityIndicator color="#fff" size="small" />
                                                ) : (
                                                    <>
                                                        <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                                                        <Text style={styles.buttonText}>{t('municipal.approve')}</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}
                                    {selectedReport.status === 'approved' && (
                                        <TouchableOpacity
                                            style={styles.assignButton}
                                            onPress={() => {
                                                setShowActionModal(false);
                                                setShowAssignModal(true);
                                            }}
                                        >
                                            <LinearGradient
                                                colors={['#4A7C2C', '#2D5016']}
                                                style={styles.assignButtonGradient}
                                            >
                                                <IconSymbol name="person.fill" size={18} color="#fff" />
                                                <Text style={styles.buttonText}>{t('municipal.assignToAgent')}</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Assign Modal */}
            <Modal visible={showAssignModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('municipal.selectAgent')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                                <IconSymbol name="xmark.circle.fill" size={28} color={isDark ? '#666' : '#999'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.agentsList}>
                            {agents.map((agent) => (
                                <TouchableOpacity
                                    key={agent.id}
                                    style={[styles.agentCard, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}
                                    onPress={() => handleAssign(agent.id)}
                                    disabled={processing}
                                >
                                    <View style={styles.agentIcon}>
                                        <IconSymbol name="person.fill" size={24} color="#667eea" />
                                    </View>
                                    <View style={styles.agentInfo}>
                                        <Text style={[styles.agentName, { color: isDark ? '#fff' : '#000' }]}>
                                            {agent.name}
                                        </Text>
                                        <Text style={[styles.agentEmail, { color: isDark ? '#999' : '#666' }]}>
                                            {agent.email}
                                        </Text>
                                    </View>
                                    <IconSymbol name="chevron.right" size={20} color={isDark ? '#666' : '#999'} />
                                </TouchableOpacity>
                            ))}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
        color: 'rgba(255,255,255,0.8)',
    },
    filters: {
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
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
    reportImage: {
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reportType: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    reportLocation: {
        fontSize: 13,
        marginBottom: 8,
    },
    reportMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    severityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    severityText: {
        fontSize: 10,
        fontWeight: '600',
    },
    reportDate: {
        fontSize: 11,
    },
    reporterInfo: {
        fontSize: 11,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalReportType: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalReportLocation: {
        fontSize: 14,
        marginBottom: 8,
    },
    modalReportDesc: {
        fontSize: 14,
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    notesInput: {
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF4B2B',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A7C2C',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    assignButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    assignButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.6,
    },
    agentsList: {
        padding: 20,
    },
    agentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    agentIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    agentInfo: {
        flex: 1,
    },
    agentName: {
        fontSize: 16,
        fontWeight: '600',
    },
    agentEmail: {
        fontSize: 13,
        marginTop: 2,
    },
});
