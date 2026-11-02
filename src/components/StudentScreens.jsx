import { useEffect, useState } from 'react';
import { TOTAL_SCREENS, TOTAL_ANSWERS, MAX_POINTS } from '../data/questions';
import { validateClassCode, prettyCode } from '../utils/codes';
import { formatDate, formatDuration } from '../utils/quiz';
import { readStored, STORAGE_KEYS } from '../utils/storage';
import Icon from './Icon';
import CopyButton from './CopyButton';

export function JoinScreen({ onJoin, onTeacher }) {
  const [name, setName] = useState(() => {
    const saved = readStored(STORAGE_KEYS.name, '');
    return typeof saved === 'string' ? saved : '';
  });
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});

  function join(event) {
    event.preventDefault();
    const fullName = name.trim().replace(/\s+/g, ' ');
    const nextErrors = {};
    if (
      fullName.length < 3 ||
      fullName.length > 40 ||
      fullName.split(' ').length < 2 ||
      /[\u0000-\u001f\u007f]/.test(fullName)
    ) {
      nextErrors.name = 'Please enter your first and last name (3–40 characters).';
    }
    let session;
    try {
      session = validateClassCode(code);
    } catch (error) {
      nextErrors.code = error.message;
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onJoin(fullName, session);
  }

  return (
    <>
      <section className="join-hero text-center">
        <span className="eyebrow">
          <span className="status-dot" /> A little challenge. A lot of words.
        </span>
        <div className="word-tiles" aria-hidden="true">
          <span>Aa</span>
          <span>
            <Icon name="bolt" size={33} />
          </span>
          <span>Zz</span>
        </div>
        <h1 tabIndex={-1}>
          Ready, set,
          <br />
          <span className="accent">find your words.</span>
        </h1>
        <p className="muted mt-4 mx-auto max-w-sm">
          Put your vocabulary to the test.
          <br />
          One question at a time. Every second counts.
        </p>
        <div className="feature-strip">
          <span>
            <Icon name="book" size={16} /> Units 1–5
          </span>
          <span>
            <Icon name="grid" size={16} /> {TOTAL_SCREENS} screens
          </span>
          <span>
            <Icon name="clock" size={16} /> ~25 minutes
          </span>
        </div>
      </section>
      <section className="card join-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2>Join your class</h2>
            <p className="muted text-sm mt-1.5">Your next vocabulary sprint starts here.</p>
          </div>
          <span className="icon-box">
            <Icon name="arrow" />
          </span>
        </div>
        <form onSubmit={join} noValidate className="flex flex-col gap-5 mt-6">
          <div>
            <label htmlFor="student-name">Your full name</label>
            <div className="input-with-icon">
              <Icon name="user" size={18} />
              <input
                id="student-name"
                autoComplete="name"
                maxLength={40}
                placeholder="First and last name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </div>
            {errors.name && (
              <p id="name-error" role="alert" className="field-error">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="class-code">Class code</label>
            <div className="input-with-icon">
              <Icon name="key" size={18} />
              <input
                id="class-code"
                className="class-code-input"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={18}
                placeholder="ABCD-EFGH"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'code-error' : 'code-help'}
              />
            </div>
            {errors.code ? (
              <p id="code-error" role="alert" className="field-error">
                {errors.code}
              </p>
            ) : (
              <p id="code-help" className="text-xs muted mt-2">
                Enter the code shared by your teacher.
              </p>
            )}
          </div>
          <button className="button primary w-full" type="submit">
            Let’s get started <Icon name="arrow" size={18} />
          </button>
        </form>
        <p className="flex items-center justify-center gap-2 text-xs muted mt-4">
          <Icon name="shield" size={15} /> Take a breath. You’ve got this.
        </p>
      </section>
      <div className="teacher-link">
        <span className="muted text-sm">Here to lead the class?</span>
        <button className="text-button" onClick={onTeacher}>
          Teacher tools <Icon name="arrow" size={15} />
        </button>
      </div>
    </>
  );
}

export function RulesScreen({ student, onStart, onBack }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const rules = [
    [
      'Find your rhythm',
      `${TOTAL_SCREENS} screens: meanings (25 seconds), fill the gap (30 seconds), and matching sets (75 seconds). Allow about 25 minutes.`,
    ],
    [
      'Accuracy meets speed',
      'A correct answer earns 600–1,000 points depending on your speed. Each matching set shares those points across four pairs. Incorrect answers earn zero.',
    ],
    [
      'Keep moving forward',
      'Choose an answer to submit it. Match all four pairs and submit, or earn partial credit when time runs out. You cannot return to earlier questions.',
    ],
    [
      'Stay on this page',
      'Switching tabs or apps, locking your screen, or reloading stops this attempt. You can restart from question 1 with a new order. Interruptions and question numbers are shared with your teacher.',
    ],
    [
      'Make it your own',
      'Use your own knowledge: no dictionaries, AI, or outside help. Turn on Do Not Disturb and keep your screen awake.',
    ],
  ];
  function start() {
    try {
      onStart();
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <>
      <button onClick={onBack} className="text-button self-start">
        <Icon name="back" size={16} /> Back to join
      </button>
      <section className="card">
        <span className="eyebrow">
          GROUP {student.group} · {prettyCode(student.code)}
        </span>
        <h1 tabIndex={-1} className="screen-title mt-3">
          Before you sprint,
          <br />
          {student.name.split(' ')[0]}.
        </h1>
        <p className="muted mt-3">A few things to know before the countdown.</p>
        <ol className="rules-list">
          {rules.map(([title, detail], index) => (
            <li key={title}>
              <span className="rule-number">{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p className="muted text-sm mt-1">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="note text-sm">
          Interruptions are context for your teacher, not proof of cheating. Your session accepts
          new attempts until {formatDate(student.end)}.
        </div>
        <label className="check-label mt-5">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>I understand the rules and I’m ready to start.</span>
        </label>
        {error && (
          <p className="error mt-4" role="alert">
            {error}
          </p>
        )}
        <button className="button primary w-full mt-5" disabled={!acknowledged} onClick={start}>
          Start my sprint <Icon name="bolt" size={18} />
        </button>
      </section>
    </>
  );
}

export function CountdownScreen({ end }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(1, Math.ceil((end - Date.now()) / 800)),
  );
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining(Math.max(1, Math.ceil((end - Date.now()) / 800))),
      80,
    );
    return () => clearInterval(timer);
  }, [end]);
  return (
    <section className="card countdown-card text-center">
      <span className="icon-box mx-auto">
        <Icon name="bolt" size={25} />
      </span>
      <h1 tabIndex={-1} className="screen-title mt-5">
        Find your focus.
      </h1>
      <p className="muted mt-2">Your sprint is about to begin. Stay on this page.</p>
      <div className="countdown" aria-live="polite">
        {remaining}
      </div>
      <p className="eyebrow">YOU’VE GOT THIS</p>
    </section>
  );
}

export function InterruptedScreen({ student, onRestart, onJoin }) {
  const [error, setError] = useState('');
  const last = student.flags.at(-1);
  function restart() {
    try {
      onRestart();
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <section className="card">
      <span className="icon-box warning-icon">
        <Icon name="info" size={25} />
      </span>
      <span className="eyebrow mt-5">LET’S RESET</span>
      <h1 tabIndex={-1} className="screen-title mt-2">
        Your sprint was interrupted.
      </h1>
      <p className="muted mt-4">
        {last?.reason === 'reload' ? 'The page was reloaded or closed.' : 'The page became hidden.'}{' '}
        Your attempt stopped {last?.q ? `at question ${last.q}` : 'during the countdown'}.
      </p>
      <div className="note mt-5">
        Restart from question 1 with shuffled questions. This will be attempt{' '}
        <strong>{student.attempt}</strong>. Your result will include{' '}
        <strong>
          {student.flags.length} interruption{student.flags.length === 1 ? '' : 's'}
        </strong>
        .
      </div>
      <p className="text-sm muted mt-4">
        An interruption can happen for many reasons. It is recorded for context, not as proof of
        cheating.
      </p>
      {error && (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      )}
      <button className="button primary mt-6 w-full" onClick={restart}>
        Start again <Icon name="arrow" size={18} />
      </button>
      <button className="button secondary mt-3 w-full" onClick={onJoin}>
        Join a different session
      </button>
    </section>
  );
}

export function ResultsScreen({ student, onNewSession }) {
  const result = student.result;
  return (
    <>
      <section className="card result-card text-center">
        <span className="trophy-badge">
          <Icon name="trophy" size={32} />
        </span>
        <span className="eyebrow mt-5">SPRINT COMPLETE</span>
        <h1 tabIndex={-1} className="screen-title mt-2">
          You made it, {student.name.split(' ')[0]}!
        </h1>
        <p className="muted mt-2">
          {student.name} · Group {student.group}
        </p>
        <div className="result-points">{result.s.toLocaleString()}</div>
        <p className="muted text-sm">points out of {MAX_POINTS.toLocaleString()}</p>
        <div className="stats-grid mt-7">
          <div>
            <b>
              {result.k}
              <small>/{TOTAL_ANSWERS}</small>
            </b>
            <span>Correct answers</span>
          </div>
          <div>
            <b>{formatDuration(result.t)}</b>
            <span>Elapsed time</span>
          </div>
          <div>
            <b>{result.a}</b>
            <span>Attempt</span>
          </div>
          <div>
            <b>{result.fc}</b>
            <span>Interruptions</span>
          </div>
        </div>
        {result.fc > 0 && (
          <p className="note mt-5 text-sm text-left">
            {result.fc} interruption{result.fc === 1 ? '' : 's'} recorded.{' '}
            {result.f.map((flag) => (String(flag) === '0' ? 'Countdown' : `Q${flag}`)).join(', ')}
            {result.fc > 12 ? ' (first 12 shown)' : ''}. “r” means a reload or page close.
          </p>
        )}
      </section>
      <section className="card">
        <div className="flex gap-3 items-center">
          <span className="icon-box">
            <Icon name="copy" />
          </span>
          <h2>Make it official.</h2>
        </div>
        <p className="muted text-sm mt-4 mb-4">
          Copy your result code and send it to your teacher in the agreed chat. Your name, score,
          and attempt information are inside. Sending it is up to you.
        </p>
        <label htmlFor="result-code">Your result code</label>
        <textarea
          id="result-code"
          className="code-text mb-4"
          readOnly
          value={student.resultCode}
          onFocus={(event) => event.target.select()}
        />
        <CopyButton text={student.resultCode} label="Copy my result code" primary />
        <p className="text-xs muted mt-4">
          Saved in this browser. It will still be here after a refresh.
        </p>
      </section>
      <button className="text-button self-center" onClick={onNewSession}>
        Join a new session <Icon name="arrow" size={16} />
      </button>
    </>
  );
}
