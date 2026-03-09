import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (latitude: number, longitude: number, address: string) => void;
}

const ALGERIA_CENTER = { lat: 28.0339, lng: 1.6596 };

export default function LocationPickerModal({ visible, onClose, onSelect }: LocationPickerModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const webViewRef = useRef<WebView>(null);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const mapHtml = `
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
                .pin-marker { background: transparent !important; border: none !important; }
                .tap-hint {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.7); color: white;
                    padding: 8px 16px; border-radius: 20px; font-size: 13px;
                    font-family: sans-serif; white-space: nowrap; z-index: 9999; pointer-events: none;
                }
                .coords-display {
                    position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
                    background: rgba(11,83,148,0.9); color: white;
                    padding: 6px 14px; border-radius: 20px; font-size: 12px;
                    font-family: monospace; white-space: nowrap; z-index: 9999; pointer-events: none;
                    display: none;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <div class="tap-hint" id="hint">👆 اضغط على الخريطة لتحديد الموقع / Tap to select location</div>
            <div class="coords-display" id="coords-display"></div>
            <script>
                var map = L.map('map', { zoomControl: true, minZoom: 5, maxZoom: 18 })
                    .setView([${ALGERIA_CENTER.lat}, ${ALGERIA_CENTER.lng}], 6);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap', maxZoom: 18
                }).addTo(map);

                var pinMarker = null;

                map.on('click', function(e) {
                    var lat = Math.round(e.latlng.lat * 1000000) / 1000000;
                    var lng = Math.round(e.latlng.lng * 1000000) / 1000000;

                    if (pinMarker) { pinMarker.remove(); }

                    pinMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'pin-marker',
                            html: '<div style="font-size:36px;margin-top:-36px;margin-left:-12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</div>',
                            iconSize: [24, 36], iconAnchor: [12, 36]
                        })
                    }).addTo(map);

                    // Update coords display
                    var coordsEl = document.getElementById('coords-display');
                    coordsEl.style.display = 'block';
                    coordsEl.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);

                    // Hide hint
                    document.getElementById('hint').style.display = 'none';

                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationPicked', lat: lat, lng: lng }));
                });

                setTimeout(function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
                }, 300);
            </script>
        </body>
        </html>
    `;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'mapReady') {
                setMapReady(true);
                // Try to pan to user's real location
                Location.getForegroundPermissionsAsync().then(({ status }) => {
                    if (status === 'granted') {
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(pos => {
                            webViewRef.current?.injectJavaScript(`
                                map.setView([${pos.coords.latitude}, ${pos.coords.longitude}], 14);
                                true;
                            `);
                        }).catch(() => { });
                    }
                });
            } else if (data.type === 'locationPicked') {
                setSelectedCoords({ lat: data.lat, lng: data.lng });
            }
        } catch (e) { }
    };

    const handleConfirm = async () => {
        if (!selectedCoords) return;
        setIsGeocoding(true);
        try {
            const [address] = await Location.reverseGeocodeAsync({
                latitude: selectedCoords.lat,
                longitude: selectedCoords.lng,
            });
            const parts = [address?.street, address?.district, address?.city, address?.region]
                .filter(Boolean);
            const addressStr = parts.length > 0
                ? parts.join(', ')
                : `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`;
            onSelect(selectedCoords.lat, selectedCoords.lng, addressStr);
            setSelectedCoords(null);
            onClose();
        } catch {
            // Fallback to coordinates
            onSelect(
                selectedCoords.lat,
                selectedCoords.lng,
                `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`
            );
            setSelectedCoords(null);
            onClose();
        } finally {
            setIsGeocoding(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#0B5394' }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <IconSymbol name="xmark" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>اختر الموقع / Pick Location</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Map */}
                <View style={styles.mapContainer}>
                    <WebView
                        ref={webViewRef}
                        source={{ html: mapHtml }}
                        style={styles.map}
                        onMessage={handleMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        cacheEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={[styles.mapLoading, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
                                <ActivityIndicator size="large" color="#0B5394" />
                                <Text style={{ color: isDark ? '#fff' : '#333', marginTop: 12 }}>
                                    Loading map...
                                </Text>
                            </View>
                        )}
                    />
                </View>

                {/* Bottom Bar */}
                <View style={[styles.bottomBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                    {selectedCoords ? (
                        <>
                            <View style={styles.coordsInfo}>
                                <IconSymbol name="location.fill" size={16} color="#0B5394" />
                                <Text style={[styles.coordsText, { color: isDark ? '#ccc' : '#333' }]}>
                                    {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.confirmBtn, isGeocoding && { opacity: 0.7 }]}
                                onPress={handleConfirm}
                                disabled={isGeocoding}
                            >
                                {isGeocoding ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <IconSymbol name="checkmark" size={18} color="#fff" />
                                )}
                                <Text style={styles.confirmBtnText}>
                                    {isGeocoding ? 'Getting address...' : 'Confirm Location'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <Text style={[styles.hintText, { color: isDark ? '#999' : '#666' }]}>
                            👆 Tap anywhere on the map to choose your location
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    mapContainer: { flex: 1 },
    map: { flex: 1 },
    mapLoading: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
    },
    bottomBar: {
        padding: 16, paddingBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
        minHeight: 80, justifyContent: 'center',
    },
    coordsInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
    coordsText: { fontSize: 13, fontFamily: 'monospace' },
    confirmBtn: {
        backgroundColor: '#0B5394', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    hintText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
});
