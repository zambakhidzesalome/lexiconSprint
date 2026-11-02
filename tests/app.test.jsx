import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App';
import QuizScreen from '../src/components/QuizScreen';
import CopyButton from '../src/components/CopyButton';
import { MCQ, MATCH } from '../src/data/questions';
import { createClassCode, decodeClassCode, decodeResultCode } from '../src/utils/codes';
import { startAttempt } from '../src/utils/attempt';
import { readStored, writeStored, STORAGE_KEYS } from '../src/utils/storage';

const now = Date.UTC(2026, 9, 28, 10);
function showApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
function click(name) {
  fireEvent.click(screen.getByRole('button', { name, exact: true }));
}
function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function tick(milliseconds) {
  act(() => vi.advanceTimersByTime(milliseconds));
}
function studentState() {
  return readStored(STORAGE_KEYS.student);
}
function readyStudent() {
  return {
    ...decodeClassCode(createClassCode(1, 2, now)),
    name: 'Test Student',
    status: 'ready',
    attempt: 1,
    flags: [],
  };
}
function enterTeacher() {
  click('Teacher tools');
  fill('Teacher PIN', '4127');
  click('Open teacher tools');
}
function beginQuiz() {
  fireEvent.click(screen.getByRole('checkbox'));
  click('Start my sprint');
  tick(2400);
}

describe('complete React flow in isolated browser-storage snapshots', () => {
  it('creates a session, completes all questions on separate storage, and imports a persistent result', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const teacher = showApp();
    enterTeacher();
    click('Create class code');
    const classCode = document.querySelector('.big-code').textContent;
    const teacherStorage = { ...localStorage };
    teacher.unmount();

    // A second empty storage simulates the student's independent browser.
    localStorage.clear();
    const student = showApp();
    fill('Your full name', 'სალომე ზამბახიძე');
    fill('Class code', classCode);
    click('Let’s get started');
    expect(screen.getByRole('button', { name: 'Start my sprint' }).disabled).toBe(true);
    beginQuiz();
    for (let index = 0; index < 42; index++) {
      const prompt = screen.getByRole('heading', { level: 1 }).textContent;
      const matching = MATCH.find((set) => set.title === prompt);
      if (matching) {
        const definitions = screen.getByRole('group', { name: 'Definitions' });
        for (const [word, definition] of matching.pairs) {
          click(word);
          fireEvent.click(
            within(definitions).getByRole('button', { name: definition, exact: true }),
          );
        }
        click('Submit matches');
      } else {
        const question = MCQ.find((item) => item.q === prompt);
        expect(question).toBeDefined();
        const choices = screen.getByRole('group', { name: 'Answer options' });
        fireEvent.click(within(choices).getByText(question.o[0]).closest('button'));
      }
    }
    expect(studentState().status).toBe('done');
    expect(studentState().correct).toBe(60);
    const resultCode = screen.getByLabelText('Your result code').value;
    expect(decodeResultCode(resultCode).s).toBe(42000);
    expect(localStorage.getItem(STORAGE_KEYS.ledger)).toBeNull();
    student.unmount();
    const refreshed = showApp();
    expect(screen.getByLabelText('Your result code').value).toBe(resultCode);
    refreshed.unmount();

    // Return to the teacher's storage; only the manually copied code crosses over.
    localStorage.clear();
    for (const [key, value] of Object.entries(teacherStorage)) localStorage.setItem(key, value);
    const returnedTeacher = showApp();
    enterTeacher();
    click('Results');
    fill('Student result codes', `Here is my result: ${resultCode}\n${resultCode}\nVQ1-broken`);
    click('Import results');
    expect(screen.getByRole('status').textContent).toContain(
      '1 added · 1 duplicate skipped · 1 invalid',
    );
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(document.querySelector('.podium-place').textContent).toContain('სალომე ზამბახიძე');
    returnedTeacher.unmount();
    showApp();
    enterTeacher();
    click('Results');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    click('Remove this group’s results');
    click('Cancel');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    click('Remove this group’s results');
    click('Yes, remove results');
    expect(readStored(STORAGE_KEYS.ledger)).toEqual([]);
  });

  it('shows name, invalid-code, future-code and expired-code errors without losing inputs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    showApp();
    click('Let’s get started');
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    fill('Your full name', 'Test Student');
    fill('Class code', createClassCode(1, 1, now - 3600000));
    click('Let’s get started');
    expect(screen.getByRole('alert').textContent).toMatch(/expired/);
    expect(screen.getByLabelText('Your full name').value).toBe('Test Student');
    fill('Class code', createClassCode(1, 1, now + 3600000));
    click('Let’s get started');
    expect(screen.getByRole('alert').textContent).toMatch(/not started/);
  });
});

