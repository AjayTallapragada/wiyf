import { MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const websocketUrl = (import.meta.env.VITE_WS_URL || apiBaseUrl.replace(/^http/, 'ws')).replace(/\/api\/?$/, '') + '/ws/community';

export default function CommunityPage() {
  const [username, setUsername] = useState(() => localStorage.getItem('wiyf.communityName') || '');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;
    socket.onopen = () => setStatus('connected');
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'history') setMessages(payload.messages || []);
      if (payload.type === 'message') setMessages((current) => [...current, payload.message].slice(-50));
    };
    socket.onerror = () => setStatus('error');
    socket.onclose = () => setStatus('offline');

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectionLabel = useMemo(() => ({
    connecting: 'Joining the kitchen...',
    connected: 'Live with the community',
    error: 'Connection trouble',
    offline: 'Offline',
  }[status]), [status]);

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    const name = username.trim();
    if (!text || !name || socketRef.current?.readyState !== WebSocket.OPEN) return;
    localStorage.setItem('wiyf.communityName', name);
    socketRef.current.send(JSON.stringify({ username: name, text }));
    setDraft('');
  }

  return (
    <div className="space-y-6">
      <AiChef message="Swap pantry wins, recipe ideas, and dinner rescue plans." />
      <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
        <ComicCard className="bg-butter/70">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-paper shadow-sticker">
              <MessageCircle size={24} strokeWidth={3} />
            </div>
            <div>
              <p className="font-display text-3xl text-tomato">Kitchen table</p>
              <p className="font-hand text-xl text-cocoa">A friendly room for fridge people.</p>
            </div>
          </div>
          <label className="mt-6 block font-doodle text-lg font-bold" htmlFor="community-name">Your name</label>
          <input id="community-name" className="mt-2 w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" maxLength="24" placeholder="e.g. Sam" value={username} onChange={(event) => setUsername(event.target.value)} />
          <div className="mt-5 flex items-center gap-2 font-hand text-lg" aria-live="polite">
            {status === 'connected' ? <Wifi size={20} className="text-leaf" /> : <WifiOff size={20} className="text-tomato" />}
            <span>{connectionLabel}</span>
          </div>
        </ComicCard>

        <ComicCard className="flex min-h-[560px] flex-col bg-paper">
          <div className="flex items-center justify-between border-b-3 border-ink pb-4">
            <div>
              <h1 className="font-display text-5xl text-leaf">Community</h1>
              <p className="font-hand text-xl text-cocoa">What are you cooking today?</p>
            </div>
            <span className="rounded-full border-2 border-ink bg-cream px-3 py-1 font-doodle text-sm font-bold">LIVE</span>
          </div>
          <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto py-5" aria-live="polite">
            {messages.length ? messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-ink bg-cream px-4 py-3">
                <p className="font-doodle font-bold text-tomato">{message.username}</p>
                <p className="break-words font-hand text-xl text-cocoa">{message.text}</p>
              </motion.div>
            )) : <p className="py-20 text-center font-hand text-2xl text-cocoa">No messages yet. Start the conversation.</p>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t-3 border-ink pt-4">
            <input className="min-w-0 flex-1 rounded-2xl border-3 border-ink bg-cream px-4 py-3 font-hand text-xl" maxLength="500" placeholder={username.trim() ? 'Write a message...' : 'Add your name first'} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!username.trim() || status !== 'connected'} />
            <ComicButton type="submit" icon={Send} aria-label="Send message" disabled={!username.trim() || !draft.trim() || status !== 'connected'}><span className="hidden sm:inline">Send</span></ComicButton>
          </form>
        </ComicCard>
      </div>
    </div>
  );
}