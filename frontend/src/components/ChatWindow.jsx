import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatPrice, formatTime } from '../utils/format';
import { handleImageError } from '../utils/image';
import './ChatWindow.css';

const quickReplies = ['Is this still available?', 'Can you lower the price a little?', 'Where can we meet?'];

export default function ChatWindow({ conversation, product, onSend, onBack, sending = false }) {
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [conversation?.messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div className="cc-chat cc-chat-empty">
        <i className="bi bi-chat-square-text" />
        <h3>Select a conversation</h3>
        <p>Choose a chat from the list to start messaging.</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText('');
  };

  const { participant, messages } = conversation;
  let lastDate = '';

  return (
    <div className="cc-chat">
      <header className="cc-chat-head">
        {onBack && (
          <button type="button" className="cc-icon-btn d-md-none" onClick={onBack} aria-label="Back to conversations">
            <i className="bi bi-arrow-left" />
          </button>
        )}
        <div className="position-relative">
          <span className="avatar">{participant.avatar}</span>
          {participant.online && <span className="cc-online-dot" />}
        </div>
        <div className="cc-chat-who">
          <strong>{participant.name}</strong>
          <small>{participant.online ? 'Online' : 'Offline'} · {participant.college}</small>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button type="button" className="cc-icon-btn" aria-label="Call (coming soon)" disabled><i className="bi bi-telephone" /></button>
          <button type="button" className="cc-icon-btn" aria-label="More options"><i className="bi bi-three-dots-vertical" /></button>
        </div>
      </header>

      {product && (
        <Link to={`/product/${product.id}`} className="cc-chat-product">
          <img src={product.images[0]} alt="" onError={handleImageError(product.name)} />
          <div>
            <span>{product.name}</span>
            <strong>{formatPrice(product.price)}</strong>
          </div>
          <i className="bi bi-chevron-right ms-auto" />
        </Link>
      )}

      <div className="cc-chat-body" ref={bodyRef} aria-live="polite">
        {messages.map((m) => {
          const day = formatDate(m.at);
          const showDay = day !== lastDate;
          lastDate = day;
          return (
            <div key={m.id}>
              {showDay && <div className="cc-chat-day"><span>{day}</span></div>}
              <div className={`cc-msg ${m.from === 'me' ? 'cc-msg-me' : 'cc-msg-them'}`}>
                <p>{m.text}</p>
                <time dateTime={m.at}>
                  {formatTime(m.at)}
                  {m.from === 'me' && <i className="bi bi-check2-all ms-1" />}
                </time>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cc-chat-quick">
        {quickReplies.map((q) => (
          <button key={q} type="button" className="cc-chip" onClick={() => onSend(q)}>{q}</button>
        ))}
      </div>

      <form className="cc-chat-input" onSubmit={submit}>
        <button type="button" className="cc-icon-btn" aria-label="Attach image (coming soon)"><i className="bi bi-paperclip" /></button>
        <input
          type="text"
          className="form-control"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Message"
          maxLength={1000}
        />
        <button type="submit" className="btn btn-primary cc-send-btn" disabled={!text.trim() || sending} aria-label="Send message">
          <i className="bi bi-send-fill" />
          <span className="d-none d-sm-inline ms-2">Send</span>
        </button>
      </form>
    </div>
  );
}
