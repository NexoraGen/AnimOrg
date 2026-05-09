import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Settings, 
  LogOut, 
  ChevronRight, 
  Bell, 
  Shield, 
  Moon,
  Tv,
  Clock,
  Crown
} from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { GlassHeader, Button } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { firebaseAuthService } from '../../src/services/firebase/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAppStore();

  const handleLogout = async () => {
    try {
      await firebaseAuthService.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const MENU_ITEMS = [
    { icon: <Bell color={colors.text} size={20} />, label: 'Notifications' },
    { icon: <Tv color={colors.text} size={20} />, label: 'My Subscriptions' },
    { icon: <Moon color={colors.text} size={20} />, label: 'Dark Mode', isToggle: true },
    { icon: <Shield color={colors.text} size={20} />, label: 'Privacy & Security' },
    { icon: <Settings color={colors.text} size={20} />, label: 'App Settings' },
  ];

  return (
    <View style={styles.container}>
      <GlassHeader title="Profile" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150' }} 
            style={styles.avatar} 
          />
          <Text style={styles.username}>{user?.username || 'Guest User'}</Text>
          <Text style={styles.email}>{user?.email || 'guest@aniverse.app'}</Text>
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Tv color={colors.primary} size={24} />
            <Text style={styles.statValue}>{user?.watchStats?.animeCount || 0}</Text>
            <Text style={styles.statLabel}>Anime</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock color={colors.primary} size={24} />
            <Text style={styles.statValue}>{user?.watchStats?.totalHours || 0}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.premiumBanner}>
          <View style={styles.premiumContent}>
            <Crown color="#F59E0B" size={28} />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>AniVerse Premium</Text>
              <Text style={styles.premiumText}>Go ad-free & get offline viewing</Text>
            </View>
          </View>
          <ChevronRight color={colors.textDim} size={20} />
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconWrapper}>{item.icon}</View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <ChevronRight color={colors.textDim} size={20} />
            </TouchableOpacity>
          ))}
        </View>

        <Button 
          title="Logout" 
          onPress={handleLogout} 
          variant="ghost"
          textStyle={{ color: colors.error }}
          style={styles.logoutButton}
          icon={<LogOut color={colors.error} size={20} />}
        />
        
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  username: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
  email: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    marginTop: 4,
  },
  editButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
  },
  editButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginTop: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  premiumBanner: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTextContainer: {
    marginLeft: spacing.md,
  },
  premiumTitle: {
    color: '#F59E0B',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: 2,
  },
  premiumText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  menuContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  logoutButton: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
  }
});
