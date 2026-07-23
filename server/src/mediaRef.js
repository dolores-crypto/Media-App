import { HttpError } from './http.js';
import { upsertMediaItem, getMediaItem } from './store.js';
import { SUPPORTED_TYPES } from './mediaProviders.js';

/**
 * Requests can reference a media item either by an existing local `mediaItemId`
 * or by inlining a search result (`media`), which gets upserted into media_items.
 */
export function resolveMediaRef(db, { mediaItemId, media }) {
  if (mediaItemId) {
    const item = getMediaItem(db, mediaItemId);
    if (!item) throw new HttpError(404, 'Media item not found');
    return item;
  }
  if (media && media.type && media.source && media.externalId && media.title) {
    if (!SUPPORTED_TYPES.includes(media.type)) {
      throw new HttpError(400, `Unsupported media type: ${media.type}`);
    }
    return upsertMediaItem(db, media);
  }
  throw new HttpError(400, 'Provide either mediaItemId or a media object with type, source, externalId, title');
}
