import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import Loader from '../components/Loader';
import { getConversations, sendMessage } from '../services/chatService';
import products from '../data/products';
import { timeAgo } from '../utils/format';
import './Messages.css';

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

  useEffect(() => {
    getConversations().then((list) => {
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
      setLoading(false);
    });
  }, [location.state]);

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
    const msg = await sendMessage(id, text);
    appendMessage(id, msg);
    // Demo only: simulate the other student replying. Real-time replies will come via WebSockets.
    setTimeout(() => {
      appendMessage(id, { id: Date.now(), from: 'them', text: autoReplies[Math.floor(Math.random() * autoReplies.length)], at: new Date().toISOString() });
    }, 1500);
  };

  if (loading) return <Loader label="Loading conversations…" fullPage />;

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
