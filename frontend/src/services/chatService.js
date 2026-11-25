import api, { USE_API } from '../api/axios';
import sampleConversations from '../data/conversations';

// Messaging will later move to Django Channels (WebSockets); REST is used for history.
export const getConversations = async () => {
  if (USE_API) return (await api.get('/conversations/')).data;
  await new Promise((r) => setTimeout(r, 400));
  return structuredClone(sampleConversations);
};

export const sendMessage = async (conversationId, text) => {
  if (USE_API) return (await api.post(`/conversations/${conversationId}/messages/`, { text })).data;
  await new Promise((r) => setTimeout(r, 200));
  return { id: Date.now(), from: 'me', text, at: new Date().toISOString() };
};

export const startConversation = async (productId, sellerId) => {
  if (USE_API) return (await api.post('/conversations/', { product: productId, seller: sellerId })).data;
  return null;
};
