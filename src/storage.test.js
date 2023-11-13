import { getPageState } from './storage.js';
import {expect, jest, test} from '@jest/globals';

test('getPageState', async () => {
  const state = await getPageState('https://www.google.com/');
});
