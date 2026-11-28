import api, { USE_API } from '../api/axios';
import { normalizeProduct } from '../api/normalize';
import products from '../data/products';
import categories from '../data/categories';
import { formatPrice } from '../utils/format';

/**
 * The AI assistant talks to the Django backend (`POST /api/ai/assistant/`), which
 * forwards the conversation to Google Gemini using a server-side GEMINI_API_KEY.
 * The key is never shipped to the browser.
 *
 * Response: { reply: string, products: Product[] }
 */
export const askAssistant = async (message, history = []) => {
  if (USE_API) {
    const { data } = await api.post('/ai/assistant/', {
      message,
      history: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
    });
    return { reply: data.reply, products: data.products.map(normalizeProduct) };
  }
  await new Promise((r) => setTimeout(r, 900));
  return localAssistant(message);
};

// Lightweight rule-based stand-in so the UI can be demoed without the backend.
const localAssistant = (message) => {
  const q = message.toLowerCase();

  if (/(how|sell|list|post)/.test(q) && /(sell|list|post)/.test(q)) {
    return {
      reply:
        'Selling is easy! Click the blue "Sell Item" button in the top bar, add a clear title, a few photos, pick a category and condition, set a fair price and choose a campus meeting spot. Your listing goes live instantly.',
    };
  }
  if (/(safe|scam|trust|meet)/.test(q)) {
    return {
      reply:
        'Safety tips: meet in public campus spots (library, canteen, main gate), inspect the item before paying, prefer UPI after checking the item, and never share OTPs. You can report any suspicious listing from its product page.',
    };
  }
  if (/(categor)/.test(q)) {
    return { reply: `We have ${categories.length} categories: ${categories.map((c) => c.name).join(', ')}. Which one interests you?` };
  }

  const budgetMatch = q.match(/(?:under|below|less than|within|budget)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/);
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : null;

  const category = categories.find(
    (c) => q.includes(c.slug) || q.includes(c.name.toLowerCase()) || (c.slug === 'books' && /(book|textbook|novel)/.test(q))
  );
  const words = q.split(/\W+/).filter((w) => w.length > 3);
  let matches = products.filter((p) => p.available);
  if (category) matches = matches.filter((p) => p.category === category.slug);
  else if (words.length) {
    const byWord = matches.filter((p) =>
      words.some((w) => [p.name, ...(p.tags || [])].join(' ').toLowerCase().includes(w))
    );
    if (byWord.length) matches = byWord;
  }
  if (budget) matches = matches.filter((p) => p.price <= budget);
  matches = matches.slice(0, 3);

  if (matches.length) {
    return {
      reply: `Here ${matches.length === 1 ? 'is a listing' : `are ${matches.length} listings`} you might like${
        budget ? ` within ${formatPrice(budget)}` : ''
      }:`,
      products: matches,
    };
  }
  return {
    reply:
      'I could not find an exact match right now. Try asking things like "calculator under 1000", "books for first year", or "hostel essentials". You can also browse the Marketplace with filters.',
  };
};

/**
 * POST /api/ai/generate-description/ – Gemini drafts a listing description.
 * The text is only placed in the form; the student reviews/edits it and
 * publishes it themselves.
 */
export const generateDescription = async ({ name, category, condition, details }) => {
  if (USE_API) {
    const { data } = await api.post('/ai/generate-description/', { title: name, category, condition, details });
    return data.description;
  }
  await new Promise((r) => setTimeout(r, 900));
  const cat = categories.find((c) => c.slug === category)?.name || 'item';
  return `Selling my ${name} in ${condition.toLowerCase()} condition. ${details ? `${details}. ` : ''}It has served me well and is ready for its next owner on campus.

• Category: ${cat}
• Condition: ${condition}
• Ideal for students who need a reliable ${cat.toLowerCase()} at a fair price

Message me to check it out and arrange a quick campus pickup.`;
};
