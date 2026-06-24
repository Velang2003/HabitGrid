import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import notifee from '@notifee/react-native';

// Register widget task handler
if (!global.hasRegisteredWidgetTaskHandler) {
  registerWidgetTaskHandler(widgetTaskHandler);
  global.hasRegisteredWidgetTaskHandler = true;
}


// Register notifee background event handler (required to silence warning and handle bg events)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Handle background notification events if needed in the future
  // e.g. user dismisses a notification or presses an action while app is closed
  console.log('[Notifee BG Event]', type, detail);
});

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
