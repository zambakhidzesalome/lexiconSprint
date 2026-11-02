import { useState } from 'react';
import { MCQ, MATCH, TOTAL_ANSWERS } from '../data/questions';
import {
  createClassCode,
  decodeClassCode,
  importResultCodes,
  prettyCode,
  rankResults,
  resultsAsTable,
  TEACHER_PIN,
} from '../utils/codes';
import { formatDate, formatDuration } from '../utils/quiz';
import { loadLedger, readStored, STORAGE_KEYS, writeStored } from '../utils/storage';
import CopyButton from './CopyButton';
import Icon from './Icon';

export function TeacherLogin({ onOpen, onBack }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  function login(event) {
    event.preventDefault();
    if (pin === TEACHER_PIN) onOpen();
    else setError('That PIN is not correct. Please try again.');
  }
  return (
    <>
      <button className="text-button self-start" onClick={onBack}>
        <Icon name="back" size={16} /> Student view
      </button>
      <section className="card">
        <span className="icon-box">
          <Icon name="key" size={24} />
        </span>
        <span className="eyebrow mt-5">FOR THE TEACHER</span>
        <h1 tabIndex={-1} className="screen-title mt-2">
          A great sprint starts here.
        </h1>
        <p className="muted mt-3">Open a class, collect results, and celebrate progress.</p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={login}>
          <div>
            <label htmlFor="teacher-pin">Teacher PIN</label>
            <input
              id="teacher-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter the demo PIN"
              aria-invalid={Boolean(error)}
              aria-describedby="pin-help"
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button primary">
            Open teacher tools <Icon name="arrow" size={18} />
          </button>
        </form>
        <p id="pin-help" className="text-xs muted mt-5">
          This is a frontend demo PIN, not secure authentication. The project README includes the
          PIN.
        </p>
      </section>
    </>
  );
}

