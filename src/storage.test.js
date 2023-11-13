// eslint-disable-next-line no-unused-vars,import/no-extraneous-dependencies
import { expect, jest, test } from '@jest/globals';
import {
  listPageStateForDomain, getPageState, removePageState, updatePageState, listPageStateGroupedByDomain,
} from './storage.js';

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

test('getEntriesForDomain', async () => {
  chrome.storage.local.get.mockReturnValueOnce({
    'https://www.google.com/': {
      status: 'todo',
      title: 'Google',
    },
    'https://www.google.com/search': {
      status: 'done',
      title: 'Google Search',
    },
    'https://www.facebook.com/maps': {
      status: 'todo',
      title: 'Facebook Maps',
    },
  });

  const entries = await listPageStateForDomain('https://www.google.com/');

  expect(entries).toHaveLength(2);
  expect(entries[0].url).toBe('https://www.google.com/');
  expect(entries[0].properties.status).toBe('todo');
  expect(entries[1].url).toBe('https://www.google.com/search');
  expect(entries[1].properties.status).toBe('done');
});

test('listPageStateGroupedByDomain', async () => {
  chrome.storage.local.get.mockReturnValueOnce({
    'https://www.google.com/home': {
      status: 'todo',
      title: 'Google',
    },
    'https://www.google.com/search': {
      status: 'done',
      title: 'Google Search',
    },
    'https://www.facebook.com/maps': {
      status: 'todo',
      title: 'Facebook Maps',
    },
  });

  const entriesByDomain = await listPageStateGroupedByDomain();

  expect(Object.keys(entriesByDomain)).toHaveLength(2);
  expect(entriesByDomain['https://www.google.com']).toHaveLength(2);
  expect(entriesByDomain['https://www.google.com'][0].url).toBe('https://www.google.com/home');
  expect(entriesByDomain['https://www.google.com'][0].properties.status).toBe('todo');
  expect(entriesByDomain['https://www.google.com'][1].url).toBe('https://www.google.com/search');
  expect(entriesByDomain['https://www.google.com'][1].properties.status).toBe('done');

  expect(entriesByDomain['https://www.facebook.com']).toHaveLength(1);
  expect(entriesByDomain['https://www.facebook.com'][0].url).toBe('https://www.facebook.com/maps');
  expect(entriesByDomain['https://www.facebook.com'][0].properties.status).toBe('todo');
});
