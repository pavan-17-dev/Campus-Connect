import api, { USE_API } from '../api/axios';
import { normalizeConversation, normalizeMessage } from '../api/normalize';
import sampleConversations from '../data/conversations';

/*
 * REST messaging. The Messages page polls GET /messages/<id>/?after=<last id>
 * for new messages; this can later be swapped for a WebSocket (Django Channels)
 * without changing the components.
 */
const unpage = (data) => (Array.isArray(data) ? data : data.results);

/** GET /api/messages/conversations/ */
export const getConversations = async () => {
  if (USE_API) return unpage((await api.get('/messages/conversations/', { params: { page_size: 50 } })).data).map(normalizeConversation);
  await new Promise((r) => setTimeout(r, 400));
  return structuredClone(sampleConversations);
};

/** GET /api/messages/<id>/ – full thread (or only messages newer than `afterId`). */
export const getConversationMessages = async (conversationId, afterId) => {
  if (!USE_API) return null;
  const { data } = await api.get(`/messages/${conversationId}/`, { params: { after: afterId } });
  return data.messages.map(normalizeMessage);
};

/** POST /api/messages/<id>/ */
export const sendMessage = async (conversationId, text) => {
  if (USE_API) return normalizeMessage((await api.post(`/messages/${conversationId}/`, { content: text })).data);
  await new Promise((r) => setTimeout(r, 200));
  return { id: Date.now(), from: 'me', text, at: new Date().toISOString() };
};

/** POST /api/messages/<id>/read/ */
export const markConversationRead = async (conversationId) => {
  if (!USE_API) return;
  await api.post(`/messages/${conversationId}/read/`);
};

/** POST /api/messages/conversations/ – opens (or reuses) the chat with a product's seller. */
export const startConversation = async (productId) => {
  if (USE_API) return normalizeConversation((await api.post('/messages/conversations/', { product: productId })).data);
  return null;
};