describe('interruption and timer cleanup in Strict Mode', () => {
  it('records hidden + pagehide once, restarts, and recovers a later reload once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    writeStored(STORAGE_KEYS.student, readyStudent());
    const app = showApp();
    beginQuiz();
    expect(studentState().status).toBe('playing');
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(studentState().status).toBe('interrupted');
    expect(studentState().flags).toHaveLength(1);
    tick(90000);
    expect(studentState().flags).toHaveLength(1);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    click('Start again');
    tick(2400);
    expect(studentState().questionIndex).toBe(0);
    expect(studentState().attempt).toBe(2);
    app.unmount();
    const reloaded = showApp();
    expect(studentState().status).toBe('interrupted');
    expect(studentState().flags).toHaveLength(2);
    expect(studentState().flags[1].reason).toBe('reload');
    reloaded.unmount();
    showApp();
    expect(studentState().flags).toHaveLength(2);
  });

  it('keeps interruption history through the join and rules screens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const previous = {
      ...readyStudent(),
      status: 'interrupted',
      attempt: 2,
      flags: [{ q: 3, reason: 'hidden', at: now }],
    };
    writeStored(STORAGE_KEYS.student, previous);
    showApp();
    click('Join a different session');
    fill('Your full name', previous.name);
    fill('Class code', previous.code);
    click('Let’s get started');
    click('Back to join');
    click('Let’s get started');
    // Re-enter the code after the join form remounts.
    fill('Class code', previous.code);
    click('Let’s get started');
    expect(studentState().attempt).toBe(2);
    expect(studentState().flags).toHaveLength(1);
  });

  it('expires one question once and clears the interval on unmount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const state = startAttempt(readyStudent(), now);
    const meaning = state.questions.find((question) => question.type === 'meaning');
    state.questions = [meaning];
    const onAnswer = vi.fn();
    const view = render(
      <StrictMode>
        <QuizScreen student={state} onAnswer={onAnswer} />
      </StrictMode>,
    );
    tick(25000);
    tick(1000);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(0, null);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports pairing, undo and partial matching submission on timeout', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const state = startAttempt(readyStudent(), now);
    const match = state.questions.find((question) => question.type === 'match');
    state.questions = [match];
    const onAnswer = vi.fn();
    render(
      <StrictMode>
        <QuizScreen student={state} onAnswer={onAnswer} />
      </StrictMode>,
    );
    const term = match.terms[0];
    const definition = match.definitions.find((definition) => definition.id === term.id);
    click(term.text);
    click(definition.text);
    expect(screen.getByRole('button', { name: 'Submit matches' }).disabled).toBe(true);
    click(`${term.text}: ${definition.text}. Select to undo.`);
    expect(screen.getByRole('button', { name: term.text, exact: true }).disabled).toBe(false);
    click(term.text);
    click(definition.text);
    tick(75000);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(0, { [definition.id]: term.id });
  });

  it('cancels a hidden countdown and refuses to restart an expired session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    writeStored(STORAGE_KEYS.student, readyStudent());
    showApp();
    fireEvent.click(screen.getByRole('checkbox'));
    click('Start my sprint');
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(5000);
    expect(studentState().flags[0].q).toBe(0);
    expect(studentState().status).toBe('interrupted');
    vi.setSystemTime(now + 7200000);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    click('Start again');
    expect(screen.getByRole('alert').textContent).toMatch(/expired/);
  });
});

describe('teacher and copy controls', () => {
  it('rejects a wrong PIN and shows the full answer key', () => {
    showApp();
    click('Teacher tools');
    fill('Teacher PIN', '0000');
    click('Open teacher tools');
    expect(screen.getByRole('alert').textContent).toMatch(/not correct/);
    fill('Teacher PIN', '4127');
    click('Open teacher tools');
    click('Answer key');
    expect(document.querySelectorAll('.answer-key article')).toHaveLength(42);
    click('Back to student view');
    expect(screen.getByLabelText('Your full name')).toBeDefined();
  });

  it('offers selected, manually copyable text when clipboard access is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Blocked')) },
    });
    render(<CopyButton text="sample code" />);
    await act(async () => click('Copy code'));
    const fallback = screen.getByRole('textbox');
    expect(fallback.value).toBe('sample code');
    expect(fallback.selectionEnd - fallback.selectionStart).toBe(11);
    expect(screen.getByRole('status').textContent).toMatch(/Ctrl\/Cmd/);
  });
});