function SessionCreator() {
  const [group, setGroup] = useState(1);
  const [duration, setDuration] = useState(2);
  const [session, setSession] = useState(() => {
    try {
      return decodeClassCode(readStored(STORAGE_KEYS.session));
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);
  function create(event) {
    event.preventDefault();
    try {
      const code = createClassCode(group, duration);
      setSession(decodeClassCode(code));
      setSaved(writeStored(STORAGE_KEYS.session, code));
      setError('');
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <>
      <section className="card">
        <span className="eyebrow">01 / BRING THE CLASS TOGETHER</span>
        <h2 className="mt-3">Open a session</h2>
        <p className="muted text-sm mt-2">
          Choose your group and how long students can join. One code, shared with your class.
        </p>
        <form onSubmit={create} className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="group">Group</label>
              <select
                id="group"
                value={group}
                onChange={(event) => setGroup(Number(event.target.value))}
              >
                {Array.from({ length: 8 }, (_, index) => (
                  <option key={index} value={index + 1}>
                    Group {index + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="duration">Open for</label>
              <select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value={1}>30 minutes</option>
                <option value={2}>1 hour</option>
                <option value={4}>2 hours</option>
                <option value={6}>3 hours</option>
              </select>
            </div>
          </div>
          {error && (
            <p className="error mt-4" role="alert">
              {error}
            </p>
          )}
          <button className="button primary w-full mt-5" type="submit">
            Create class code <Icon name="arrow" size={18} />
          </button>
        </form>
      </section>
      {session && (
        <section className="card session-card text-center" aria-live="polite">
          <span className="eyebrow">GROUP {session.group} · CLASS CODE</span>
          <p className="big-code">{prettyCode(session.code)}</p>
          <p className="muted text-sm mb-5">
            Valid from {formatDate(session.start)}
            <br />
            until <strong className="ink">{formatDate(session.end)}</strong>
          </p>
          <CopyButton text={prettyCode(session.code)} label="Copy class code" />
          {!saved && (
            <p className="error mt-3">This code could not be saved in this browser. Copy it now.</p>
          )}
        </section>
      )}
      <div className="note flex gap-3">
        <Icon name="info" className="shrink-0 mt-0.5" size={18} />
        <p className="text-sm">
          Share the class code on the board or in your agreed channel. Students can finish an
          attempt started before expiry. A restart needs a valid session.
        </p>
      </div>
      <section className="sharing-steps">
        <h3>From your screen to theirs</h3>
        <ol className="mt-4 flex flex-col gap-3 text-sm muted">
          <li>
            <span>1</span> Share the class code with your students.
          </li>
          <li>
            <span>2</span> Students complete the sprint on their own devices.
          </li>
          <li>
            <span>3</span> They send you result codes. Paste them in Results.
          </li>
        </ol>
      </section>
    </>
  );
}

function ResultBoard({ code, items, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const session = decodeClassCode(code);
  const ranked = rankResults(items);
  const winners = ranked.filter((item) => item.rec.fc === 0).slice(0, 3);
  return (
    <section className="card result-board">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{prettyCode(code)}</span>
          <h2 className="mt-2">Group {session.group}</h2>
          <p className="muted text-xs mt-2">{formatDate(session.start)}</p>
        </div>
        <span className="pill">
          {items.length} result{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <h3 className="mt-6 text-sm flex items-center gap-2">
        <Icon name="trophy" size={17} /> Podium · uninterrupted attempts
      </h3>
      {winners.length ? (
        <div className="podium mt-4">
          {[1, 0, 2].map((place) =>
            winners[place] ? (
              <div key={place} className={`podium-place place-${place + 1}`}>
                <span className="podium-rank">
                  {place === 0 && <Icon name="trophy" size={20} />}
                  {place + 1}
                </span>
                <strong>{winners[place].rec.n}</strong>
                <span className="muted text-xs">{winners[place].rec.s.toLocaleString()} pts</span>
              </div>
            ) : (
              <div key={place} />
            ),
          )}
        </div>
      ) : (
        <p className="muted text-sm mt-3">No uninterrupted attempts yet.</p>
      )}
      <div
        className="table-scroll mt-5"
        tabIndex={0}
        role="region"
        aria-label={`Group ${session.group} ranked results`}
      >
        <table>
          <caption className="sr-only">All results ranked by points, then fastest time</caption>
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Points</th>
              <th>Correct</th>
              <th>Time</th>
              <th>Attempt</th>
              <th>Interruptions</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ raw, rec }, index) => (
              <tr key={raw}>
                <td>{index + 1}</td>
                <td className="font-semibold">{rec.n}</td>
                <td className="font-semibold accent">{rec.s.toLocaleString()}</td>
                <td>
                  {rec.k}/{TOTAL_ANSWERS}
                </td>
                <td>{formatDuration(rec.t)}</td>
                <td>{rec.a}</td>
                <td>
                  <span className={`pill ${rec.fc ? 'flag-pill' : 'clean-pill'}`}>
                    {rec.fc ? `${rec.fc} recorded` : 'None'}
                  </span>
                  {rec.fc > 0 && (
                    <small className="block mt-1 muted">
                      {rec.f
                        .map((flag) => (String(flag) === '0' ? 'Countdown' : `Q${flag}`))
                        .join(', ')}
                      {rec.fc > 12 ? '…' : ''}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted text-xs mt-3">
        All attempts appear in the table. Interruptions are context, not proof of cheating. “r” =
        reloaded or closed; Q0 = countdown.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <CopyButton text={resultsAsTable(items)} label="Copy table" />
        <CopyButton text={items.map((item) => item.raw).join('\n')} label="Copy result codes" />
      </div>
      <p className="text-xs muted mt-3">
        Paste the table into a spreadsheet. To transfer results, paste the codes into Results on the
        other device.
      </p>
      {confirming ? (
        <div className="delete-confirm mt-5" role="alert">
          <p className="text-sm">
            Remove all {items.length} results for this session from this browser?
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button className="button danger small" onClick={() => onDelete(code)}>
              Yes, remove results
            </button>
            <button className="button secondary small" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="text-button danger-text mt-5" onClick={() => setConfirming(true)}>
          Remove this group’s results
        </button>
      )}
    </section>
  );
}

function TeacherResults() {
  const [items, setItems] = useState(loadLedger);
  const [text, setText] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  function save(next) {
    setItems(next);
    setError(
      writeStored(STORAGE_KEYS.ledger, next)
        ? ''
        : 'Results are visible now but could not be saved. Copy the result codes before closing.',
    );
  }
  function add(event) {
    event.preventDefault();
    try {
      const imported = importResultCodes(text, items);
      save(imported.items);
      setReport(imported);
      if (!imported.errors.length && imported.found > 0) setText('');
    } catch (error) {
      setError(error.message);
    }
  }
  const groups = {};
  for (const item of items) {
    (groups[item.rec.c] ||= []).push(item);
  }
  const codes = Object.keys(groups).sort(
    (a, b) => decodeClassCode(b).start - decodeClassCode(a).start,
  );
  return (
    <>
      <section className="card">
        <span className="eyebrow">02 / CELEBRATE THE PROGRESS</span>
        <h2 className="mt-3">Collect your class results</h2>
        <p className="text-sm muted mt-2">
          Paste messages containing student result codes. Unrelated text is ignored, and repeated
          results are skipped.
        </p>
        <form onSubmit={add} className="mt-5">
          <label htmlFor="import-results">Student result codes</label>
          <textarea
            id="import-results"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste messages or VQ1-… result codes here"
            maxLength={200001}
            spellCheck={false}
          />
          <button type="submit" className="button primary w-full mt-4" disabled={!text.trim()}>
            Import results <Icon name="arrow" size={18} />
          </button>
        </form>
        {report && (
          <div className="note mt-4" role="status">
            <p className="text-sm font-semibold">
              {report.added} added · {report.duplicates} duplicate
              {report.duplicates === 1 ? '' : 's'} skipped · {report.errors.length} invalid
            </p>
            {!report.found && (
              <p className="text-sm mt-1">No result codes found. Codes begin with VQ1-.</p>
            )}
            {report.errors.length > 0 && (
              <ul className="text-xs mt-2 list-disc pl-4">
                {report.errors.slice(0, 8).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {report.errors.length > 8 && (
                  <li>{report.errors.length - 8} more invalid codes.</li>
                )}
              </ul>
            )}
          </div>
        )}
        {error && (
          <p className="error mt-4" role="alert">
            {error}
          </p>
        )}
      </section>
      {!items.length && (
        <div className="empty-state">
          <span className="icon-box mx-auto">
            <Icon name="trophy" size={25} />
          </span>
          <h3 className="mt-4">Every sprint tells a story.</h3>
          <p className="muted text-sm mt-2">
            Your class leaderboard will appear here
            <br />
            when you import the first result.
          </p>
        </div>
      )}
      {codes.map((code) => (
        <ResultBoard
          key={code}
          code={code}
          items={groups[code]}
          onDelete={(codeToDelete) => save(items.filter((item) => item.rec.c !== codeToDelete))}
        />
      ))}
      <p className="muted text-xs">
        Results belong to this browser’s localStorage. There is no automatic synchronization.
        Frontend codes and checksums cannot securely verify scores.
      </p>
    </>
  );
}

function AnswerKey() {
  return (
    <section className="card">
      <span className="eyebrow">THE COMPLETE QUESTION BANK</span>
      <h2 className="mt-3">Answer key</h2>
      <p className="muted text-sm mt-2">
        36 questions and 6 matching sets. Students see a shuffled order in every attempt. Correct
        answers are highlighted.
      </p>
      <div className="answer-key mt-6">
        {MCQ.map((question, index) => (
          <article key={index}>
            <span className="eyebrow">
              Q{index + 1} · {question.k === 'g' ? 'FILL THE GAP' : 'MEANING'}
            </span>
            <h3 className="mt-2">{question.q}</h3>
            <p className="key-answer mt-2">
              <Icon name="check" size={17} />
              {question.o[0]}
            </p>
          </article>
        ))}
        {MATCH.map((set, index) => (
          <article key={set.title}>
            <span className="eyebrow">MATCH {index + 1}</span>
            <h3 className="mt-2 mb-3">{set.title}</h3>
            <dl className="flex flex-col gap-3">
              {set.pairs.map(([word, definition]) => (
                <div key={word}>
                  <dt className="key-answer font-semibold">{word}</dt>
                  <dd className="text-sm muted mt-0.5">{definition}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TeacherDashboard({ onStudent }) {
  const [tab, setTab] = useState('session');
  return (
    <>
      <div>
        <span className="eyebrow">TEACHER SPACE</span>
        <h1 tabIndex={-1} className="screen-title mt-2">
          Let’s make words stick.
        </h1>
      </div>
      <nav className="teacher-nav" aria-label="Teacher tools">
        {[
          ['session', 'New session', 'key'],
          ['results', 'Results', 'trophy'],
          ['answers', 'Answer key', 'book'],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <Icon name={icon} size={16} />
            {label}
          </button>
        ))}
      </nav>
      {tab === 'session' ? (
        <SessionCreator />
      ) : tab === 'results' ? (
        <TeacherResults />
      ) : (
        <AnswerKey />
      )}
      <button className="text-button self-center" onClick={onStudent}>
        <Icon name="back" size={16} /> Back to student view
      </button>
    </>
  );
}
