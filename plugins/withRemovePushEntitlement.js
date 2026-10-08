const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Personal (free) Apple Developer teams cannot provision Push Notifications.
 * Local notifications still work without the aps-environment entitlement.
 */
function withRemovePushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
}

module.exports = withRemovePushEntitlement;
