// eslint-disable-next-line no-unused-vars,import/no-extraneous-dependencies
import { expect, jest, test } from '@jest/globals';
import { getPageState, removePageState, updatePageState } from './storage.js';

test('getPageState exixts', async () => {
  chrome.storage.local.get.mockReturnValueOnce({
    'https://www.google.com/': {
      status: 'done',
      title: 'Google',
      lastModified: '2021-03-21T12:00:00.000Z',
      created: '2021-02-21T12:00:00.000Z',
    },
  });

  const state = await getPageState('https://www.google.com/');

  expect(state.url).toBe('https://www.google.com/');
  expect(state.properties.status).toBe('done');
  expect(state.properties.title).toBe('Google');
  expect(state.properties.lastModified).toBe('2021-03-21T12:00:00.000Z');
  expect(state.properties.created).toBe('2021-02-21T12:00:00.000Z');
});

test('updatePageState: create new', async () => {
  await updatePageState('https://www.google.com/', {
    status: 'done',
  });

  expect(chrome.storage.local.set).toHaveBeenCalledWith({
    'https://www.google.com/': {
      status: 'done',
    },
  });
});

test('updatePageState: update', async () => {
  chrome.storage.local.get.mockReturnValueOnce({
    'https://www.google.com/': {
      status: 'todo',
      title: 'Google',
    },
  });

  await updatePageState('https://www.google.com/', {
    status: 'done',
  });

  expect(chrome.storage.local.set).toHaveBeenCalledWith({
    'https://www.google.com/': {
      status: 'done',
      title: 'Google',
    },
  });
});

test('removePageState', async () => {
  await removePageState('https://www.google.com/');

  expect(chrome.storage.local.remove).toHaveBeenCalledWith('https://www.google.com/');
});
