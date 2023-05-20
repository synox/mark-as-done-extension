const defaultSettings = {
  enabledStates: [STATUS_TODO, STATUS_STARTED, STATUS_DONE],
};

/**
 * @typedef {Object} UserSettings
 * @property {string[]} enabledStates
 */

/**
 *
 * @return {UserSettings}
 */
export async function getUserSettings() {
  const result = await browser.storage.local.get('userSettings');
  return {
    ...defaultSettings,
    ...result.userSettings,
  };
}

/**
 * @typedef {UserSettings} userSettings (merged with existing settings)
 * @return {Promise<any>}
 */
export async function setUserSettings(userSettings) {
  // eslint-disable-next-line no-return-await
  const currentUserSettings = await getUserSettings();
  return await browser.storage.local.set({
    userSettings: {
      ...currentUserSettings, ...userSettings,
    },
  });
}
