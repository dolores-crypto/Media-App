import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapOpenLibraryDoc, mapItunesResult } from '../src/mediaProviders.js';

test('mapOpenLibraryDoc normalizes an Open Library search doc', () => {
  const doc = {
    key: '/works/OL123W',
    title: 'Dune',
    author_name: ['Frank Herbert'],
    first_publish_year: 1965,
    cover_i: 987654,
  };
  assert.deepEqual(mapOpenLibraryDoc(doc), {
    source: 'openlibrary',
    externalId: '/works/OL123W',
    type: 'book',
    title: 'Dune',
    creator: 'Frank Herbert',
    year: '1965',
    coverUrl: 'https://covers.openlibrary.org/b/id/987654-M.jpg',
  });
});

test('mapOpenLibraryDoc handles missing optional fields', () => {
  const doc = { key: '/works/OL1W', title: 'Untitled Work' };
  const mapped = mapOpenLibraryDoc(doc);
  assert.equal(mapped.creator, '');
  assert.equal(mapped.year, '');
  assert.equal(mapped.coverUrl, '');
});

test('mapItunesResult normalizes a movie result', () => {
  const item = {
    trackId: 111,
    trackName: 'Arrival',
    artistName: 'Denis Villeneuve',
    releaseDate: '2016-11-11T00:00:00Z',
    artworkUrl100: 'https://example.com/100x100bb.jpg',
  };
  assert.deepEqual(mapItunesResult(item, 'movie'), {
    source: 'itunes',
    externalId: '111',
    type: 'movie',
    title: 'Arrival',
    creator: 'Denis Villeneuve',
    year: '2016',
    coverUrl: 'https://example.com/300x300bb.jpg',
  });
});

test('mapItunesResult falls back to collectionId/collectionName for albums', () => {
  const item = {
    collectionId: 222,
    collectionName: 'OK Computer',
    artistName: 'Radiohead',
    releaseDate: '1997-05-21T00:00:00Z',
  };
  const mapped = mapItunesResult(item, 'music');
  assert.equal(mapped.externalId, '222');
  assert.equal(mapped.title, 'OK Computer');
  assert.equal(mapped.coverUrl, '');
});
