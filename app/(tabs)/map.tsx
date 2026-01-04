import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Tiaret, Algeria coordinates - 50km radius (~0.45 degrees)
const TIARET_CENTER = { latitude: 35.3711, longitude: 1.3171 };
const TIARET_BOUNDS = {
    north: 35.82,   // ~50km north
    south: 34.92,   // ~50km south
    east: 1.87,     // ~50km east
    west: 0.77,     // ~50km west
};

interface DamageReport {
    id: number;
    latitude: number;
    longitude: number;
    type: string;
    typeKey: string;
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'resolved';
    description: string;
    createdAt: string;
}

export default function MapScreen() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const webViewRef = useRef<WebView>(null);

    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [damageReports, setDamageReports] = useState<DamageReport[]>([]);

    // Fetch user's reports from API
    const fetchReports = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(API_ENDPOINTS.REPORTS, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                // Transform API data to match DamageReport interface
                const reports: DamageReport[] = data
                    .filter((r: any) => r.latitude && r.longitude)
                    .map((r: any) => ({
                        id: r.id,
                        latitude: r.latitude,
                        longitude: r.longitude,
                        type: r.type,
                        typeKey: r.type === 'pothole' ? 'D40' : r.type === 'crack' ? 'D00' : 'D50',
                        severity: r.severity as 'low' | 'medium' | 'high',
                        status: r.status as 'pending' | 'in-progress' | 'resolved',
                        description: r.description || r.location,
                        createdAt: r.created_at,
                    }));
                setDamageReports(reports);
            }
        } catch (error) {
            console.error('Error fetching reports for map:', error);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    // Default to Tiaret center if permission denied
                    setLocation(TIARET_CENTER);
                    setLoading(false);
                    return;
                }

                const currentLocation = await Location.getCurrentPositionAsync({});

                // Check if user is within Tiaret bounds
                const { latitude, longitude } = currentLocation.coords;
                if (
                    latitude >= TIARET_BOUNDS.south &&
                    latitude <= TIARET_BOUNDS.north &&
                    longitude >= TIARET_BOUNDS.west &&
                    longitude <= TIARET_BOUNDS.east
                ) {
                    setLocation({ latitude, longitude });
                } else {
                    // User is outside Tiaret, show Tiaret center
                    setLocation(TIARET_CENTER);
                }
            } catch (error) {
                // Default to Tiaret center
                setLocation(TIARET_CENTER);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return '#FF4B2B';
            case 'medium': return '#FFD200';
            case 'low': return '#4ECDC4';
            default: return '#999';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FF6B6B';
            case 'in-progress': return '#FFE66D';
            case 'resolved': return '#4ECDC4';
            default: return '#999';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return t('reports.pending');
            case 'in-progress': return t('reports.inProgress');
            case 'resolved': return t('reports.resolved');
            default: return status;
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high': return t('map.high');
            case 'medium': return t('map.medium');
            case 'low': return t('map.low');
            default: return severity;
        }
    };

    const getMarkerIcon = (severity: string) => {
        const color = getSeverityColor(severity);
        return `
            <div style="
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
                <span style="transform: rotate(45deg); color: white; font-size: 14px;">⚠</span>
            </div>
        `;
    };

    // Generate the HTML for the map
    const generateMapHtml = () => {
        if (!location) return '';

        const markers = damageReports.map(report => `
            L.marker([${report.latitude}, ${report.longitude}], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: \`<div style="
                        width: 32px;
                        height: 32px;
                        background: ${getSeverityColor(report.severity)};
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    "><span style="transform: rotate(45deg); color: white; font-size: 16px; font-weight: bold;">!</span></div>\`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                })
            }).addTo(map)
            .bindPopup(\`
                <div style="min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${report.type}</h3>
                    <p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">${report.description}</p>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="
                            background: ${getSeverityColor(report.severity)}20;
                            color: ${getSeverityColor(report.severity)};
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 600;
                        ">${getSeverityLabel(report.severity).toUpperCase()}</span>
                        <span style="
                            background: ${getStatusColor(report.status)}20;
                            color: ${getStatusColor(report.status)};
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 600;
                        ">${getStatusLabel(report.status).toUpperCase()}</span>
                    </div>
                    <p style="margin: 8px 0 0 0; color: #999; font-size: 11px;">${report.createdAt}</p>
                </div>
            \`, { maxWidth: 300 })
            .on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', reportId: ${report.id} }));
            });
        `).join('\n');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body, #map { 
                        width: 100%; 
                        height: 100%; 
                        background: ${isDark ? '#1a1a1a' : '#f5f5f5'};
                    }
                    .custom-marker { background: transparent !important; border: none !important; }
                    .leaflet-popup-content-wrapper {
                        border-radius: 12px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    .leaflet-popup-tip {
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    .user-location-marker {
                        width: 20px;
                        height: 20px;
                        background: #667eea;
                        border: 4px solid white;
                        border-radius: 50%;
                        box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3), 0 2px 10px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    // Tiaret boundaries
                    var tiaretBounds = L.latLngBounds(
                        L.latLng(${TIARET_BOUNDS.south}, ${TIARET_BOUNDS.west}),
                        L.latLng(${TIARET_BOUNDS.north}, ${TIARET_BOUNDS.east})
                    );

                    var map = L.map('map', {
                        zoomControl: true,
                        attributionControl: true,
                        maxBounds: tiaretBounds,
                        maxBoundsViscosity: 1.0,
                        minZoom: 10,
                        maxZoom: 18,
                    }).setView([${location.latitude}, ${location.longitude}], 12);

                    // Add OpenStreetMap tiles
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap | Tiaret, Algeria',
                        maxZoom: 18,
                        minZoom: 10,
                    }).addTo(map);

                    // Add Tiaret boundary rectangle
                    L.rectangle(tiaretBounds, {
                        color: '#667eea',
                        weight: 2,
                        fillOpacity: 0,
                        dashArray: '5, 10',
                    }).addTo(map);

                    // Add user location marker
                    L.marker([${location.latitude}, ${location.longitude}], {
                        icon: L.divIcon({
                            className: 'user-location',
                            html: '<div class="user-location-marker"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                        })
                    }).addTo(map)
                    .bindPopup('<div style="text-align: center; font-family: sans-serif;"><strong>${t('map.yourLocation')}</strong></div>');

                    // Add damage markers
                    ${markers}

                    // Notify React Native that map is ready
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
                </script>
            </body>
            </html>
        `;
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'mapReady') {
                setMapReady(true);
            } else if (data.type === 'markerClick') {
                const report = damageReports.find(r => r.id === data.reportId);
                if (report) {
                    setSelectedReport(report);
                }
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    const centerOnLocation = () => {
        if (location && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                map.setView([${location.latitude}, ${location.longitude}], 15);
                true;
            `);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={[styles.loadingText, { color: isDark ? '#999' : '#666' }]}>
                    {t('map.loadingMap')}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Map WebView */}
            {location && (
                <WebView
                    ref={webViewRef}
                    source={{ html: generateMapHtml() }}
                    style={styles.map}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={[styles.mapLoading, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
                            <ActivityIndicator size="large" color="#667eea" />
                        </View>
                    )}
                />
            )}

            {/* Header Overlay */}
            <View style={[styles.header, { backgroundColor: isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('map.roadDamageMap')}
                </Text>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF4B2B' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.high')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFD200' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.medium')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>{t('map.low')}</Text>
                    </View>
                </View>
            </View>

            {/* Location Button */}
            <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                onPress={centerOnLocation}
            >
                <IconSymbol name="location.fill" size={24} color="#667eea" />
            </TouchableOpacity>

            {/* Reports List Button */}
            <TouchableOpacity
                style={[styles.listButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                onPress={() => setSelectedReport(damageReports[0])}
            >
                <IconSymbol name="list.bullet" size={24} color="#667eea" />
                <View style={styles.reportCountBadge}>
                    <Text style={styles.reportCountText}>{damageReports.length}</Text>
                </View>
            </TouchableOpacity>

            {/* Selected Report Card */}
            {selectedReport && (
                <View style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    <View style={styles.reportCardHeader}>
                        <View style={[styles.reportTypeIcon, { backgroundColor: getSeverityColor(selectedReport.severity) }]}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#fff" />
                        </View>
                        <View style={styles.reportCardInfo}>
                            <Text style={[styles.reportCardType, { color: isDark ? '#fff' : '#000' }]}>
                                {selectedReport.type}
                            </Text>
                            <Text style={[styles.reportCardDescription, { color: isDark ? '#999' : '#666' }]}>
                                {selectedReport.description}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedReport(null)}>
                            <IconSymbol name="xmark.circle.fill" size={28} color={isDark ? '#666' : '#999'} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.reportCardDetails}>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: isDark ? '#999' : '#666' }]}>
                                {t('reports.severity')}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: getSeverityColor(selectedReport.severity) + '20' }]}>
                                <Text style={[styles.badgeText, { color: getSeverityColor(selectedReport.severity) }]}>
                                    {getSeverityLabel(selectedReport.severity).toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: isDark ? '#999' : '#666' }]}>
                                {t('reports.status')}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: getStatusColor(selectedReport.status) + '20' }]}>
                                <Text style={[styles.badgeText, { color: getStatusColor(selectedReport.status) }]}>
                                    {getStatusLabel(selectedReport.status).toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.navigateButton}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.navigateButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <IconSymbol name="arrow.triangle.turn.up.right.diamond.fill" size={18} color="#fff" />
                            <Text style={styles.navigateButtonText}>{t('map.navigate')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reports Summary */}
            <View style={[styles.summaryBar, { backgroundColor: isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#FF4B2B' }]}>
                        {damageReports.filter(r => r.status === 'pending').length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#999' : '#666' }]}>
                        {t('reports.pending')}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#FFE66D' }]}>
                        {damageReports.filter(r => r.status === 'in-progress').length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#999' : '#666' }]}>
                        {t('reports.inProgress')}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: '#4ECDC4' }]}>
                        {damageReports.filter(r => r.status === 'resolved').length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#999' : '#666' }]}>
                        {t('reports.resolved')}
                    </Text>
                </View>
            </View>
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
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 16,
        right: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
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
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: 6,
    },
    legendText: {
        fontSize: 13,
        fontWeight: '500',
    },
    locationButton: {
        position: 'absolute',
        right: 16,
        bottom: 180,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    listButton: {
        position: 'absolute',
        right: 16,
        bottom: 240,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    reportCountBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF4B2B',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    reportCard: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    reportCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    reportTypeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    reportCardInfo: {
        flex: 1,
    },
    reportCardType: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    reportCardDescription: {
        fontSize: 13,
    },
    reportCardDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
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
        fontWeight: '700',
    },
    navigateButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    navigateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    navigateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    summaryBar: {
        position: 'absolute',
        bottom: 30,
        left: 16,
        right: 16,
        borderRadius: 16,
        flexDirection: 'row',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryCount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    summaryLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: 'rgba(128,128,128,0.2)',
        marginVertical: 4,
    },
});
