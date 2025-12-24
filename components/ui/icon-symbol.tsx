// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'map.fill': 'map',
  'camera.fill': 'camera-alt',
  'exclamationmark.triangle.fill': 'warning',
  'person.fill': 'person',
  'mappin.circle.fill': 'place',

  // Actions
  'bell.fill': 'notifications',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'xmark.circle.fill': 'cancel',
  'checkmark.circle.fill': 'check-circle',
  'arrow.right.square.fill': 'logout',

  // Info
  'doc.text.fill': 'description',
  'clock.fill': 'schedule',
  'star.fill': 'star',
  'location.fill': 'location-on',
  'info.circle.fill': 'info',
  'questionmark.circle.fill': 'help',

  // Settings
  'lock.fill': 'lock',
  'hand.raised.fill': 'privacy-tip',
  'globe': 'language',
  'moon.fill': 'dark-mode',
  'ant.fill': 'bug-report',
  'person.circle.fill': 'account-circle',
  'gear': 'settings',
  'envelope.fill': 'email',
  'phone.fill': 'phone',

  // Other
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'list.bullet': 'list',
  'speaker.fill': 'volume-up',
  'internaldrive.fill': 'storage',
  'shield.fill': 'shield',
  'trash.fill': 'delete',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
