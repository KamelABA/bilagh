import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// Tiaret, Algeria coordinates
const TIARET_CENTER = { latitude: 35.3711, longitude: 1.3171 };

export default function MunicipalMapScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const webViewRef = useRef<WebView>(null);

    const [location, setLocation] = useState(TIARET_CENTER);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const fetchReports = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const url = selectedStatus === 'all'
                ? API_ENDPOINTS.MUNICIPAL_ALL_REPORTS
                : `${API_ENDPOINTS.MUNICIPAL_REPORTS}?status=${selectedStatus}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setReports(data);
                // Update map markers
                if (webViewRef.current) {
                    webViewRef.current.postMessage(JSON.stringify({ type: 'updateMarkers', reports: data }));
                }
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedStatus]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FFD200';
            case 'verified': return '#0B5394';
            case 'approved': return '#4A7C2C';
            case 'rejected': return '#FF4B2B';
            case 'assigned': return '#764ba2';
            case 'in-progress': return '#FF6B6B';
            case 'resolved': return '#4A7C2C';
            default: return '#999';
        }
    };

    const generateMapHtml = () => {
        const markers = reports.map(report => {
            // Need to handle missing coords, defaulting if necessary or skipping
            if (!report.latitude || !report.longitude) return '';

            const color = getStatusColor(report.status);
            return `
                L.marker([${report.latitude}, ${report.longitude}], {
                    icon: L.divIcon({
                        className: 'custom-marker-${report.id}',
                        html: \`<div style="
                            width: 30px;
                            height: 30px;
                            background: ${color};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <span style="transform: rotate(45deg); color: white; font-size: 14px;">📍</span>
                        </div>\`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                })
                .addTo(map)
                .on('click', () => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'markerClick',
                        reportId: ${report.id}
                    }));
                });
            `;
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; }
                    #map { width: 100vw; height: 100vh; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    var map = L.map('map', { zoomControl: false }).setView([${location.latitude}, ${location.longitude}], 13);
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '©OpenStreetMap, ©CartoDB'
                    }).addTo(map);

                    // Add markers
                    ${markers}

                    // Handle messages from React Native
                    document.addEventListener('message', function(event) {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.type === 'updateMarkers') {
                                // Logic to clear and re-add markers would go here
                                // For simplicity we might just reload the page in React Native logic
                            }
                        } catch (e) {}
                    });
                </script>
            </body>
            </html>
        `;
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerClick') {
                const report = reports.find(r => r.id === data.reportId);
                if (report) {
                    setSelectedReport(report);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const FilterPill = ({ label, value, color }: { label: string, value: string, color: string }) => (
        <TouchableOpacity
            style={[
                styles.filterPill,
                selectedStatus === value && { backgroundColor: color, borderColor: color }
            ]}
            onPress={() => setSelectedStatus(value)}
        >
            <Text style={[
                styles.filterText,
                selectedStatus === value ? { color: '#fff' } : { color: isDark ? '#fff' : '#000' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.filterContainer}>
                <View style={styles.filterScroll}>
                    <FilterPill label={t('municipal.filter_all')} value="all" color="#666" />
                    <FilterPill label={t('municipal.filter_verified')} value="verified" color="#0B5394" />
                    <FilterPill label={t('municipal.filter_approved')} value="approved" color="#4A7C2C" />
                    <FilterPill label={t('municipal.filter_pending')} value="pending" color="#FFD200" />
                </View>
            </View>

            <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: generateMapHtml() }}
                onMessage={handleMessage}
            />

            {selectedReport && (
                <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedReport.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(selectedReport.status) }]}>
                                {selectedReport.status.toUpperCase()}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedReport(null)}>
                            <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>{selectedReport.type}</Text>
                    <Text style={[styles.cardText, { color: isDark ? '#ccc' : '#666' }]}>{selectedReport.location}</Text>
                    <Text style={[styles.cardDesc, { color: isDark ? '#ccc' : '#666' }]} numberOfLines={2}>
                        {selectedReport.description}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    filterContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 20,
    },
    filterScroll: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterText: {
        fontWeight: '600',
        fontSize: 12,
    },
    card: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardText: {
        fontSize: 14,
        marginBottom: 8,
    },
    cardDesc: {
        fontSize: 13,
    },
});
