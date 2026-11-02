import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export default function CopyButton({ text, label = 'Copy code', primary = false }) {
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState(false);
  const field = useRef(null);

  useEffect(() => {
    if (fallback) {
      field.current?.focus();
      field.current?.select();
    }
  }, [fallback]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied! Ready to paste.');
      setFallback(false);
    } catch {
      setFallback(true);
      setMessage('Copy is unavailable here. Select the text below and use Copy or Ctrl/Cmd+C.');
    }
  }

  return (
    <div className="copy-control">
      <button className={`button ${primary ? 'primary' : 'secondary'} w-full`} onClick={copy}>
        <Icon name="copy" size={17} />
        {label}
      </button>
      {message && (
        <p className="text-xs muted mt-2" role="status">
          {message}
        </p>
      )}
      {fallback && (
        <textarea
          ref={field}
          readOnly
          value={text}
          aria-label={`Text for ${label.toLowerCase()}`}
          onFocus={(event) => event.target.select()}
          className="code-text mt-3"
        />
      )}
    </div>
  );
}
