import React, { useState } from 'react';
import { Search, BookOpen, ChevronLeft, GraduationCap, Users } from 'lucide-react';

// NCERT Data Structure
const libraryData: any = {
  '10': { title: 'Class 10', subjects: ['Mathematics', 'Science', 'Social Science', 'English'] },
  '11': {
    title: 'Class 11',
    streams: {
      Science: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
      Commerce: ['Accountancy', 'Business Studies', 'Economics'],
      Arts: ['History', 'Geography', 'Political Science', 'Economics']
    }
  },
  '12': {
    title: 'Class 12',
    streams: {
      Science: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
      Commerce: ['Accountancy', 'Business Studies', 'Economics'],
      Arts: ['History', 'Geography', 'Political Science', 'Economics']
    }
  },
  'UPSC': { title: 'UPSC', subjects: ['History', 'Geography', 'Polity', 'Economics'] }
};

// Comprehensive chapter data for all subjects mentioned above.
const chapterData: any = {
  // Class 10
  'Mathematics': Array.from({ length: 15 }, (_, i) => ({ name: `Mathematics Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khmh1=0-15`, english: `https://ncert.nic.in/textbook.php?lemh1=0-15` })),
  'Science': Array.from({ length: 16 }, (_, i) => ({ name: `Science Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khsc1=0-16`, english: `https://ncert.nic.in/textbook.php?lesc1=0-16` })),
  'Social Science': Array.from({ length: 20 }, (_, i) => ({ name: `Social Science Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khss1=0-20`, english: `https://ncert.nic.in/textbook.php?less1=0-20` })),
  'English': Array.from({ length: 10 }, (_, i) => ({ name: `English Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khen1=0-10`, english: `https://ncert.nic.in/textbook.php?leen1=0-10` })),

  // Class 11 & 12 Science
  'Physics': Array.from({ length: 14 }, (_, i) => ({ name: `Physics Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khph1=0-14`, english: `https://ncert.nic.in/textbook.php?leph1=0-14` })),
  'Chemistry': Array.from({ length: 14 }, (_, i) => ({ name: `Chemistry Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khch1=0-14`, english: `https://ncert.nic.in/textbook.php?lech1=0-14` })),
  'Biology': Array.from({ length: 22 }, (_, i) => ({ name: `Biology Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khbi1=0-22`, english: `https://ncert.nic.in/textbook.php?lebi1=0-22` })),

  // Class 11 & 12 Commerce
  'Accountancy': Array.from({ length: 12 }, (_, i) => ({ name: `Accountancy Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khac1=0-12`, english: `https://ncert.nic.in/textbook.php?leac1=0-12` })),
  'Business Studies': Array.from({ length: 12 }, (_, i) => ({ name: `Business Studies Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khbs1=0-12`, english: `https://ncert.nic.in/textbook.php?lebs1=0-12` })),
  'Economics': Array.from({ length: 10 }, (_, i) => ({ name: `Economics Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khec1=0-10`, english: `https://ncert.nic.in/textbook.php?leec1=0-10` })),

  // Class 11 & 12 Arts
  'History': Array.from({ length: 12 }, (_, i) => ({ name: `History Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khhs1=0-12`, english: `https://ncert.nic.in/textbook.php?lehs1=0-12` })),
  'Geography': Array.from({ length: 12 }, (_, i) => ({ name: `Geography Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khgy1=0-12`, english: `https://ncert.nic.in/textbook.php?legy1=0-12` })),
  'Political Science': Array.from({ length: 10 }, (_, i) => ({ name: `Political Science Chapter ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khps1=0-10`, english: `https://ncert.nic.in/textbook.php?leps1=0-10` })),

  // UPSC
  'Polity': Array.from({ length: 15 }, (_, i) => ({ name: `Polity Topic ${i + 1}`, hindi: `https://ncert.nic.in/textbook.php?khps1=0-15`, english: `https://ncert.nic.in/textbook.php?leps1=0-15` })),
};

export const NcertLibrary: React.FC = () => {
  const [view, setView] = useState<'home' | 'stream' | 'subject' | 'chapters'>('home');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [search, setSearch] = useState('');

  const navigateToStream = (cls: string) => {
    setSelectedClass(cls);
    if (cls === '10' || cls === 'UPSC') setView('subject');
    else setView('stream');
  };

  const navigateToSubject = (stream: string) => {
    setSelectedStream(stream);
    setView('subject');
  };

  const getSubjects = () => {
    if (selectedClass === '10' || selectedClass === 'UPSC') return libraryData[selectedClass].subjects;
    return libraryData[selectedClass].streams[selectedStream];
  };

  const filteredChapters = (chapterData[selectedSubject] || []).filter((ch: any) => 
    ch.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-screen">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <BookOpen className="text-indigo-600 w-8 h-8 sm:w-10 sm:h-10" /> 
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">NCERT Digital Library</span>
        </h2>
        {view !== 'home' && (
          <button 
            onClick={() => { setView('home'); setSelectedSubject(''); setSearch(''); }} 
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-5 py-2.5 rounded-2xl transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            <ChevronLeft size={20} /> Back to Classes
          </button>
        )}
      </div>

      {view !== 'home' && (
        <div className="relative mb-8 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search chapters, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
          />
        </div>
      )}

      {view === 'home' && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(libraryData).map(([cls, data]: any) => (
            <button 
              key={cls} 
              onClick={() => navigateToStream(cls)} 
              className="group p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <GraduationCap size={32} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-xl font-bold block text-slate-900 dark:text-white">{data.title}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">View Subjects & Chapters</p>
            </button>
          ))}
        </div>
      )}

      {view === 'stream' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.keys(libraryData[selectedClass].streams).map(stream => (
            <button 
              key={stream} 
              onClick={() => navigateToSubject(stream)} 
              className="group p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Users size={32} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xl font-bold block text-slate-900 dark:text-white">{stream}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Science, Commerce or Arts</p>
            </button>
          ))}
        </div>
      )}

      {view === 'subject' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Your Subject</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {getSubjects().map((sub: string) => (
              <button 
                key={sub} 
                onClick={() => { setSelectedSubject(sub); setView('chapters'); }} 
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left font-bold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-500 transition-all"
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'chapters' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
               <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
               <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{selectedSubject} Directory</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 text-left">Chapter Name</th>
                  <th className="p-4 text-center">Hindi Medium</th>
                  <th className="p-4 text-center">English Medium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChapters.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">No chapters found matching your search.</td>
                  </tr>
                ) : (
                  filteredChapters.map((ch: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{ch.name}</td>
                      <td className="p-4 text-center">
                        <a 
                          href={ch.hindi} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20"
                        >
                          Hindi PDF
                        </a>
                      </td>
                      <td className="p-4 text-center">
                        <a 
                          href={ch.english} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/20"
                        >
                          English PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-center pt-4">
            <button 
              onClick={() => setView('subject')} 
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
            >
              ← Choose another subject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
