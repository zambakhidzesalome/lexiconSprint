import { useState, useRef, useEffect, useCallback } from 'react';
import { loadStudent, STORAGE_KEYS, writeStored } from '../utils/storage.js';
import { interruptAttempt, startAttempt, submitAnswer } from '../utils/attempt.js';
import { validateClassCode } from '../utils/codes.js';

export default function useStudent() {
  // This initializer is pure. Strict Mode can call it twice without recording twice.
  const [student, setStudent] = useState(() => interruptAttempt(loadStudent(), 'reload'));
  const [storageAvailable, setStorageAvailable] = useState(true);
  const current = useRef(student);

  const update = useCallback((change) => {
    const next = change(current.current);
    if (next === current.current) return;
    // Save synchronously, before React renders, so pagehide cannot lose the incident.
    current.current = next;
    setStorageAvailable(writeStored(STORAGE_KEYS.student, next));
    setStudent(next);
  }, []);

  useEffect(() => {
    // This effect synchronizes browser storage and reports a failed recovery write.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageAvailable(writeStored(STORAGE_KEYS.student, current.current));
    const hidden = () => {
      if (document.hidden) update((value) => interruptAttempt(value, 'hidden'));
    };
    const pagehide = () => update((value) => interruptAttempt(value, 'reload'));
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pagehide);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [update]);

  useEffect(() => {
    if (student?.status !== 'countdown') return;
    const timer = setInterval(() => {
      if (document.hidden) update((value) => interruptAttempt(value, 'hidden'));
      else if (Date.now() >= student.countdownEnd)
        update((value) => (value?.status === 'countdown' ? startAttempt(value) : value));
    }, 80);
    return () => clearInterval(timer);
  }, [student?.status, student?.countdownEnd, update]);

  function join(name, session) {
    writeStored(STORAGE_KEYS.name, name);
    update((previous) => {
      // Rejoining an interrupted session retains its history.
      const returning =
        previous?.code === session.code &&
        previous.name === name &&
        ['interrupted', 'ready'].includes(previous.status);
      return {
        ...session,
        name,
        status: 'ready',
        attempt: returning ? previous.attempt : 1,
        flags: returning ? previous.flags : [],
      };
    });
  }

  function countdown() {
    validateClassCode(current.current.code);
    update((value) => ({ ...value, status: 'countdown', countdownEnd: Date.now() + 2400 }));
  }

  const answer = useCallback(
    (index, value) => {
      update((studentState) =>
        document.hidden
          ? interruptAttempt(studentState, 'hidden')
          : submitAnswer(studentState, index, value),
      );
    },
    [update],
  );

  return { student, storageAvailable, join, countdown, answer };
}
