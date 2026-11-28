import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import Loader from '../components/Loader';
import { USE_API, getErrorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { getConversationMessages, getConversations, markConversationRead, sendMessage } from '../services/chatService';
import products from '../data/products';
import { timeAgo } from '../utils/format';
import './Messages.css';

const POLL_MS = 5000; // REST polling for new messages (WebSockets can replace this later)

// Sample-data mode only: simulated replies from the other student.
const autoReplies = [
  'Sure! Let me know a time that works for you.',
  'Yes, it is still available 🙂',
  'I can meet near the library after 4 PM.',
  'Sounds good, see you then!',
];

export default function Messages() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  useEffect(() => {
    getConversations()
      .then((list) => {
        const { conversationId, product, seller } = location.state || {};
        let selected = conversationId;
        // Opened via "Contact Seller": reuse or create a conversation with that seller.
        if (product && seller) {
          const existing = list.find((c) => c.participant.id === seller.id && c.productId === product.id);
          if (existing) selected = existing.id;
          else {
            const fresh = {
              id: Date.now(),
              productId: product.id,
              product,
              participant: { id: seller.id, name: seller.name, avatar: seller.avatar, college: seller.college, online: true },
              unread: 0,
              messages: [],
            };
            list = [fresh, ...list];
            selected = fresh.id;
          }
        }
        setConversations(list);
        if (selected) {
          setActiveId(selected);
          setMobileChatOpen(true);
        } else if (window.innerWidth >= 768 && list.length) setActiveId(list[0].id);
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load your conversations.')))
      .finally(() => setLoading(false));
  }, [location.state]);

  const mergeMessages = useCallback((id, incoming, replace = false) => {
    setConversations((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        const base = replace ? [] : c.messages;
        const fresh = incoming.filter((m) => !base.some((x) => x.id === m.id));
        return fresh.length || replace ? { ...c, messages: [...base, ...fresh] } : c;
      })
    );
  }, []);

  // API mode: load the full thread when a conversation opens, then poll for new messages.
  useEffect(() => {
    if (!USE_API || !activeId) return undefined;
    let cancelled = false;
    getConversationMessages(activeId)
      .then((messages) => !cancelled && mergeMessages(activeId, messages, true))
      .catch(() => {});
    markConversationRead(activeId).catch(() => {});

    const timer = setInterval(() => {
      const current = conversationsRef.current.find((c) => c.id === activeId);
      const lastId = current?.messages.at(-1)?.id;
      getConversationMessages(activeId, lastId)
        .then((messages) => {
          if (!cancelled && messages.length) {
            mergeMessages(activeId, messages);
            markConversationRead(activeId).catch(() => {});
          }
        })
        .catch(() => {});
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeId, mergeMessages]);

  const active = conversations.find((c) => c.id === activeId);
  const activeProduct = active?.product || products.find((p) => p.id === active?.productId);

  const filtered = useMemo(
    () => conversations.filter((c) => c.participant.name.toLowerCase().includes(query.toLowerCase())),
    [conversations, query]
  );

  const select = (id) => {
    setActiveId(id);
    setMobileChatOpen(true);
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  const appendMessage = (id, msg) =>
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, messages: [...c.messages, msg] } : c)));

  const handleSend = async (text) => {
    const id = activeId;
    try {
      const msg = await sendMessage(id, text);
      if (USE_API) mergeMessages(id, [msg]);
      else appendMessage(id, msg);
    } catch (err) {
      toast(getErrorMessage(err, 'Message not sent. Please try again.'), 'danger');
      return;
    }
    if (!USE_API) {
      // Sample-data mode only: simulate the other student replying.
      setTimeout(() => {
        appendMessage(id, { id: Date.now(), from: 'them', text: autoReplies[Math.floor(Math.random() * autoReplies.length)], at: new Date().toISOString() });
      }, 1500);
    }
  };

  if (loading) return <Loader label="Loading conversations…" fullPage />;
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container py-4">
      <div className={`cc-messenger ${mobileChatOpen ? 'show-chat' : ''}`}>
        <aside className="cc-convo-list">
          <div className="cc-convo-head">
            <h1>Messages</h1>
            <div className="cc-input-icon">
              <i className="bi bi-search" />
              <input type="search" className="form-control form-control-sm" placeholder="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search conversations" />
            </div>
          </div>
          <ul>
            {filtered.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.id}>
                  <button type="button" className={`cc-convo ${c.id === activeId ? 'is-active' : ''}`} onClick={() => select(c.id)}>
                    <span className="position-relative">
                      <span className="avatar">{c.participant.avatar}</span>
                      {c.participant.online && <span className="cc-online-dot" />}
                    </span>
                    <span className="cc-convo-text">
                      <span className="d-flex justify-content-between gap-2">
                        <strong>{c.participant.name}</strong>
                        {last && <small>{timeAgo(last.at)}</small>}
                      </span>
                      <span className="d-flex justify-content-between gap-2">
                        <span className="cc-convo-preview">{last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'Start the conversation'}</span>
                        {c.unread > 0 && <span className="badge rounded-pill text-bg-primary">{c.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!filtered.length && <li className="p-4 text-center text-muted-cc small">No conversations found.</li>}
          </ul>
        </aside>
        <section className="cc-chat-pane">
          <ChatWindow conversation={active} product={activeProduct} onSend={handleSend} onBack={() => setMobileChatOpen(false)} />
        </section>
      </div>
    </div>
  );
}
