import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Study', icon: StudyIcon },
  { path: '/quiz', label: 'Quiz', icon: QuizIcon },
  { path: '/browse', label: 'Browse', icon: BrowseIcon },
  { path: '/progress', label: 'Progress', icon: ProgressIcon },
];

function StudyIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} className={`w-6 h-6 ${active ? 'text-forest dark:text-gold' : 'text-gray-400'}`}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function QuizIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} className={`w-6 h-6 ${active ? 'text-forest dark:text-gold' : 'text-gray-400'}`}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function BrowseIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} className={`w-6 h-6 ${active ? 'text-forest dark:text-gold' : 'text-gray-400'}`}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} className={`w-6 h-6 ${active ? 'text-forest dark:text-gold' : 'text-gray-400'}`}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-charcoal border-t border-gray-200 dark:border-gray-700 safe-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = location.pathname === tab.path ||
            (tab.path !== '/' && location.pathname.startsWith(tab.path));
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors
                ${active ? 'text-forest dark:text-gold' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <Icon active={active} />
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
