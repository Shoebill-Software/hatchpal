/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => {
  const groups = config.ios?.entitlements?.['com.apple.security.application-groups'];
  const appGroup =
    Array.isArray(groups) && groups.length > 0 ? groups : ['group.com.shoebillsoftware.hatchpal'];

  return {
    type: 'widget',
    name: 'HatchPalWidget',
    displayName: 'HatchPal',
    bundleIdentifier: '.widget',
    deploymentTarget: '16.4',
    frameworks: ['WidgetKit', 'SwiftUI'],
    colors: {
      $widgetBackground: '#0E0E10',
      $accent: '#C4783A',
    },
    entitlements: {
      'com.apple.security.application-groups': appGroup,
    },
  };
};
