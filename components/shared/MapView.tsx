import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_ENDPOINTS } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Algeria coordinates - entire country
const ALGERIA_CENTER = { latitude: 28.0339, longitude: 1.6596 };
const ALGERIA_BOUNDS = {
    north: 37.1,    // Mediterranean coast
    south: 18.9,    // Southern border
    east: 12.0,     // Eastern border (Tunisia/Libya)
    west: -8.7,     // Western border (Morocco)
};

interface DamageReport {
    id: number | string;
    latitude: number;
    longitude: number;
    type: string;
    typeKey?: string;
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'resolved' | 'verified' | 'approved' | 'rejected' | 'assigned';
    description: string;
    location?: string;
    createdAt?: string;
    created_at?: string;
}

interface MapViewProps {
    userType: 'citizen' | 'agent' | 'municipal';
}

export default function MapView({ userType }: MapViewProps) {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isDark = colorScheme === 'dark';
    const webViewRef = useRef<WebView>(null);

    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Get color scheme based on user type
    const getThemeColor = () => {
        switch (userType) {
            case 'agent': return '#0B5394';
            case 'municipal': return '#4A7C2C';
            default: return '#667eea';
        }
    };

    const themeColor = getThemeColor();

    // Fetch reports based on user type
    const fetchReports = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log(`[Map] Token found: ${!!token}, userType: ${userType}`);
            if (!token) {
                console.warn('[Map] No token - user not logged in');
                return;
            }

            // All user types see ALL reports on the map
            let endpoint = API_ENDPOINTS.MAP_REPORTS;

            if (userType === 'municipal' && statusFilter !== 'all') {
                endpoint = `${API_ENDPOINTS.MUNICIPAL_REPORTS}?status=${statusFilter}`;
            } else if (userType === 'municipal' && statusFilter === 'all') {
                endpoint = API_ENDPOINTS.MUNICIPAL_ALL_REPORTS;
            }

            console.log(`[Map] Fetching: ${endpoint}`);

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            console.log(`[Map] Response status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`[Map] Raw data count: ${data.length}`);

                const reports: DamageReport[] = data
                    .filter((r: any) => r.latitude && r.longitude)
                    .map((r: any) => ({
                        id: r.id,
                        latitude: r.latitude,
                        longitude: r.longitude,
                        type: r.type,
                        typeKey: r.type === 'pothole' ? 'D40' : r.type === 'crack' ? 'D00' : 'D50',
                        severity: r.severity as 'low' | 'medium' | 'high',
                        status: r.status,
                        description: r.description || r.location || '',
                        location: r.location,
                        createdAt: r.created_at || r.createdAt,
                    }));
                setDamageReports(reports);
                console.log(`[Map] Loaded ${reports.length} reports for ${userType} (filter: ${statusFilter})`);
            } else {
                const errText = await response.text();
                console.error(`[Map] Fetch failed: ${response.status} - ${errText}`);
            }
        } catch (error) {
            console.error('[Map] Error fetching reports:', error);
        }
    }, [userType, statusFilter]);


    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Inject markers into WebView whenever reports change
    useEffect(() => {
        if (!mapReady || !webViewRef.current) return;

        const reportsToShow = statusFilter === 'all'
            ? damageReports
            : damageReports.filter(r => r.status === statusFilter);

        console.log(`[Map] Injecting ${reportsToShow.length} markers into WebView`);

        // Safely pass reports as JSON - avoids all string escaping issues
        const reportsJson = JSON.stringify(reportsToShow.map(r => ({
            id: r.id,
            lat: r.latitude,
            lng: r.longitude,
            type: r.type || 'damage',
            severity: r.severity || 'medium',
            desc: r.description || r.location || '',
            status: r.status || 'pending',
        })));

        const js = `
            try {
                var reports = ${reportsJson};
                if (!window.leafletMap) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError', message: 'window.leafletMap is not defined' }));
                } else {
                    if (window._damageLayer) {
                        window._damageLayer.clearLayers();
                    } else {
                        window._damageLayer = L.layerGroup().addTo(window.leafletMap);
                    }
                    reports.forEach(function(r) {
                        var color = r.severity === 'high' ? '#FF4B2B'
                                  : r.severity === 'medium' ? '#FFD200' : '#4ECDC4';
                        var marker = L.marker([r.lat, r.lng], {
                            icon: L.divIcon({
                                className: 'custom-marker',
                                html: '<div style="width:32px;height:32px;background:' + color + ';border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>',
                                iconSize: [32, 32],
                                iconAnchor: [16, 32],
                            })
                        }).addTo(window._damageLayer);
                        marker.bindPopup('<div style="text-align:center;font-family:sans-serif"><strong>' + r.type + '</strong><br><small>' + r.desc + '</small><br><em>' + r.status + '</em></div>');
                        marker.on('click', function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', reportId: r.id }));
                        });
                    });
                }
            } catch(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError', message: e.toString() }));
            }
            true;
        `;
        webViewRef.current.injectJavaScript(js);
    }, [damageReports, statusFilter, mapReady]);

    // GPS runs in background — map already shows immediately with Algeria center
    useEffect(() => {
        (async () => {
            try {
                if (userType === 'agent') {
                    const targetLocation = (global as any).mapTargetLocation;
                    if (targetLocation) {
                        setUserLocation({ latitude: targetLocation.latitude, longitude: targetLocation.longitude });
                        (global as any).mapTargetLocation = null;
                        return;
                    }
                }
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const { latitude, longitude } = currentLocation.coords;
                if (
                    latitude >= ALGERIA_BOUNDS.south && latitude <= ALGERIA_BOUNDS.north &&
                    longitude >= ALGERIA_BOUNDS.west && longitude <= ALGERIA_BOUNDS.east
                ) {
                    setUserLocation({ latitude, longitude });
                }
            } catch (error) {
                // GPS failed — map already visible, no action needed
            }
        })();
    }, [userType]);

    // When map is ready AND GPS resolves, pan to user and add marker
    useEffect(() => {
        if (!mapReady || !webViewRef.current || !userLocation) return;
        const { latitude, longitude } = userLocation;
        webViewRef.current.injectJavaScript(`
            try {
                if (window.leafletMap) {
                    if (window._userMarker) { window._userMarker.remove(); }
                    window._userMarker = L.marker([${latitude}, ${longitude}], {
                        icon: L.divIcon({
                            className: 'user-location',
                            html: '<div class="user-location-marker"></div>',
                            iconSize: [20, 20], iconAnchor: [10, 10]
                        })
                    }).addTo(window.leafletMap)
                    .bindPopup('<div style="text-align:center;font-family:sans-serif"><strong>📍 موقعك / Your Location</strong></div>');
                    window.leafletMap.setView([${latitude}, ${longitude}], 14);
                }
            } catch(e) {}
            true;
        `);
    }, [mapReady, userLocation]);

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
            case 'pending': return userType === 'municipal' ? '#FFD200' : '#FF6B6B';
            case 'in-progress': return '#FFE66D';
            case 'resolved': return '#4ECDC4';
            case 'verified': return '#0B5394';
            case 'approved': return '#4A7C2C';
            case 'rejected': return '#FF4B2B';
            case 'assigned': return '#764ba2';
            default: return '#999';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return t('reports.pending');
            case 'in-progress': return t('reports.inProgress');
            case 'resolved': return t('reports.resolved');
            case 'verified': return userType === 'municipal' ? t('municipal.filter_verified') : status;
            case 'approved': return userType === 'municipal' ? t('municipal.filter_approved') : status;
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

    const filteredReports = statusFilter === 'all'
        ? damageReports
        : damageReports.filter(r => r.status === statusFilter);

    const FilterPill = ({ label, value, color }: { label: string; value: string; color: string }) => (
        <TouchableOpacity
            style={[
                styles.filterPill,
                statusFilter === value && { backgroundColor: color, borderColor: color }
            ]}
            onPress={() => setStatusFilter(value)}
        >
            <Text style={[
                styles.filterPillText,
                statusFilter === value ? { color: '#fff' } : { color: isDark ? '#fff' : '#333' }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    // Map HTML is static — no GPS dependency, loads immediately
    const mapHtml = useMemo(() => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body, #map { width: 100%; height: 100%; background: ${isDark ? '#1a1a1a' : '#f5f5f5'}; }
                .custom-marker { background: transparent !important; border: none !important; }
                .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                .leaflet-popup-tip { box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                .user-location-marker {
                    width: 20px; height: 20px;
                    background: ${themeColor};
                    border: 4px solid white; border-radius: 50%;
                    box-shadow: 0 0 0 8px rgba(${themeColor === '#667eea' ? '102,126,234' : themeColor === '#0B5394' ? '11,83,148' : '74,124,44'}, 0.3), 0 2px 10px rgba(0,0,0,0.3);
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                if (!window.leafletMap) {
                    var algeriaBounds = L.latLngBounds(
                        L.latLng(${ALGERIA_BOUNDS.south}, ${ALGERIA_BOUNDS.west}),
                        L.latLng(${ALGERIA_BOUNDS.north}, ${ALGERIA_BOUNDS.east})
                    );
                    window.leafletMap = L.map('map', {
                        zoomControl: true, attributionControl: true,
                        maxBounds: algeriaBounds, maxBoundsViscosity: 1.0,
                        minZoom: 5, maxZoom: 18,
                    }).setView([${ALGERIA_CENTER.latitude}, ${ALGERIA_CENTER.longitude}], 6);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '\u00a9 OpenStreetMap | Algeria',
                        maxZoom: 18, minZoom: 5,
                    }).addTo(window.leafletMap);
                    // Notify React Native immediately — no GPS wait
                    setTimeout(function() {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
                    }, 300);
                }
            </script>
        </body>
        </html>
    `, [isDark, themeColor]);

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'mapReady') {
                console.log('[Map] WebView mapReady received — fetching reports now');
                setMapReady(true);
                // Fetch reports right after map is ready to guarantee injection timing
                fetchReports();
            } else if (data.type === 'markerClick') {
                const report = damageReports.find(r => r.id == data.reportId);
                if (report) {
                    setSelectedReport(report);
                }
            } else if (data.type === 'mapError') {
                console.error('[Map Error Inside WebView]:', data.message);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    const centerOnLocation = () => {
        if (!webViewRef.current) return;
        const target = userLocation || ALGERIA_CENTER;
        const zoom = userLocation ? 15 : 6;
        webViewRef.current.injectJavaScript(`
            if (window.leafletMap) window.leafletMap.setView([${target.latitude}, ${target.longitude}], ${zoom});
            true;
        `);
    };

    const renderFilters = () => {
        if (userType === 'municipal') {
            return (
                <>
                    <FilterPill label={t('municipal.filter_all')} value="all" color="#666" />
                    <FilterPill label={t('municipal.filter_verified')} value="verified" color="#0B5394" />
                    <FilterPill label={t('municipal.filter_approved')} value="approved" color="#4A7C2C" />
                    <FilterPill label={t('municipal.filter_pending')} value="pending" color="#FFD200" />
                </>
            );
        } else {
            return (
                <>
                    <FilterPill label={t('reports.all')} value="all" color="#666" />
                    <FilterPill label={t('reports.pending')} value="pending" color="#FF6B6B" />
                    <FilterPill label={t('reports.inProgress')} value="in-progress" color="#FFE66D" />
                    <FilterPill label={t('reports.resolved')} value="resolved" color="#4ECDC4" />
                </>
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
            {/* Map WebView */}
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={[styles.mapLoading, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
                        <ActivityIndicator size="large" color={themeColor} />
                    </View>
                )}
            />

            {/* Header Overlay */}
            <View style={[styles.header, { backgroundColor: isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                    {t('map.roadDamageMap')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {renderFilters()}
                </ScrollView>
            </View>

            {/* Location Button */}
            <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                onPress={centerOnLocation}
            >
                <IconSymbol name="location.fill" size={24} color={themeColor} />
            </TouchableOpacity>

            {/* Reports List Button */}
            {userType !== 'municipal' && (
                <TouchableOpacity
                    style={[styles.listButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                    onPress={() => setSelectedReport(filteredReports[0])}
                >
                    <IconSymbol name="list.bullet" size={24} color={themeColor} />
                    <View style={styles.reportCountBadge}>
                        <Text style={styles.reportCountText}>{filteredReports.length}</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Selected Report Card */}
            {selectedReport && userType !== 'municipal' && (
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
                            colors={userType === 'agent' ? ['#0B5394', '#4A7C2C'] : ['#667eea', '#764ba2']}
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

            {/* Municipal Report Card - Simplified */}
            {selectedReport && userType === 'municipal' && (
                <View style={[styles.municipalCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
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
                    <Text style={[styles.cardText, { color: isDark ? '#ccc' : '#666' }]}>{selectedReport.location || selectedReport.description}</Text>
                </View>
            )}

            {/* Reports Summary - Only for citizen and agent */}
            {userType !== 'municipal' && (
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
            )}
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
    filterRow: {
        marginTop: 8,
    },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(150,150,150,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.3)',
        marginRight: 8,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Municipal card styles
    municipalCard: {
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
});
