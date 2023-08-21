const defaultSettings = {
  enabledStates: ['todo', 'started', 'done'],
};

/**
 * @typedef {Object} UserSettings
 * @property {LinkStatus[]} enabledStates
 */

/**
 *
 * @return {UserSettings}
 */
export async function getUserSettings() {
  const result = await chrome.storage.local.get('userSettings');
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
  return await chrome.storage.local.set({
    userSettings: {
      ...currentUserSettings, ...userSettings,
    },
  });
}
