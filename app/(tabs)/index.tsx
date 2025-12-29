import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';

  const stats = [
    { label: t('home.reports'), value: '127', icon: 'doc.text.fill', color: '#FF6B6B' },
    { label: t('home.fixed'), value: '89', icon: 'checkmark.circle.fill', color: '#4ECDC4' },
    { label: t('home.pending'), value: '38', icon: 'clock.fill', color: '#FFE66D' },
  ];

  const quickActions = [
    { label: t('home.reportDamage'), icon: 'camera.fill', route: '/camera', gradient: ['#0B5394', '#075A9E'] },
    { label: t('home.viewMap'), icon: 'map.fill', route: '/map', gradient: ['#4A7C2C', '#2D5016'] },
    { label: t('home.myReports'), icon: 'list.bullet', route: '/complaint', gradient: ['#0B5394', '#4A7C2C'] },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#0a0a0a'] : ['#0B5394', '#4A7C2C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <IconSymbol name="mappin.circle.fill" size={40} color="#fff" />
            </View>
            <View>
              <Text style={styles.greeting}>{t('home.welcomeTo')}</Text>
              <Text style={styles.appName}>{t('common.appName')}</Text>
              <Text style={styles.subtitle}>{t('common.tagline')}</Text>
            </View>
          </View>
          <View style={styles.logoContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={28} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[
              styles.statCard,
              { backgroundColor: isDark ? '#1a1a1a' : '#fff' }
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
              <IconSymbol name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#fff' : '#000' }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#999' : '#666' }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
          {t('home.quickActions')}
        </Text>
        <View style={styles.actionsContainer}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.gradient}
                style={styles.actionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol name={action.icon as any} size={32} color="#fff" />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
          {t('home.recentActivity')}
        </Text>
        <View style={[styles.activityCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#FF6B6B20' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF6B6B" />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: isDark ? '#fff' : '#000' }]}>
                {t('home.potholeReported')}
              </Text>
              <Text style={[styles.activityTime, { color: isDark ? '#999' : '#666' }]}>
                2 {t('home.hoursAgo')} • {t('home.mainStreet')}
              </Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#4ECDC420' }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#4ECDC4" />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: isDark ? '#fff' : '#000' }]}>
                {t('home.issueResolved')}
              </Text>
              <Text style={[styles.activityTime, { color: isDark ? '#999' : '#666' }]}>
                1 {t('home.dayAgo')} • {t('home.oakAvenue')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appIcon: {
    width: 48,
    height: 48,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
  },
});
