import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { askAssistant } from '../services/aiService';
import { getErrorMessage } from '../api/axios';
import { formatPrice } from '../utils/format';
import { handleImageError } from '../utils/image';
import './AIAssistant.css';

const suggestions = [
  'Find a calculator under ₹1000',
  'Books for first year engineering',
  'Show hostel essentials',
  'How do I sell an item?',
  'Is it safe to meet sellers?',
];

const welcome = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! 👋 I'm your Campus Connect AI Assistant. I can help you find products, discover categories, get recommendations or answer questions about buying and selling on campus.",
};

/**
 * Floating AI chat. Messages go to Django (`/api/ai/assistant/`), which calls
 * Google Gemini server-side — the API key is never exposed to the browser.
 */
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const q = text.trim();
    if (!q || thinking) return;
    const userMsg = { id: Date.now(), role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    try {
      const res = await askAssistant(q, messages.filter((m) => m.id !== 'welcome'));
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: res.reply, products: res.products }]);
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', error: true, text: getErrorMessage(err, 'Sorry, I could not reach the assistant. Please try again.') }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`cc-ai-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-stars'}`} />
        {!open && <span className="cc-ai-fab-label">Ask AI</span>}
      </button>

      {open && (
        <section className="cc-ai-panel" role="dialog" aria-label="Campus Connect AI Assistant">
          <header className="cc-ai-head">
            <span className="cc-ai-avatar"><i className="bi bi-robot" /></span>
            <div>
              <h2>Campus Connect AI Assistant</h2>
              <small><span className="cc-ai-dot" />Powered by Google Gemini</small>
            </div>
            <button type="button" className="cc-ai-close" onClick={() => setOpen(false)} aria-label="Close"><i className="bi bi-x-lg" /></button>
          </header>

          <div className="cc-ai-body" ref={bodyRef} aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`cc-ai-msg cc-ai-${m.role} ${m.error ? 'is-error' : ''}`}>
                <p>{m.text}</p>
                {m.products?.length > 0 && (
                  <div className="cc-ai-products">
                    {m.products.map((p) => (
                      <Link key={p.id} to={`/product/${p.id}`} className="cc-ai-product" onClick={() => setOpen(false)}>
                        <img src={p.images[0]} alt="" onError={handleImageError(p.name)} />
                        <div>
                          <span>{p.name}</span>
                          <strong>{formatPrice(p.price)}</strong>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="cc-ai-msg cc-ai-assistant cc-ai-typing" aria-label="Assistant is typing">
                <span /><span /><span />
              </div>
            )}
            {messages.length === 1 && (
              <div className="cc-ai-suggestions">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="cc-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <form className="cc-ai-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="Ask about products, categories…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message the AI assistant"
              maxLength={500}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || thinking} aria-label="Send">
              <i className="bi bi-send-fill" />
            </button>
          </form>
          <p className="cc-ai-disclaimer">AI suggestions may be inaccurate. Always verify items in person.</p>
        </section>
      )}
    </>
  );
}
