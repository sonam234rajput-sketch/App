export const translations = {
  English: {
    home: "Home",
    chat: "AI Chat",
    quiz: "Quiz",
    mindmap: "Mind Map",
    notes: "Notes",
    answerChecker: "Answer Checker",
    timer: "Timer",
    analytics: "Analytics",
    library: "Library",
    apiKeys: "API Keys",
    help: "Help",
    settings: "Settings",
    about: "About",
    ownerPanel: "Owner Panel",
    youtube: "YouTube Video AI",
    login: "Continue with Google",
    logout: "Sign Out",
    welcome: "Dream Big... Study Smart... Become a Topper!",
    tagline: "India's #1 Free AI Educational Platform",
    designedBy: "Designed by Rishabh Kumar in Bhagalpur, Bihar",
    startChat: "Start AI Chat",
    myLibrary: "My Workspace Library",
    rateUs: "Rate Us"
  },
  Hindi: {
    home: "होम",
    chat: "एआई चैट",
    quiz: "क्विज़",
    mindmap: "माइंड मैप",
    notes: "नोट्स",
    answerChecker: "उत्तर जांचक",
    timer: "टाइमर",
    analytics: "एनालिटिक्स",
    library: "लाइब्रेरी",
    apiKeys: "एपीआई कुंजी",
    help: "सहायता",
    settings: "सेटिंग्स",
    about: "हमारे बारे में",
    ownerPanel: "ओनर पैनल",
    youtube: "यूट्यूब वीडियो AI",
    login: "गूगल के साथ लॉगिन करें",
    logout: "साइन आउट",
    welcome: "बड़े सपने देखें... स्मार्ट तरीके से पढ़ें... टॉपर बनें!",
    tagline: "भारत का नंबर 1 मुफ्त एआई शैक्षिक मंच",
    designedBy: "भागलपुर, बिहार में ऋषभ कुमार द्वारा डिजाइन किया गया",
    startChat: "एआई चैट शुरू करें",
    myLibrary: "मेरी वर्कस्पेस लाइब्रेरी",
    rateUs: "हमें रेट करें"
  },
  Hinglish: {
    home: "Home",
    chat: "AI Chat",
    quiz: "Quiz",
    mindmap: "Mind Map",
    notes: "Notes",
    answerChecker: "Answer Checker",
    timer: "Timer",
    analytics: "Analytics",
    library: "Library",
    apiKeys: "API Keys",
    help: "Help",
    settings: "Settings",
    about: "About",
    ownerPanel: "Owner Panel",
    youtube: "YouTube Video AI",
    login: "Google se Continue karein",
    logout: "Sign Out karein",
    welcome: "Bade Sapne Dekho... Smartly Padho... Topper Bano!",
    tagline: "India ka #1 Free AI Educational Platform",
    designedBy: "Bhagalpur, Bihar mein Rishabh Kumar ne design kiya",
    startChat: "AI Chat Start karein",
    myLibrary: "Meri Workspace Library",
    rateUs: "Hamein Rate Karein"
  }
};

export type LanguageType = 'English' | 'Hindi' | 'Hinglish';
export type TranslationKey = keyof typeof translations.English;

export const t = (key: TranslationKey, lang: LanguageType): string => {
  return translations[lang][key] || translations.English[key];
};
