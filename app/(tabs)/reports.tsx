import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ReportsScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState<'submit' | 'reports'>('submit');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

    // Listen for photo from camera
    useEffect(() => {
        const photoUri = (global as any).capturedPhotoUri;
        if (photoUri) {
            setCapturedPhoto(photoUri);
            (global as any).capturedPhotoUri = null;
        }
    }, []);

    // Mock data
    const reports = [
        { id: 1, type: 'Pothole', location: 'Main St', status: 'pending', date: '2h ago' },
        { id: 2, type: 'Crack', location: 'Oak Ave', status: 'pending', date: '1d ago' },
    ];

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
                <Text style={styles.headerTitle}>Reports</Text>
                <Text style={styles.headerSubtitle}>
                    {activeTab === 'submit' ? 'Submit new damage report' : `${reports.length} total reports`}
                </Text>

                {/* Tab Switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('submit')}
                        activeOpacity={0.7}
                        style={[
                            styles.tab,
                            activeTab === 'submit' && styles.activeTab,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: activeTab === 'submit' ? '#0B5394' : '#fff' },
                            ]}
                        >
                            Submit
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('reports')}
                        activeOpacity={0.7}
                        style={[
                            styles.tab,
                            activeTab === 'reports' && styles.activeTab,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: activeTab === 'reports' ? '#0B5394' : '#fff' },
                            ]}
                        >
                            My Reports
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {activeTab === 'submit' ? (
                // Submit Form
                <ScrollView style={styles.content}>
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Damage Type</Text>
                        <View style={[styles.input, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <TextInput
                                placeholder="Select type..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                style={{ color: isDark ? '#fff' : '#000', flex: 1 }}
                            />
                        </View>
                    </View>
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Location</Text>
                        <View style={[styles.input, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <IconSymbol name="location.fill" size={20} color="#0B5394" />
                            <TextInput
                                placeholder="Enter location..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                style={{ color: isDark ? '#fff' : '#000', flex: 1, marginLeft: 8 }}
                            />
                        </View>
                    </View>
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Description</Text>
                        <View style={[styles.textArea, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                            <TextInput
                                placeholder="Describe the damage..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                style={{ color: isDark ? '#fff' : '#000' }}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Photo</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/camera')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.photoUpload, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                                {capturedPhoto ? (
                                    <View style={styles.photoPreview}>
                                        <Image
                                            source={{ uri: capturedPhoto }}
                                            style={styles.previewImage}
                                        />
                                        <TouchableOpacity
                                            style={styles.changePhotoButton}
                                            onPress={() => router.push('/camera')}
                                        >
                                            <IconSymbol name="camera.fill" size={16} color="#fff" />
                                            <Text style={styles.changePhotoText}>Change Photo</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <IconSymbol name="camera.fill" size={40} color={isDark ? '#666' : '#999'} />
                                        <Text style={[styles.photoPlaceholderText, { color: isDark ? '#666' : '#999' }]}>
                                            Tap to take photo
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#0B5394', '#4A7C2C']}
                            style={styles.submitButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                            <Text style={styles.submitText}>Submit Report</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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
                        {['all', 'pending'].map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setSelectedFilter(filter)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.filterChip,
                                        {
                                            backgroundColor:
                                                selectedFilter === filter
                                                    ? '#0B5394'
                                                    : isDark
                                                        ? '#1a1a1a'
                                                        : '#fff',
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterText,
                                            {
                                                color:
                                                    selectedFilter === filter
                                                        ? '#fff'
                                                        : isDark
                                                            ? '#999'
                                                            : '#666',
                                            },
                                        ]}
                                    >
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <ScrollView style={styles.list}>
                        {filteredReports.map((report) => (
                            <View
                                key={report.id}
                                style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                            >
                                <View style={styles.reportHeader}>
                                    <Text style={[styles.reportType, { color: isDark ? '#fff' : '#000' }]}>
                                        {report.type}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: '#FF6B6B20' }]}>
                                        <Text style={[styles.statusText, { color: '#FF6B6B' }]}>
                                            {report.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.reportFooter}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <IconSymbol name="location.fill" size={14} color={isDark ? '#999' : '#666'} />
                                        <Text style={[styles.reportLocation, { color: isDark ? '#999' : '#666' }]}>
                                            {report.location}
                                        </Text>
                                    </View>
                                    <Text style={[styles.reportDate, { color: isDark ? '#999' : '#666' }]}>
                                        {report.date}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </>
            )}
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
        marginBottom: 40,
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    filters: {
        marginVertical: 16,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 12,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
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
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    reportType: {
        fontSize: 18,
        fontWeight: 'bold',
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
    },
    reportDate: {
        fontSize: 12,
    },
});
