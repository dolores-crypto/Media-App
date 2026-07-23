import { HttpError } from './http.js';

const ITUNES_CONFIG = {
  movie: { media: 'movie', entity: 'movie' },
  tv: { media: 'tvShow', entity: 'tvSeason' },
  music: { media: 'music', entity: 'album' },
  podcast: { media: 'podcast', entity: 'podcast' },
};

export function mapOpenLibraryDoc(doc) {
  return {
    source: 'openlibrary',
    externalId: doc.key,
    type: 'book',
    title: doc.title,
    creator: (doc.author_name || []).join(', '),
    year: doc.first_publish_year ? String(doc.first_publish_year) : '',
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
  };
}

export function mapItunesResult(item, type) {
  const id = item.trackId ?? item.collectionId ?? item.artistId;
  return {
    source: 'itunes',
    externalId: id != null ? String(id) : '',
    type,
    title: item.trackName || item.collectionName || item.artistName || 'Untitled',
    creator: item.artistName || '',
    year: (item.releaseDate || '').slice(0, 4),
    coverUrl: (item.artworkUrl100 || '').replace('100x100', '300x300'),
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new HttpError(502, `Upstream media search failed (${res.status})`);
  }
  return res.json();
}

async function searchBooks(query) {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '20');
  const data = await fetchJson(url);
  return (data.docs || [])
    .filter((doc) => doc.title && doc.key)
    .map(mapOpenLibraryDoc);
}

async function searchItunes(query, type) {
  const config = ITUNES_CONFIG[type];
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', query);
  url.searchParams.set('media', config.media);
  url.searchParams.set('entity', config.entity);
  url.searchParams.set('limit', '20');
  const data = await fetchJson(url);
  return (data.results || [])
    .map((item) => mapItunesResult(item, type))
    .filter((item) => item.externalId);
}

export const SUPPORTED_TYPES = ['book', 'movie', 'tv', 'music', 'podcast'];

export async function searchMedia(type, query) {
  if (!SUPPORTED_TYPES.includes(type)) {
    throw new HttpError(400, `Unsupported media type: ${type}. Use one of ${SUPPORTED_TYPES.join(', ')}`);
  }
  if (!query || !query.trim()) {
    throw new HttpError(400, 'Query parameter "q" is required');
  }
  return type === 'book' ? searchBooks(query) : searchItunes(query, type);
}
