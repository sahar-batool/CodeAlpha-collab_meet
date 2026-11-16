import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Paperclip, Download, FileText } from 'lucide-react';
import { uploadFile, downloadFile } from '../api/client';

const MAX_SIZE = 10 * 1024 * 1024;

const fmtSize = (b) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function SidePanel({ code, selfId, messages, files, onSend, onClose }) {
  const [tab, setTab] = useState('chat');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const endRef = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (tab === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, tab]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_SIZE) return showNotice('That file is too large (10 MB maximum).');
    setUploading(true);
    try {
      await uploadFile(code, file);
    } catch (err) {
      showNotice(err.message);
    } finally {
      setUploading(false);
    }
  };

  const download = async (file) => {
    try {
      await downloadFile(code, file);
    } catch (err) {
      showNotice(err.message);
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-line bg-panel lg:static lg:z-auto lg:w-80 lg:max-w-none lg:shrink-0"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div role="tablist" className="flex gap-1">
          {[['chat', 'Chat'], ['files', `Files${files.length ? ` (${files.length})` : ''}`]].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${tab === id ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded-lg p-1.5 text-muted transition hover:bg-raised hover:text-fg">
          <X size={18} />
        </button>
      </div>

      {tab === 'chat' ? (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-center text-sm text-muted">No messages yet. Say hello.</p>}
            {messages.map((m) => {
              const mine = m.from === selfId;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="mb-0.5 text-xs text-muted">{mine ? 'You' : m.name} · {fmtTime(m.at)}</span>
                  <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-accent text-accent-ink' : 'bg-raised'}`}>
                    {m.text}
                  </p>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Send a message"
              aria-label="Message"
              className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3.5 py-2 text-sm placeholder:text-muted/60 focus:border-accent"
            />
            <button type="submit" aria-label="Send" className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-ink transition hover:brightness-110 active:scale-90">
              <Send size={16} />
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {files.length === 0 && <p className="text-center text-sm text-muted">No files shared yet.</p>}
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-raised p-3">
                <FileText size={20} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
                  <p className="truncate text-xs text-muted">{fmtSize(f.size)} · {f.fromName} · {fmtTime(f.at)}</p>
                </div>
                <button onClick={() => download(f)} aria-label={`Download ${f.name}`} className="rounded-lg p-2 text-muted transition hover:bg-line hover:text-fg">
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-3">
            <input ref={fileInput} type="file" onChange={pickFile} className="hidden" />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              <Paperclip size={16} /> {uploading ? 'Uploading…' : 'Share a file'}
            </button>
            <p className="mt-2 text-center text-xs text-muted">Up to 10 MB. Executable files are blocked.</p>
          </div>
        </>
      )}

      {notice && (
        <p role="alert" className="border-t border-line px-4 py-2 text-sm text-danger">{notice}</p>
      )}
    </motion.aside>
  );
}