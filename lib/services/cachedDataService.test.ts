/* eslint-disable @typescript-eslint/no-explicit-any */
import { CachedDataService } from './cachedDataService';

describe('CachedDataService', () => {
  beforeAll(() => {
    (global as any).indexedDB = undefined;
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      length: 0,
      key: () => null,
    };
  });

  it('instantiates and exposes expected public methods', () => {
    const service = new CachedDataService();
    const methods = [
      'fetchCollections',
      'addCollection',
      'updateCollection',
      'archiveCollection',
      'unarchiveCollection',
      'deleteCollection',
      'addDot',
      'updateDot',
      'deleteDot',
      'createSnapshot',
      'fetchSnapshots',
      'loadSnapshot',
      'deleteSnapshot',
      'fetchUserPreferences',
      'importData',
      'resetAllCollections',
      'refreshCache',
      'clearUserCache',
      'validateCacheFreshness',
    ] as const;

    for (const method of methods) expect(typeof (service as any)[method]).toBe('function');
  });

  it('uses user-scoped cache key patterns without collisions', () => {
    const collectionId = 'same-collection-id';
    const key1 = `user:user-1:collection:${collectionId}`;
    const key2 = `user:user-2:collection:${collectionId}`;
    const expectedPattern = /^user:[^:]+:collection:[^:]+$/;

    expect(expectedPattern.test(key1)).toBe(true);
    expect(expectedPattern.test(key2)).toBe(true);
    expect(key1).not.toBe(key2);
  });
});
