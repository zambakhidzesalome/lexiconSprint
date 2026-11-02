import { useEffect, useRef, useState } from 'react';
import useStudent from './hooks/useStudent';
import { readStored, STORAGE_KEYS, writeStored } from './utils/storage';
import {
  JoinScreen,
  RulesScreen,
  CountdownScreen,
  InterruptedScreen,
  ResultsScreen,
} from './components/StudentScreens';
import QuizScreen from './components/QuizScreen';
import { TeacherLogin, TeacherDashboard } from './components/TeacherScreens';
import Icon from './components/Icon';

export default function App() {
  const { student, storageAvailable, join, countdown, answer } = useStudent();
  const [view, setView] = useState('student');
  const [joining, setJoining] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = readStored(STORAGE_KEYS.theme);
    return saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  });
  const main = useRef(null);
  const active = ['playing', 'countdown'].includes(student?.status);
  const screen = view !== 'student' ? view : joining ? 'join' : student?.status || 'join';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStored(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    main.current?.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, student?.questionIndex]);

  function joinClass(name, session) {
    join(name, session);
    setJoining(false);
  }
  let content;
  if (view === 'login')
    content = <TeacherLogin onOpen={() => setView('teacher')} onBack={() => setView('student')} />;
  else if (view === 'teacher') content = <TeacherDashboard onStudent={() => setView('student')} />;
  else if (screen === 'join')
    content = <JoinScreen onJoin={joinClass} onTeacher={() => setView('login')} />;
  else if (student.status === 'ready')
    content = <RulesScreen student={student} onStart={countdown} onBack={() => setJoining(true)} />;
  else if (student.status === 'countdown') content = <CountdownScreen end={student.countdownEnd} />;
  else if (student.status === 'playing')
    content = (
      <QuizScreen
        key={`${student.attempt}-${student.questionIndex}`}
        student={student}
        onAnswer={answer}
      />
    );
  else if (student.status === 'interrupted')
    content = (
      <InterruptedScreen student={student} onRestart={countdown} onJoin={() => setJoining(true)} />
    );
  else content = <ResultsScreen student={student} onNewSession={() => setJoining(true)} />;

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="bolt" size={21} />
          </span>
          <span>
            Lexicon<span className="accent"> Sprint</span>
            <span className="brand-period">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!active && view === 'student' && screen !== 'join' && (
            <button
              className="header-tool"
              onClick={() => setView('login')}
              aria-label="Teacher tools"
            >
              <Icon name="key" size={18} />
            </button>
          )}
          <button
            className="header-tool"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          </button>
        </div>
      </header>
      <main
        id="main"
        ref={main}
        className={`main-content ${view === 'teacher' ? 'teacher-content' : ''} ${screen === 'join' ? 'join-content' : ''}`}
      >
        {!storageAvailable && (
          <p className="error" role="alert">
            Browser storage is unavailable. Progress cannot survive a refresh. Enable storage before
            starting, and copy any completed result code.
          </p>
        )}
        {joining && student && (
          <button className="text-button self-start" onClick={() => setJoining(false)}>
            <Icon name="back" size={16} /> Back to my{' '}
            {student.status === 'done' ? 'result' : 'session'}
          </button>
        )}
        {content}
      </main>
      <footer className="site-footer">
        <span>Lexicon Sprint</span>
        <span className="footer-dot">·</span>
        <span>Created by Salome.</span>
      </footer>
    </div>
  );
}
