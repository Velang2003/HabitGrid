const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Adds the notifee local AAR maven repository to android/build.gradle.
 * This is needed because @notifee/react-native bundles its core AAR locally
 * and does not publish it to Maven Central or JCenter.
 */
const withNotifeeAndroidRepo = (config) => {
  return withProjectBuildGradle(config, (c) => {
    if (c.modResults.language === 'groovy') {
      const notifeeRepo = `maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`;
      if (!c.modResults.contents.includes('notifee/react-native/android/libs')) {
        c.modResults.contents = c.modResults.contents.replace(
          /allprojects\s*\{[\s\S]*?repositories\s*\{/,
          (match) => `${match}\n    ${notifeeRepo}`
        );
      }
    }
    return c;
  });
};

module.exports = withNotifeeAndroidRepo;
