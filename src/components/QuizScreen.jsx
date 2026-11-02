import { Fragment, useEffect, useRef, useState } from 'react';
import { timeLimit } from '../utils/quiz';
import { TOTAL_SCREENS } from '../data/questions';
import Icon from './Icon';

function MatchingQuestion({ question, assignments, setAssignments }) {
  const [selected, setSelected] = useState(null);
  const used = new Set(Object.values(assignments));

  function assign(definitionId) {
    if (assignments[definitionId] !== undefined) {
      const next = { ...assignments };
      delete next[definitionId];
      setAssignments(next);
    } else if (selected !== null) {
      setAssignments({ ...assignments, [definitionId]: selected });
      setSelected(null);
    }
  }

  return (
    <>
      <p className="muted text-sm mt-3">
        Choose a word, then its definition. Choose a paired definition to undo.
      </p>
      <div className="grid grid-cols-2 gap-2.5 my-5" role="group" aria-label="Words to match">
        {question.terms.map((term) => (
          <button
            key={term.id}
            className={`match-term ${selected === term.id ? 'selected' : ''}`}
            disabled={used.has(term.id)}
            aria-pressed={selected === term.id}
            onClick={() => setSelected(selected === term.id ? null : term.id)}
          >
            {term.text}
            {used.has(term.id) && <Icon name="check" size={14} />}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5" role="group" aria-label="Definitions">
        {question.definitions.map((definition) => {
          const paired = assignments[definition.id] !== undefined;
          const term = question.terms.find((term) => term.id === assignments[definition.id]);
          return (
            <button
              key={definition.id}
              className={`match-definition ${paired ? 'paired' : ''}`}
              onClick={() => assign(definition.id)}
              aria-label={`${paired ? `${term.text}: ` : ''}${definition.text}${paired ? '. Select to undo.' : ''}`}
              aria-disabled={!paired && selected === null}
            >
              {paired && (
                <span className="paired-word">
                  {term.text} <span aria-hidden="true">×</span>
                </span>
              )}
              {definition.text}
            </button>
          );
        })}
      </div>
      <p className="text-xs muted mt-4" aria-live="polite">
        {Object.keys(assignments).length} of 4 paired
        {selected !== null
          ? ` · Selected: ${question.terms.find((term) => term.id === selected)?.text}`
          : ''}
      </p>
    </>
  );
}

export default function QuizScreen({ student, onAnswer }) {
  const index = student.questionIndex;
  const question = student.questions[index];
  const total = timeLimit(question);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, total - (Date.now() - student.questionStartedAt)),
  );
  const [assignments, setAssignments] = useState({});
  const currentAssignments = useRef({});
  const submitted = useRef(false);
  const fraction = remaining / total;

  function changeAssignments(next) {
    currentAssignments.current = next;
    setAssignments(next);
  }
  function submit(answer) {
    if (submitted.current) return;
    submitted.current = true;
    onAnswer(index, answer);
  }

  useEffect(() => {
    // Use a deadline, not tick counting. Slow frames do not grant extra quiz time.
    const tick = () => {
      const left = Math.max(0, total - (Date.now() - student.questionStartedAt));
      setRemaining(left);
      if (left === 0 && !submitted.current) {
        submitted.current = true;
        onAnswer(index, question.type === 'match' ? currentAssignments.current : null);
      }
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [index, total, student.questionStartedAt, onAnswer, question.type]);

  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="muted">
          Group {student.group} <span className="mx-1">/</span> Attempt {student.attempt}
        </span>
        <span className="score-chip">
          <Icon name="bolt" size={15} /> {student.points.toLocaleString()} pts
        </span>
      </div>
      <section className="card quiz-card">
        <div className="flex items-center justify-between">
          <span className="text-sm muted">
            Question <strong className="ink">{index + 1}</strong> of {TOTAL_SCREENS}
          </span>
          <span
            className={`timer ${fraction < 0.2 ? 'danger-text' : ''}`}
            role="timer"
            aria-label={`${Math.ceil(remaining / 1000)} seconds remaining`}
          >
            <Icon name="clock" size={18} />
            {Math.ceil(remaining / 1000)}
            <small>s</small>
          </span>
        </div>
        <div
          className="timer-rail mt-3 mb-7"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuemin={0}
          aria-valuemax={Math.round(total / 1000)}
          aria-valuenow={Math.ceil(remaining / 1000)}
        >
          <div
            className={fraction < 0.2 ? 'critical' : fraction < 0.4 ? 'low' : ''}
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
        <span className="eyebrow">
          {question.type === 'match'
            ? 'MATCH THE PAIRS'
            : question.type === 'gap'
              ? 'FILL THE GAP'
              : 'FIND THE MEANING'}
        </span>
        <h1 tabIndex={-1} className="question-title mt-3">
          {question.prompt.split('______').map((part, partIndex) => (
            <Fragment key={partIndex}>
              {partIndex > 0 && (
                <span className="question-blank" aria-label="blank">
                  ______
                </span>
              )}
              {part}
            </Fragment>
          ))}
        </h1>
        {question.type === 'match' ? (
          <>
            <MatchingQuestion
              question={question}
              assignments={assignments}
              setAssignments={changeAssignments}
            />
            <button
              className="button primary w-full mt-5"
              disabled={Object.keys(assignments).length !== 4}
              onClick={() => submit(assignments)}
            >
              Submit matches <Icon name="arrow" size={17} />
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3 mt-7" role="group" aria-label="Answer options">
            {question.options.map((option, optionIndex) => (
              <button key={option.id} className="answer-option" onClick={() => submit(option.id)}>
                <span className="option-letter">{'ABCD'[optionIndex]}</span>
                <span>{option.text}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="flex justify-between text-xs muted">
        <span>{student.name}</span>
        <span>
          {question.type === 'match'
            ? '4 pairs · up to 1,000 points'
            : 'Choose an answer to continue'}
        </span>
      </div>
      <div className="quiz-progress" aria-hidden="true">
        {Array.from({ length: TOTAL_SCREENS }, (_, step) => (
          <span
            key={step}
            className={step < index ? 'complete' : step === index ? 'current' : ''}
          />
        ))}
      </div>
      <p className="text-xs muted text-center flex items-center justify-center gap-2">
        <Icon name="shield" size={14} /> Stay on this page until your sprint is complete.
      </p>
    </>
  );
}
