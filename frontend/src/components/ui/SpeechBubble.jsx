export default function SpeechBubble({ children, className = '' }) {
  return (
    <div className={`speech-bubble doodle-border bg-paper px-5 py-4 font-hand text-xl shadow-sticker ${className}`}>
      {children}
    </div>
  );
}
