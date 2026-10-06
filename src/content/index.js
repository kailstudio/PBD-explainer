// All copy lives in the three JSON files next to this one.
// Nothing in /components contains page text, so editing those files is enough.
import site from './site.json';
import mechanisms from './mechanisms.json';
import diseases from './diseases.json';

export { site };

export const VIEWS = {
  mechanisms: { id: 'mechanisms', ...site.views.mechanisms, items: mechanisms },
  diseases: { id: 'diseases', ...site.views.diseases, items: diseases },
};

export const VIEW_IDS = Object.keys(VIEWS);

export function findItem(viewId, itemId) {
  return VIEWS[viewId]?.items.find((item) => item.id === itemId) ?? null;
}
