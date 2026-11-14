import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Dumbbell,
  GraduationCap,
  Home as HomeIcon,
  LibraryBig,
  LockKeyhole,
  Medal,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Sun,
  BarChart3,
  Bot,
  Heart,
  ImagePlus,
  Send,
  MessageSquare,
  Mail,
  KeyRound,
  UserRound,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { doors, questionsForDoor, type Door, type Lesson, type Question } from "@/data/qudratData";
import { lawCards, lawGroups } from "@/data/lawsData";
import { doorZeroQuestions, doorZeroLessons, type DoorZeroQuestion } from "@/data/door0Data";
import { doorOneQuestions, doorOneLessons, type DoorOneQuestion } from "@/data/door1Data";
import { doorTwoQuestions, doorTwoLessons, type DoorTwoQuestion } from "@/data/door2Data";
import { doorThreeQuestions, doorThreeLessons, type DoorThreeQuestion } from "@/data/door3Data";

type View = "home" | "study" | "practice" | "test" | "result" | "stats";
type QuizResult = { score: number; correct: number; unanswered: number; total: number; doorId: number; mode: "practice" | "test"; answers: Record<string, number | undefined>; questions: Question[] };
type QuizRecord = { id: string; doorId: number; mode: "practice" | "test"; total: number; correct: number; unanswered?: number; score: number; at: string };
type Progress = { completedPractice: boolean[]; completedLessons: string[]; quizHistory: QuizRecord[]; favorites: Question[] };

const STORAGE_KEY = "qudrat-progress-v1";
const defaultProgress: Progress = { completedPractice: [false, false, false, false], completedLessons: [], quizHistory: [], favorites: [] };

function loadProgress(storageKey = STORAGE_KEY): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<Progress> | null;
    return {
      completedPractice: Array.from({ length: 4 }, (_, index) => Boolean(saved?.completedPractice?.[index])),
      completedLessons: Array.isArray(saved?.completedLessons) ? saved!.completedLessons : [],
      quizHistory: Array.isArray(saved?.quizHistory) ? saved!.quizHistory as QuizRecord[] : [],
      favorites: Array.isArray(saved?.favorites) ? saved!.favorites as Question[] : [],
    };
  } catch {
    return defaultProgress;
  }
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function arabicNumber(value: number) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function asQuizQuestion(question: DoorZeroQuestion): Question {
  return { id: question.id, lessonId: `door-0-lesson-${question.lessonIndex}`, sourcePage: question.sourcePage, prompt: question.question, options: question.options, answer: question.answer, solution: question.solution };
}

function asDoorOneQuizQuestion(question: DoorOneQuestion): Question {
  return { id: question.id, lessonId: `door-1-lesson-${question.lessonIndex}`, sourcePage: question.sourcePage, prompt: question.question, options: question.options, answer: question.answer, solution: question.solution };
}

function asDoorTwoQuizQuestion(question: DoorTwoQuestion): Question {
  return { id: question.id, lessonId: `door-2-lesson-${question.lessonIndex}`, sourcePage: question.sourcePage, prompt: question.question, options: question.options, answer: question.answer, solution: question.solution };
}

function asDoorThreeQuizQuestion(question: DoorThreeQuestion): Question {
  return { id: question.id, lessonId: `door-3-lesson-${question.lessonIndex}`, sourcePage: question.sourcePage, prompt: question.question, options: question.options, answer: question.answer, solution: question.solution };
}

const ALL_DOORS_ID = -1;

function allQuizQuestions(): Question[] {
  return [
    ...doorZeroQuestions.map(asQuizQuestion),
    ...doorOneQuestions.map(asDoorOneQuizQuestion),
    ...doorTwoQuestions.map(asDoorTwoQuizQuestion),
    ...doorThreeQuestions.map(asDoorThreeQuizQuestion),
  ];
}

function questionDoorId(question: Question) {
  const match = question.id.match(/^d([0-3])-/);
  return match ? Number(match[1]) : 0;
}

function MathText({ text }: { text: string }) {
  const digit = "[0-9٠-٩]";
  const fractionPattern = new RegExp(`(${digit}+(?:[.]${digit}+)?\\s*\\/\\s*${digit}+(?:[.]${digit}+)?)`, "g");
  const fractionOnly = new RegExp(`^(${digit}+(?:[.]${digit}+)?)[ ]*\\/[ ]*(${digit}+(?:[.]${digit}+)?)$`);
  const parts = text.split(fractionPattern);
  return <>{parts.map((part, index) => {
    const match = part.match(fractionOnly);
    if (!match) return <span key={`${part}-${index}`}>{part}</span>;
    return <span className="fraction" key={`${part}-${index}`}><span>{match[1]}</span><span>{match[2]}</span></span>;
  })}</>;
}

function QuestionVisual({ text }: { text: string }) {
  const value = text.toLowerCase();
  if (value.includes("مساحة الشكل المجاور") || (value.includes("١٠ سم") && value.includes("٧ سم"))) return <div className="question-visual"><svg viewBox="0 0 330 190" role="img" aria-label="مربع عشرة في عشرة مع مثلث مقصوص أبعاده ثلاثة وأربعة"><path d="M55 25H275V165H55L125 165L55 95Z" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M55 95L55 165H125Z" fill="var(--gold)" opacity=".28" stroke="var(--gold)" strokeWidth="3" /><path d="M55 25V165M55 165H275" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" /><text x="165" y="17" textAnchor="middle">١٠ سم</text><text x="292" y="98" textAnchor="middle">١٠ سم</text><text x="89" y="183" textAnchor="middle">٣ سم</text><text x="202" y="183" textAnchor="middle">٧ سم</text><text x="38" y="70" textAnchor="end">٦ سم</text><text x="72" y="128" textAnchor="middle" fill="var(--gold)">٤</text></svg><small>المعطيات: ضلعان ١٠ سم، والجزء السفلي ٧ سم؛ ينتج المثلث الصغير ٣ × ٤.</small></div>;
  if (value.includes("متطابق الأضلاع") || value.includes("متساوي الأضلاع")) return <div className="question-visual"><svg viewBox="0 0 300 175" role="img" aria-label="مثلث متطابق الأضلاع بثلاث زوايا متساوية"><path d="M150 22L48 145H252Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><path d="M95 88l12 8M193 96l12-8M139 35l22 0" stroke="var(--gold)" strokeWidth="3" /><text x="150" y="15" textAnchor="middle">٦٠°</text><text x="38" y="150" textAnchor="end">٦٠°</text><text x="262" y="150">٦٠°</text></svg><small>رسم مثلث متطابق الأضلاع مع علامات تساوي الأضلاع وقياس كل زاوية.</small></div>;
  if (value.includes("ضلعان متساويان") || value.includes("متساوي الساقين")) return <div className="question-visual"><svg viewBox="0 0 300 175" role="img" aria-label="مثلث متساوي الساقين بعلامتي تساوي"><path d="M150 20L48 145H252Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><path d="M93 87l13 9M194 96l13-9" stroke="var(--gold)" strokeWidth="3" /><text x="150" y="14" textAnchor="middle">زاوية الرأس</text><text x="39" y="150" textAnchor="end">زاوية القاعدة</text><text x="262" y="150">زاوية القاعدة</text></svg><small>علامتا التساوي على الساقين تعنيان تساوي زاويتي القاعدة.</small></div>;
  if (value.includes("زاوية خارجية") || value.includes("على جانبي الزاوية") || value.includes("خط مستقيم")) return <div className="question-visual"><svg viewBox="0 0 330 175" role="img" aria-label="زاوية على خط مستقيم مع امتداد خارجي"><line x1="30" y1="128" x2="300" y2="128" stroke="currentColor" strokeWidth="3" /><path d="M150 128L95 45M150 128L220 38" stroke="currentColor" strokeWidth="3" /><path d="M118 91A40 40 0 0 1 180 88" fill="none" stroke="var(--gold)" strokeWidth="3" /><path d="M150 128A47 47 0 0 0 220 87" fill="none" stroke="var(--gold)" strokeWidth="3" /><text x="151" y="165" textAnchor="middle">١٨٠° على الخط المستقيم</text><text x="227" y="48">زاوية خارجية</text></svg><small>أُظهر امتداد الخط ومكان الزاوية الخارجية، وتجمع الزوايا على الخط يساوي ١٨٠°.</small></div>;
  if (value.includes("الشكل الرباعي") || value.includes("رباعي")) return <div className="question-visual"><svg viewBox="0 0 300 175" role="img" aria-label="شكل رباعي بزوايا داخلية"><path d="M65 132L78 42L220 30L250 130Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="65" y="148">أ</text><text x="72" y="36">ب</text><text x="224" y="25">ج</text><text x="254" y="146">د</text><text x="150" y="168" textAnchor="middle">مجموع الزوايا = ٣٦٠°</text></svg><small>الرؤوس الأربعة موضحة، ويُستخدم مجموع زوايا الشكل الرباعي ٣٦٠°.</small></div>;
  if (value.includes("نوع المثلث") || (value.includes("٧") && value.includes("٥") && value.includes("٦"))) return <div className="question-visual"><svg viewBox="0 0 300 170" role="img" aria-label="مثلث أضلاعه سبعة وخمسة وستة"><path d="M150 22L45 145H255Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="150" y="15" textAnchor="middle">٥</text><text x="35" y="92" textAnchor="end">٧</text><text x="265" y="92">٦</text></svg><small>المعطيات على الرسم: الأضلاع ٧، ٥، ٦؛ نقارن ٧² مع ٥² + ٦² لتحديد النوع.</small></div>;
  if (value.includes("عدد المربعات") || value.includes("عدد المستطيلات")) return <div className="question-visual"><svg viewBox="0 0 300 150" role="img" aria-label="شبكة ثلاثة أعمدة وأربعة صفوف"><rect x="35" y="20" width="180" height="100" fill="none" stroke="currentColor" strokeWidth="2" />{[1,2].map((n) => <line key={`v${n}`} x1={35+n*60} y1="20" x2={35+n*60} y2="120" stroke="currentColor" />)}{[1,2,3].map((n) => <line key={`h${n}`} x1="35" y1={20+n*25} x2="215" y2={20+n*25} stroke="currentColor" />)}<text x="125" y="143" textAnchor="middle">الأعمدة: ١، ٢، ٣ · الصفوف: ١، ٢، ٣، ٤</text></svg><small>الرسم يعيد بناء الشبكة التي تُحسب منها المربعات أو المستطيلات.</small></div>;
  if (value.includes("نقطة المنتصف") || value.includes("منتصف")) return <div className="question-visual"><svg viewBox="0 0 360 120" role="img" aria-label="قطعة مستقيمة أ م ب ونقطة المنتصف م"><line x1="45" y1="55" x2="315" y2="55" stroke="currentColor" strokeWidth="3" /><circle cx="45" cy="55" r="5" fill="currentColor" /><circle cx="180" cy="55" r="5" fill="var(--gold)" /><circle cx="315" cy="55" r="5" fill="currentColor" /><text x="45" y="35" textAnchor="middle">ب</text><text x="180" y="35" textAnchor="middle">م</text><text x="315" y="35" textAnchor="middle">أ</text><text x="180" y="92" textAnchor="middle">م = (أ + ب) ÷ ٢</text></svg><small>نقطة م هي منتصف القطعة، لذلك تتساوى المسافتان أ م و م ب.</small></div>;
  if (value.includes("القوس") || value.includes("الزاوية المركزية")) return <div className="question-visual"><svg viewBox="0 0 250 180" role="img" aria-label="دائرة وقوس أ ب وزاوية مركزية"><circle cx="125" cy="90" r="62" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M125 90L83 45M125 90L175 48" stroke="var(--gold)" strokeWidth="3" /><path d="M83 45A62 62 0 0 1 175 48" fill="none" stroke="var(--gold)" strokeWidth="5" /><circle cx="125" cy="90" r="4" fill="currentColor" /><text x="77" y="40">أ</text><text x="180" y="43">ب</text><text x="125" y="112" textAnchor="middle">م</text></svg><small>الزاوية المركزية تقابل القوس أ ب، والزاوية المحيطية تقيس نصف القوس المقابل.</small></div>;
  if (!/(شكل|مثلث|مربع|مستطيل|دائرة|زاوية|هندسي|محيط|مساحة|رباعي|خماسي|سداسي|خط مستقيم|قطر|وتر|قوس)/.test(value)) return null;
  const measurements = (text.match(/[٠-٩]+(?:[٫.][٠-٩]+)?/g) ?? []).slice(0, 6);
  const numbers = measurements.join("، ") || "لا توجد قياسات رقمية";
  const shape = value.includes("دائرة") || value.includes("قوس") || value.includes("وتر") ? <><circle cx="135" cy="78" r="55" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M135 78L98 40M135 78L177 43" stroke="var(--gold)" strokeWidth="3" /><circle cx="135" cy="78" r="4" fill="var(--gold)" /></> : value.includes("مثلث") ? <path d="M135 18L45 140H225Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /> : value.includes("مربع") ? <rect x="70" y="22" width="130" height="110" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /> : value.includes("مستطيل") ? <rect x="42" y="40" width="188" height="78" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /> : value.includes("رباعي") ? <path d="M55 115L78 30L218 42L230 120Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /> : value.includes("خماسي") || value.includes("سداسي") ? <polygon points="135,18 220,70 188,140 82,140 50,70" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /> : <><line x1="38" y1="80" x2="230" y2="80" stroke="currentColor" strokeWidth="3" /><path d="M135 80L185 35" stroke="var(--gold)" strokeWidth="3" /></>;
  return <div className="question-visual"><svg viewBox="0 0 270 175" role="img" aria-label="رسم هندسي مبني على معطيات السؤال">{shape}<g className="shape-measurements">{value.includes("مثلث") && <><text x="135" y="16" textAnchor="middle">{measurements[0] ?? "؟"}</text><text x="34" y="88" textAnchor="end">{measurements[1] ?? "؟"}</text><text x="236" y="88">{measurements[2] ?? "؟"}</text></>}{value.includes("مربع") && <><text x="135" y="17" textAnchor="middle">{measurements[0] ?? "؟"}</text><text x="211" y="82">{measurements[1] ?? measurements[0] ?? "؟"}</text></>}{value.includes("مستطيل") && <><text x="135" y="34" textAnchor="middle">{measurements[0] ?? "؟"}</text><text x="237" y="84">{measurements[1] ?? "؟"}</text></>}{(value.includes("دائرة") || value.includes("قوس") || value.includes("وتر")) && <text x="191" y="71">{measurements[0] ?? "؟"}</text>}{!value.includes("مثلث") && !value.includes("مربع") && !value.includes("مستطيل") && !value.includes("دائرة") && !value.includes("قوس") && !value.includes("وتر") && <text x="135" y="72" textAnchor="middle">{numbers}</text>}</g></svg><small>وُضعت المعطيات الرقمية داخل مواضعها على الرسم، مع الحفاظ على نص السؤال كما ورد.</small></div>;
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeStep, setWelcomeStep] = useState<"intro" | "gender">("intro");
  const adminAccess = false;
  const [girlsMode, setGirlsMode] = useState(() => localStorage.getItem("sahlah-gender") === "girls");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("sahlah-theme") === "dark");
  const [view, setView] = useState<View>("home");
  const [favoritesView, setFavoritesView] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [activeDoor, setActiveDoor] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [studyTab, setStudyTab] = useState<"laws" | "questions">("laws");
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [quizMode, setQuizMode] = useState<"practice" | "test">("test");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishQuizRef = useRef<() => void>(() => undefined);
  const [timerSeconds, setTimerSeconds] = useState(50 * 60);
  const accountStorageKey = STORAGE_KEY;
  const unlockedDoors = useMemo(() => adminAccess ? [true, true, true, true] : progress.completedPractice.map((_, index) => index === 0 || progress.completedPractice[index - 1]), [adminAccess, progress.completedPractice]);
  const currentDoor = doors[activeDoor] ?? doors[0];
  const currentLesson = currentDoor.lessons[activeLesson] ?? currentDoor.lessons[0];
  const studyComplete = activeDoor >= 0 && currentDoor.lessons.every((lesson) => progress.completedLessons.includes(lesson.id));
  const totalQuestions = doorZeroQuestions.length + doorOneQuestions.length + doorTwoQuestions.length + doorThreeQuestions.length;
  const learnedQuestions = progress.completedLessons.reduce((count, lessonId) => {
    const lesson = doors.flatMap((door) => door.lessons).find((item) => item.id === lessonId);
    return count + (lesson?.questions.length ?? 0);
  }, 0);

  useEffect(() => {
    localStorage.setItem(accountStorageKey, JSON.stringify(progress));
  }, [accountStorageKey, progress]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("sahlah-theme", darkMode ? "dark" : "light");
    return () => document.body.classList.remove("dark-mode");
  }, [darkMode]);

  useEffect(() => {
    document.body.classList.toggle("girls-mode", girlsMode);
    localStorage.setItem("sahlah-gender", girlsMode ? "girls" : "boys");
    return () => document.body.classList.remove("girls-mode");
  }, [girlsMode]);

  useEffect(() => {
    if (view !== "result" || !result || result.score < 90 || muted) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    playCelebration();
    timerRef.current = window.setInterval(playCelebration, 3000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [view, result, muted]);

  useEffect(() => () => {
    audioRef.current?.close();
  }, []);

  function playCelebration() {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? new AudioContextClass();
      audioRef.current = context;
      const now = context.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.42);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + index * 0.08 + 0.45);
      });
    } catch {
      // Browsers can block audio until a gesture; the mute control remains available.
    }
  }

  function navigate(nextView: View) {
    setFavoritesView(false);
    if (nextView === "study" && activeDoor === ALL_DOORS_ID) setActiveDoor(0);
    if (nextView === "practice") {
      setPracticeQuestions([]);
      setResult(null);
      setAnswers({});
      setQuizIndex(0);
    }
    if (nextView === "test") {
      setTestQuestions([]);
      setResult(null);
      setAnswers({});
      setQuizIndex(0);
    }
    setView(nextView);
    setMobileNav(false);
  }

  function selectDoor(doorId: number, destination: View) {
    if (doorId !== ALL_DOORS_ID && !adminAccess && !unlockedDoors[doorId]) {
      setActiveDoor(0);
      return;
    }
    setActiveDoor(doorId);
    setActiveLesson(0);
    setShowSolution({});
    setResult(null);
    if (destination === "practice") {
      setQuizMode("practice");
      const pool = doorId === ALL_DOORS_ID ? allQuizQuestions() : doorId === 0 ? doorZeroQuestions.map(asQuizQuestion) : doorId === 1 ? doorOneQuestions.map(asDoorOneQuizQuestion) : doorId === 2 ? doorTwoQuestions.map(asDoorTwoQuizQuestion) : doorId === 3 ? doorThreeQuestions.map(asDoorThreeQuizQuestion) : questionsForDoor(doorId);
      setPracticeQuestions(shuffle(pool).slice(0, 20));
      setAnswers({});
      setQuizIndex(0);
    }
    if (destination === "test") {
      setQuizMode("test");
      const pool = doorId === ALL_DOORS_ID ? allQuizQuestions() : doorId === 0 ? doorZeroQuestions.map(asQuizQuestion) : doorId === 1 ? doorOneQuestions.map(asDoorOneQuizQuestion) : doorId === 2 ? doorTwoQuestions.map(asDoorTwoQuizQuestion) : doorId === 3 ? doorThreeQuestions.map(asDoorThreeQuizQuestion) : questionsForDoor(doorId);
      setTestQuestions(shuffle(pool).slice(0, 50));
      setAnswers({});
      setQuizIndex(0);
      setTimerSeconds(50 * 60);
    }
    setView(destination);
  }

  function toggleFavorite(question: Question) {
    setProgress((current) => {
      const exists = current.favorites.some((item) => item.id === question.id);
      return { ...current, favorites: exists ? current.favorites.filter((item) => item.id !== question.id) : [...current.favorites, question] };
    });
  }

  function showFavorites() {
    setFavoritesView(true);
    setMobileNav(false);
    setView("home");
  }

  function markLessonComplete(lesson: Lesson) {
    setProgress((current) => current.completedLessons.includes(lesson.id) ? current : ({ ...current, completedLessons: [...current.completedLessons, lesson.id] }));
  }

  function markDoorZeroLessonComplete(lessonIndex: number) {
    const id = `door-0-pdf-lesson-${lessonIndex}`;
    setProgress((current) => current.completedLessons.includes(id) ? current : ({ ...current, completedLessons: [...current.completedLessons, id] }));
  }

  function markDoorOneLessonComplete(lessonIndex: number) {
    const id = `door-1-pdf-lesson-${lessonIndex}`;
    setProgress((current) => current.completedLessons.includes(id) ? current : ({ ...current, completedLessons: [...current.completedLessons, id] }));
  }

  function markDoorTwoLessonComplete(lessonIndex: number) {
    const id = `door-2-pdf-lesson-${lessonIndex}`;
    setProgress((current) => current.completedLessons.includes(id) ? current : ({ ...current, completedLessons: [...current.completedLessons, id] }));
  }

  function markDoorThreeLessonComplete(lessonIndex: number) {
    const id = `door-3-pdf-lesson-${lessonIndex}`;
    setProgress((current) => current.completedLessons.includes(id) ? current : ({ ...current, completedLessons: [...current.completedLessons, id] }));
  }

  function finishQuiz() {
    const questions = quizMode === "test" ? testQuestions : practiceQuestions;
    const correct = questions.filter((question) => answers[question.id] === question.answer).length;
    const unanswered = questions.filter((question) => answers[question.id] === undefined).length;
    const score = Math.round((correct / questions.length) * 100);
    if (quizMode === "practice" && activeDoor !== ALL_DOORS_ID) {
      setProgress((current) => {
        const completedPractice = [...current.completedPractice];
        completedPractice[activeDoor] = true;
        const quizHistory = [...current.quizHistory, { id: `${Date.now()}-${activeDoor}-${quizMode}`, doorId: activeDoor, mode: quizMode, total: questions.length, correct, unanswered, score, at: new Date().toISOString() }];
        return { ...current, completedPractice, quizHistory };
      });
    } else {
      setProgress((current) => ({ ...current, quizHistory: [...current.quizHistory, { id: `${Date.now()}-${activeDoor}-${quizMode}`, mode: quizMode, doorId: activeDoor, total: questions.length, correct, unanswered, score, at: new Date().toISOString() }] }));
    }
    setResult({ score, correct, unanswered, total: questions.length, doorId: activeDoor, mode: quizMode, answers, questions });
    setView("result");
  }

  finishQuizRef.current = finishQuiz;

  useEffect(() => {
    if (view !== "test" || quizMode !== "test" || testQuestions.length === 0) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        return Math.max(0, seconds - 1);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [view, quizMode, testQuestions.length]);

  useEffect(() => {
    if (view === "test" && quizMode === "test" && testQuestions.length > 0 && timerSeconds === 0) finishQuizRef.current();
  }, [view, quizMode, testQuestions.length, timerSeconds]);

  function formatTimer(seconds: number) {
    return `${arabicNumber(Math.floor(seconds / 60)).padStart(2, "٠")}:${arabicNumber(seconds % 60).padStart(2, "٠")}`;
  }

  const quizQuestions = quizMode === "test" ? testQuestions : practiceQuestions;
  const currentQuizQuestion = quizQuestions[quizIndex];
  const answeredCount = quizQuestions.filter((question) => answers[question.id] !== undefined).length;

  function renderTopBar() {
    return (
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => navigate("home")} aria-label="العودة إلى الصفحة الرئيسية">
            <span className="brand-mark">س</span>
            <span><strong>سهلات</strong><small>يسهل عليك القدرات</small></span>
          </button>
          <nav className={`nav-links ${mobileNav ? "is-open" : ""}`}>
            <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><HomeIcon size={17} /> الرئيسية</button>
            <button className={view === "study" ? "active" : ""} onClick={() => navigate("study")}><BookOpen size={17} /> المذاكرة</button>
            <button className={view === "practice" ? "active" : ""} onClick={() => navigate("practice")}><Dumbbell size={17} /> التدريب</button>
            <button className={view === "test" || view === "result" ? "active" : ""} onClick={() => navigate("test")}><Target size={17} /> الاختبار</button>
            <button className={favoritesView ? "active" : ""} onClick={showFavorites}><Heart size={17} /> المفضلة <span className="favorite-count">{arabicNumber(progress.favorites.length)}</span></button>
            <button className={view === "stats" ? "active" : ""} onClick={() => navigate("stats")}><BarChart3 size={17} /> الإحصائيات</button>
          </nav>
          <button className="mobile-menu" onClick={() => setMobileNav((open) => !open)} aria-label="فتح القائمة"><Menu size={21} /></button>
          <button className="theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "تفعيل المظهر النهاري" : "تفعيل المظهر الليلي"}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}<span>{darkMode ? "نهاري" : "ليلي"}</span></button><div className="options-menu-wrap"><button className="options-trigger" onClick={() => setOptionsOpen((open) => !open)} aria-label="فتح خيارات الموقع" aria-expanded={optionsOpen}><Menu size={19} /></button>{optionsOpen && <div className="options-menu" dir="rtl"><button onClick={() => { setGirlsMode(false); setOptionsOpen(false); }}><span className="options-swatch options-swatch-boys" /> تغيير التصميم لأولاد</button><button onClick={() => { setGirlsMode(true); setOptionsOpen(false); }}><span className="options-swatch options-swatch-girls" /> تغيير التصميم لبنات</button></div>}</div>
        </div>
      </header>
    );
  }

  function renderHome() {
    const percent = Math.round((learnedQuestions / totalQuestions) * 100);
    return (
      <>
        <section className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> جلسة اليوم · ٢٥ دقيقة تكفي</div>
            <h1>حلّها بهدوء،<br /><em>وتقدّم بثقة.</em></h1>
            <p>مساحة مرتبة لمذاكرة القدرات الكمية، تجربة الحل، ثم قياس مستواك بدون زحمة أو تشتيت.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => navigate("study")}><BookOpen size={18} /> ابدأ المذاكرة <ArrowLeft size={17} /></button>
              <button className="button button-quiet" onClick={() => navigate("practice")}><Play size={16} /> جرّب سؤالًا</button>
            </div>
            <div className="hero-meta"><span><CheckCircle2 size={16} /> بدون حساب</span><span><Clock3 size={16} /> تقدّم محفوظ</span><span><ShieldIcon /> صوت بعد النتيجة فقط</span></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="paper-card paper-back"><span>٠٣</span><small>تدريب على النسب</small></div>
            <div className="paper-card paper-main">
              <div className="paper-header"><span className="tiny-label">سؤال اليوم</span><span className="paper-number">٠٧</span></div>
              <div className="paper-line wide" /><div className="paper-line" /><div className="paper-line short" />
              <div className="formula">س + ٧ = ١٢</div>
              <div className="answer-row"><span>أ</span><i /> <span>ب</span><i className="selected" /> <span>ج</span><i /> <span>د</span><i /></div>
              <div className="paper-check"><Check size={15} /> إجابة صحيحة</div>
            </div>
            <div className="floating-sticker"><Trophy size={16} /><span>خطوة موفقة<br /><b>استمر!</b></span></div>
          </div>
        </section>
        <section className="progress-card">
          <div className="progress-heading"><div><span className="section-kicker">مساحتك اليوم</span><h2>أنت تبني عادة قوية</h2></div><span className="progress-percent">{arabicNumber(percent)}٪</span></div>
          <div className="progress-track"><span style={{ width: `${Math.max(percent, 4)}%` }} /></div>
          <div className="progress-foot"><span>راجعت {arabicNumber(learnedQuestions)} من {arabicNumber(totalQuestions)} سؤالًا تجريبيًا</span><button onClick={() => navigate("study")}>تابع من حيث توقفت <ArrowLeft size={15} /></button></div>
        </section>
        <section className="path-section">
          <div className="section-title-row"><div><span className="section-kicker">ثلاث خطوات واضحة</span><h2>اختر مسارك</h2></div><span className="muted-note">كل إجابة تقرّبك أكثر</span></div>
          <div className="path-grid">
            <PathCard icon={<BookOpen />} title="المذاكرة" number="٠١" text="افهم الفكرة، وشاهد الحل عند الحاجة." accent="blue" onClick={() => navigate("study")} />
            <PathCard icon={<Dumbbell />} title="التدريب" number="٠٢" text="جرّب أسئلة الباب بدون ضغط النتيجة." accent="gold" onClick={() => navigate("practice")} />
            <PathCard icon={<Target />} title="الاختبار" number="٠٣" text="٥٠ سؤالًا عشوائيًا ونتيجة واضحة." accent="ink" onClick={() => navigate("test")} />
          </div>
        </section>
        <section className="doors-preview">
          <div className="section-title-row"><div><span className="section-kicker">مكتبة الأسئلة</span><h2>أبوابك الأربعة</h2></div><button className="text-button" onClick={() => navigate("study")}>عرض كل الأبواب <ArrowLeft size={15} /></button></div>
          <div className="door-mini-grid">{doors.map((door) => <DoorMiniCard key={door.id} door={door} locked={!unlockedDoors[door.id]} progress={progress} onClick={() => { if (adminAccess || unlockedDoors[door.id]) { setActiveDoor(door.id); navigate("study"); } }} />)}</div>
        </section>
      </>
    );
  }

  function renderStudy() {
    return (
      <PageShell eyebrow="مسار ٠١ · الفهم أولًا" title="المذاكرة" description="ابدأ بدليل القوانين، ثم انتقل إلى أسئلة الأبواب عندما تكون جاهزًا.">
        <div className="study-tabs-switcher">
          <button className={studyTab === "laws" ? "active" : ""} onClick={() => setStudyTab("laws")}><LibraryBig size={18} /><span><b>دليل القوانين</b><small>ملخص الملف المرفق · ٣٦ صفحة</small></span></button>
          <button className={studyTab === "questions" ? "active" : ""} onClick={() => setStudyTab("questions")}><BookOpen size={18} /><span><b>أسئلة الأبواب</b><small>مذاكرة السؤال ثم إظهار الحل</small></span></button>
        </div>
        {studyTab === "laws" ? <LawsGuide /> : activeDoor >= 0 && activeDoor <= 3 ? <div className="content-layout"><aside className="side-panel"><div className="side-panel-head"><span className="section-kicker">الأبواب</span><span className="tiny-count">{arabicNumber(unlockedDoors.filter(Boolean).length)} / ٤ مفتوح</span></div>{doors.map((door) => <DoorSelector key={door.id} door={door} active={activeDoor === door.id} locked={!unlockedDoors[door.id]} progress={progress} onClick={() => { if (unlockedDoors[door.id]) { setActiveDoor(door.id); setActiveLesson(0); } }} />)}<div className="side-tip"><Sparkles size={16} /><p><b>تبديل سريع</b><br />اختر بابًا من القائمة للتنقل بين أسئلته ودروسه.</p></div></aside><main className="study-main">{activeDoor === 0 ? <DoorZeroStudy progress={progress} onCompleteLesson={markDoorZeroLessonComplete} onStartTraining={() => selectDoor(0, "practice")} onFavorite={toggleFavorite} /> : activeDoor === 1 ? <DoorOneStudy progress={progress} onCompleteLesson={markDoorOneLessonComplete} onStartTraining={() => selectDoor(1, "practice")} onFavorite={toggleFavorite} /> : activeDoor === 2 ? <DoorTwoStudy progress={progress} onCompleteLesson={markDoorTwoLessonComplete} onStartTraining={() => selectDoor(2, "practice")} onFavorite={toggleFavorite} /> : <DoorThreeStudy progress={progress} onCompleteLesson={markDoorThreeLessonComplete} onStartTraining={() => selectDoor(3, "practice")} onFavorite={toggleFavorite} />}</main></div> : <div className="content-layout">
          <aside className="side-panel"><div className="side-panel-head"><span className="section-kicker">الأبواب</span><span className="tiny-count">{arabicNumber(unlockedDoors.filter(Boolean).length)} / ٤ مفتوح</span></div>{doors.map((door) => <DoorSelector key={door.id} door={door} active={activeDoor === door.id} locked={!unlockedDoors[door.id]} progress={progress} onClick={() => { if (unlockedDoors[door.id]) { setActiveDoor(door.id); setActiveLesson(0); } }} />)}<div className="side-tip"><Sparkles size={16} /><p><b>تلميح صغير</b><br />لا تفتح الحل قبل أن تمنح نفسك دقيقة للتفكير.</p></div></aside>
          <main className="study-main"><div className="door-heading"><div><span className="section-kicker">{currentDoor.label}</span><h2>{currentDoor.title}</h2><p>{currentDoor.summary}</p></div><span className="chapter-stamp">{arabicNumber(currentDoor.lessons.length)} دروس</span></div><div className="lesson-tabs">{currentDoor.lessons.map((lesson, index) => { const done = progress.completedLessons.includes(lesson.id); return <button key={lesson.id} className={`${activeLesson === index ? "selected" : ""} ${done ? "done" : ""}`} onClick={() => setActiveLesson(index)}><span>{arabicNumber(index + 1)}</span><b>{lesson.title}</b>{done && <Check size={14} />}</button>; })}</div><div className="lesson-intro"><div><span className="lesson-label">الدرس {arabicNumber(activeLesson + 1)}</span><h3>{currentLesson.title}</h3><p>{currentLesson.subtitle}</p></div><button className={`button ${progress.completedLessons.includes(currentLesson.id) ? "button-complete" : "button-primary"}`} onClick={() => markLessonComplete(currentLesson)}>{progress.completedLessons.includes(currentLesson.id) ? <><Check size={16} /> تمّت المراجعة</> : <>علّمت الدرس كمكتمل <CheckCircle2 size={16} /></>}</button></div><div className="question-stack">{currentLesson.questions.map((question, index) => <StudyQuestion key={question.id} question={question} number={index + 1} open={Boolean(showSolution[question.id])} favorite={progress.favorites.some((item) => item.id === question.id)} onFavorite={() => toggleFavorite(question)} onToggle={() => setShowSolution((current) => ({ ...current, [question.id]: !current[question.id] }))} />)}</div>{studyComplete && <div className="unlock-banner"><div className="unlock-icon"><Dumbbell size={21} /></div><div><b>أتممت مذاكرة هذا الباب</b><p>جرّب تدريبًا قصيرًا لتفتح الباب التالي.</p></div><button className="button button-primary" onClick={() => selectDoor(activeDoor, "practice")}>ابدأ التدريب <ArrowLeft size={16} /></button></div>}</main>
        </div>}
      </PageShell>
    );
  }

  function renderPractice() {
    if (practiceQuestions.length > 0 && currentQuizQuestion) return renderQuiz(true);
    return <PageShell eyebrow="مسار ٠٢ · جرّب بنفسك" title="التدريب" description="اختر بابًا واحدًا أو تدرب تدريبًا شاملًا من كل الأبواب في جلسة واحدة."><div className="practice-note"><div className="note-icon"><Dumbbell size={22} /></div><div><b>كيف يعمل التدريب؟</b><p>سنختار لك ٢٠ سؤالًا عشوائيًا من الباب أو من بنك الأسئلة الشامل. بعد إنهائها تظهر نتيجتك من ١٠٠٪ مع تحليل أداء كل باب.</p></div></div><div className="door-grid"><ComprehensiveActionCard mode="practice" onClick={() => selectDoor(ALL_DOORS_ID, "practice")} />{doors.map((door) => <DoorActionCard key={door.id} door={door} locked={!unlockedDoors[door.id]} completed={progress.completedPractice[door.id]} actionLabel="ابدأ التدريب" onClick={() => selectDoor(door.id, "practice")} />)}</div></PageShell>;
  }

  function renderTest() {
    if (testQuestions.length > 0 && currentQuizQuestion) return renderQuiz(false);
    return <PageShell eyebrow="مسار ٠٣ · قِس مستواك" title="الاختبار" description="اختر اختبار باب محدد أو اختبارًا شاملًا من ٥٠ سؤالًا عشوائيًا من كل الأبواب."><div className="test-intro"><div className="test-intro-copy"><span className="test-badge"><Target size={16} /> اختبار متجدد</span><h3>جاهز لقياس تقدّمك؟</h3><p>الأسئلة تتغير في كل مرة، والنتيجة تظهر فور إنهاء الاختبار. لا يوجد صوت أثناء الحل.</p><div className="test-facts"><span><CircleHelp size={16} /> ٥٠ سؤالًا</span><span><Clock3 size={16} /> ٥٠ دقيقة</span><span><Medal size={16} /> نتيجة من ١٠٠</span></div></div><div className="test-illustration"><div className="ring ring-one" /><div className="ring ring-two" /><Target size={72} strokeWidth={1.2} /></div></div><div className="door-grid test-door-grid"><ComprehensiveActionCard mode="test" onClick={() => selectDoor(ALL_DOORS_ID, "test")} />{doors.map((door) => <DoorActionCard key={door.id} door={door} locked={!unlockedDoors[door.id]} completed={false} actionLabel="ابدأ الاختبار" onClick={() => selectDoor(door.id, "test")} />)}</div></PageShell>;
  }

  function renderQuiz(isPractice: boolean) {
    if (!currentQuizQuestion) return null;
    const total = quizQuestions.length;
    const selected = answers[currentQuizQuestion.id];
    const comprehensive = activeDoor === ALL_DOORS_ID;
    return <PageShell eyebrow={comprehensive ? (isPractice ? "تدريب شامل" : "اختبار شامل") : isPractice ? `تدريب الباب ${arabicNumber(activeDoor)}` : `اختبار الباب ${arabicNumber(activeDoor)}`} title={isPractice ? "تدريب سريع" : "اختبارك الآن"} description={isPractice ? "لا تستعجل. فكّر ثم اختر، وبعدها انتقل للسؤال التالي." : "أمامك ٥٠ دقيقة. ركّز على السؤال الذي أمامك فقط."}><div className="quiz-topline"><button className="back-link" onClick={() => { if (isPractice) setPracticeQuestions([]); else setTestQuestions([]); }}><ArrowRight size={16} /> العودة لاختيار النوع</button><span>{arabicNumber(answeredCount)} من {arabicNumber(total)} تمت الإجابة</span>{!isPractice && <span className={`quiz-timer ${timerSeconds < 300 ? "urgent" : ""}`}><Clock3 size={15} /> {formatTimer(timerSeconds)}</span>}</div><div className="quiz-progress"><span style={{ width: `${((quizIndex + 1) / total) * 100}%` }} /></div><div className="quiz-card"><div className="quiz-card-head"><span className="question-counter">السؤال {arabicNumber(quizIndex + 1)} <i>من {arabicNumber(total)}</i></span><span className="source-tag">{comprehensive ? "من كل الأبواب" : isPractice ? "تدريب كمي" : "اختبار كمي"}</span><button className={`heart-button quiz-heart ${progress.favorites.some((item) => item.id === currentQuizQuestion.id) ? "is-favorite" : ""}`} onClick={() => toggleFavorite(currentQuizQuestion)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === currentQuizQuestion.id) ? "currentColor" : "none"} /></button></div><h2><MathText text={currentQuizQuestion.prompt} /></h2><QuestionVisual text={currentQuizQuestion.prompt} /><div className="quiz-options">{currentQuizQuestion.options.map((option, index) => <button key={`${currentQuizQuestion.id}-option-${index}`} className={selected === index ? "chosen" : ""} onClick={() => setAnswers((current) => ({ ...current, [currentQuizQuestion.id]: index }))}><span className="option-letter">{["أ", "ب", "ج", "د"][index]}</span><span>{option}</span>{selected === index && <CheckCircle2 size={19} />}</button>)}</div><div className="quiz-actions"><button className="button button-quiet" onClick={() => setQuizIndex((index) => Math.max(0, index - 1))} disabled={quizIndex === 0}><ArrowRight size={16} /> السابق</button>{quizIndex < total - 1 ? <button className="button button-primary" onClick={() => setQuizIndex((index) => index + 1)}>السؤال التالي <ArrowLeft size={16} /></button> : <button className="button button-gold" onClick={finishQuiz}>{isPractice ? "إنهاء التدريب" : "إنهاء الاختبار"} <Check size={17} /></button>}</div></div></PageShell>;
  }

  function renderResult() {
    if (!result) return null;
    const passed = result.score >= 90;
    const isPractice = result.mode === "practice";
    return <PageShell eyebrow={result.doorId === ALL_DOORS_ID ? (isPractice ? "تدريب شامل" : "اختبار شامل") : "النتيجة ظهرت"} title={isPractice ? "خلصت التدريب" : "خلصت الاختبار"} description="راجع نتيجتك من ١٠٠٪، وشاهد أين أصبت وأين تحتاج إلى مراجعة."><div className={`result-card ${passed ? "is-excellent" : ""}`}><div className="result-score"><span className="result-label">درجتك</span><strong>{arabicNumber(result.score)}<small>٪</small></strong><span className="result-status">{passed ? "نتيجة ممتازة" : result.score >= 60 ? "بداية طيبة" : "كل محاولة تعلّم"}</span></div><div className="result-message"><div className="result-icon">{passed ? <Trophy size={25} /> : <Target size={25} />}</div><h3>{passed ? "مستوى جميل جدًا" : "استمر، أنت تتحسن"}</h3><p>{passed ? "تركيزك واضح. خذ لحظة للاحتفال ثم عد لسؤال لم يثبت بعد." : "ارجع إلى المذاكرة، افتح الحلول التي تحتاجها، ثم أعد المحاولة وقتما تحب."}</p>{passed && <button className="sound-toggle" onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{muted ? "تشغيل صوت التشجيع" : "كتم صوت التشجيع"}</button>}</div></div><div className="result-stats"><div><b>{arabicNumber(result.correct)}</b><span>إجابات صحيحة</span></div><div><b>{arabicNumber(result.total - result.correct - result.unanswered)}</b><span>إجابات خاطئة</span></div><div><b>{arabicNumber(result.unanswered)}</b><span>غير مجاب</span></div><div><b>{arabicNumber(result.total)}</b><span>إجمالي الأسئلة</span></div></div><ResultDoorAnalysis result={result} /><div className="result-actions"><button className="button button-primary" onClick={() => selectDoor(result.doorId, result.mode)}><RotateCcw size={17} /> {isPractice ? "إعادة التدريب" : "إعادة الاختبار"}</button><button className="button button-quiet" onClick={() => navigate("study")}><BookOpen size={17} /> العودة للمذاكرة</button><button className="text-button" onClick={() => navigate("home")}>الرئيسية <ArrowLeft size={15} /></button></div><div className="answer-review"><h3>مراجعة سريعة</h3>{result.questions.map((question, index) => <div key={question.id} className={result.answers[question.id] === undefined ? "review-row unanswered" : result.answers[question.id] === question.answer ? "review-row right" : "review-row wrong"}><span>{result.answers[question.id] === question.answer ? <Check size={15} /> : <X size={15} />}</span><div className="review-copy"><p><b>{arabicNumber(index + 1)}.</b> <MathText text={question.prompt} /><small>{result.answers[question.id] === undefined ? "لم تتم الإجابة" : result.answers[question.id] === question.answer ? "إجابة صحيحة" : `الإجابة الصحيحة: ${question.options[question.answer]}`}</small></p><QuestionVisual text={question.prompt} /></div><button className={`heart-button ${progress.favorites.some((item) => item.id === question.id) ? "is-favorite" : ""}`} onClick={() => toggleFavorite(question)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === question.id) ? "currentColor" : "none"} /></button></div>)}</div></PageShell>;
  }

  if (showWelcome) {
    return welcomeStep === "intro" ? <WelcomeScreen onEnter={() => setWelcomeStep("gender")} /> : <GenderScreen onChoose={(isGirls) => { setGirlsMode(isGirls); setShowWelcome(false); }} />;
  }
  return <div className="app-shell">{renderTopBar()}<main className="page-container">{favoritesView ? <FavoritesPage favorites={progress.favorites} onToggle={toggleFavorite} /> : <>{view === "home" && renderHome()}{view === "study" && renderStudy()}{view === "practice" && renderPractice()}{view === "test" && renderTest()}{view === "result" && renderResult()}{view === "stats" && <StatisticsPage progress={progress} />}</>}</main><footer className="footer"><span>سهلات · يسهل عليك القدرات</span><span>صُمّم ليكون هادئًا وواضحًا</span></footer></div>;
}

function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  return <main className="welcome-screen"><div className="welcome-glow welcome-glow-one" /><div className="welcome-glow welcome-glow-two" /><section className="welcome-card"><div className="welcome-logo-frame"><img src="/assets/taqdar-logo.jpg" alt="شعار سهلات" /></div><span className="welcome-overline">سهلات · يسهل عليك القدرات</span><h1>طريقك إلى <em>المئوية</em></h1><p className="welcome-dedication">مبرمج خصيصًا لـ <strong>د/ عماد الجزيري</strong></p><p className="welcome-credit">بكل حب، من إعداد <strong>مؤمن سعد</strong></p><button className="welcome-button" onClick={onEnter}>يلا بينا نجيب مئوية <ArrowLeft size={19} /></button></section><div className="welcome-footer-note">ذاكر بهدوء · تدرب بذكاء · اختبر ثقتك</div></main>;
}

function GenderScreen({ onChoose }: { onChoose: (girls: boolean) => void }) {
  return <main className="gender-screen"><div className="gender-card"><span className="welcome-overline">اختار طريقك</span><h1>جاهز نبدأ؟</h1><p>اختار التصميم المناسب لك ونبدأ رحلة المئوية.</p><div className="gender-options"><button className="gender-option girls-option" onClick={() => onChoose(true)}><span className="bow" aria-hidden="true"><i /><i /><b /></span><strong>بنات</strong><small>ستايل وردي بفيونكات</small></button><button className="gender-option boys-option" onClick={() => onChoose(false)}><span className="gender-badge">س</span><strong>أولاد</strong><small>التصميم الأساسي</small></button></div></div></main>;
}

function FavoritesPage({ favorites, onToggle }: { favorites: Question[]; onToggle: (question: Question) => void }) {
  return <PageShell eyebrow="مكتبتك الخاصة" title="المفضلة" description="كل سؤال عجبك محفوظ هنا لتراجعه وقتما تحب.">{favorites.length === 0 ? <div className="empty-favorites"><Heart size={32} /><h3>لسه مفيش أسئلة مفضلة</h3><p>اضغط على القلب بجانب أي سؤال في المذاكرة أو النتيجة لإضافته هنا.</p></div> : <div className="favorite-list">{favorites.map((question, index) => <article className="favorite-card" key={question.id}><div className="favorite-card-top"><span>سؤال مفضل {arabicNumber(index + 1)}</span><button className="heart-button is-favorite" onClick={() => onToggle(question)} aria-label="إزالة من المفضلة"><Heart size={17} fill="currentColor" /></button></div><h3><MathText text={question.prompt} /></h3><QuestionVisual text={question.prompt} /><div className="favorite-options">{question.options.map((option, optionIndex) => <span key={`${question.id}-favorite-option-${optionIndex}`}><b>{["أ", "ب", "ج", "د"][optionIndex]}</b><MathText text={option} /></span>)}</div><div className="favorite-solution"><strong>الحل المكتوب</strong><p><MathText text={question.solution} /></p></div></article>)}</div>}</PageShell>;
}

function StatisticsPage({ progress }: { progress: Progress }) {
  const total = progress.quizHistory.reduce((sum, item) => sum + item.total, 0);
  const correct = progress.quizHistory.reduce((sum, item) => sum + item.correct, 0);
  const unanswered = progress.quizHistory.reduce((sum, item) => sum + (item.unanswered ?? 0), 0);
  const wrong = total - correct - unanswered;
  const overall = total ? Math.round((correct / total) * 100) : 0;
  const comprehensiveHistory = progress.quizHistory.filter((item) => item.doorId === ALL_DOORS_ID).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const firstComprehensive = comprehensiveHistory[0];
  const latestComprehensive = comprehensiveHistory[comprehensiveHistory.length - 1];
  const progressDelta = firstComprehensive && latestComprehensive ? latestComprehensive.score - firstComprehensive.score : 0;
  const byDoor = doors.map((door) => {
    const rows = progress.quizHistory.filter((item) => item.doorId === door.id);
    const practiceRows = rows.filter((item) => item.mode === "practice");
    const testRows = rows.filter((item) => item.mode === "test");
    const asked = rows.reduce((sum, item) => sum + item.total, 0);
    const right = rows.reduce((sum, item) => sum + item.correct, 0);
    const unanswered = rows.reduce((sum, item) => sum + (item.unanswered ?? 0), 0);
    const average = rows.length ? Math.round(rows.reduce((sum, item) => sum + item.score, 0) / rows.length) : 0;
    return { door, attempts: rows.length, practiceAttempts: practiceRows.length, testAttempts: testRows.length, asked, right, unanswered, wrong: asked - right - unanswered, score: asked ? Math.round((right / asked) * 100) : 0, average };
  });
  return <PageShell eyebrow="لوحة المتابعة" title="إحصائياتك" description="ملخص شامل لتقدمك في المذاكرة والتدريب والاختبارات، مع تحليل مستقل لكل باب.">
    <div className="stats-hero"><div><span className="section-kicker">النتيجة الكاملة</span><strong>{arabicNumber(overall)}٪</strong><p>من إجمالي كل الإجابات المسجلة</p></div><div className="stats-hero-icon"><BarChart3 size={38} /></div></div>
    <div className="stats-summary"><div><b>{arabicNumber(total)}</b><span>إجمالي الأسئلة</span></div><div><b>{arabicNumber(correct)}</b><span>إجابات صحيحة</span></div><div><b>{arabicNumber(wrong)}</b><span>إجابات خاطئة</span></div><div><b>{arabicNumber(unanswered)}</b><span>غير مجاب</span></div></div>
    <section className="history-panel"><div className="history-heading"><div><span className="section-kicker">سجل التطور</span><h2>محاولاتك الشاملة</h2><p>كل نتيجة شاملة محفوظة في حسابك لتعرف هل مستواك يتحسن مع الوقت.</p></div><div className="history-count"><b>{arabicNumber(comprehensiveHistory.length)}</b><span>محاولات</span></div></div>{comprehensiveHistory.length === 0 ? <div className="history-empty">ابدأ تدريبًا شاملًا أو اختبارًا شاملًا، وستظهر نتائجك هنا بالترتيب الزمني.</div> : <><div className="history-summary"><div><span>آخر نتيجة</span><b>{arabicNumber(latestComprehensive.score)}٪</b></div><div><span>أول نتيجة</span><b>{arabicNumber(firstComprehensive.score)}٪</b></div><div><span>التغير</span><b className={progressDelta >= 0 ? "positive" : "negative"}>{progressDelta > 0 ? "+" : ""}{arabicNumber(progressDelta)}٪</b></div></div><div className="history-list">{[...comprehensiveHistory].reverse().map((item) => <article className="history-row" key={item.id}><span className={`history-mode ${item.mode === "practice" ? "practice" : "test"}`}>{item.mode === "practice" ? "تدريب شامل" : "اختبار شامل"}</span><div className="history-row-main"><strong>{arabicNumber(item.score)}٪</strong><span>{arabicNumber(item.correct)} صحيح · {arabicNumber(item.total - item.correct - (item.unanswered ?? 0))} خاطئ · {arabicNumber(item.unanswered ?? 0)} غير مجاب</span></div><time>{formatArabicDate(item.at)}</time></article>)}</div></>}</section>
    <div className="section-title-row stats-title"><div><span className="section-kicker">تحليل الأبواب</span><h2>كل باب على حدة</h2></div><span className="muted-note">تتحدث تلقائيًا بعد كل محاولة</span></div>
    <div className="stats-door-grid">{byDoor.map(({ door, attempts, practiceAttempts, testAttempts, asked, right, wrong: misses, unanswered: skipped, score, average }) => <article className="stats-door-card" key={door.id}><div className="stats-door-top"><span className="door-number">{arabicNumber(door.id)}</span><div><b>الباب {arabicNumber(door.id)}</b><small>{attempts ? `${arabicNumber(attempts)} محاولات · متوسط ${arabicNumber(average)}٪` : "لم تبدأ بعد"}</small></div><strong>{arabicNumber(score)}٪</strong></div><div className="stats-bar"><span style={{ width: `${score}%` }} /></div><div className="stats-door-breakdown"><span>تدريب <b>{arabicNumber(practiceAttempts)}</b></span><span>اختبار <b>{arabicNumber(testAttempts)}</b></span><span>أسئلة <b>{arabicNumber(asked)}</b></span><span>صحيح <b>{arabicNumber(right)}</b></span><span>خاطئ <b>{arabicNumber(misses)}</b></span><span>غير مجاب <b>{arabicNumber(skipped)}</b></span></div></article>)}</div>
  </PageShell>;
}

function formatArabicDate(value: string) {
  try { return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "تاريخ المحاولة"; }
}

function ResultDoorAnalysis({ result }: { result: QuizResult }) {
  const rows = doors.map((door) => {
    const questions = result.questions.filter((question) => questionDoorId(question) === door.id);
    const correct = questions.filter((question) => result.answers[question.id] === question.answer).length;
    const unanswered = questions.filter((question) => result.answers[question.id] === undefined).length;
    const wrong = questions.length - correct - unanswered;
    return { door, total: questions.length, correct, wrong, unanswered, score: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
  });
  const attempted = rows.filter((row) => row.total > 0);
  const strongest = attempted.reduce((best, row) => row.score > best.score ? row : best, attempted[0]);
  const weakest = attempted.reduce((worst, row) => row.score < worst.score ? row : worst, attempted[0]);
  return <section className="result-door-analysis"><div className="analysis-heading"><div><span className="section-kicker">قراءة أدق للنتيجة</span><h3>أداؤك في كل باب</h3></div><span>الصحيح والخطأ محسوبان من أسئلة هذه المحاولة</span></div>{attempted.length > 1 && <div className="analysis-highlights"><div><span>أقوى باب</span><b>الباب {arabicNumber(strongest.door.id)} · {arabicNumber(strongest.score)}٪</b><small>أحسنت، حافظ على مستواك هنا.</small></div><div><span>يحتاج مراجعة</span><b>الباب {arabicNumber(weakest.door.id)} · {arabicNumber(weakest.score)}٪</b><small>ابدأ بمراجعة دروس هذا الباب.</small></div></div>}<div className="result-door-list">{rows.map((row) => <div className={`result-door-row ${row.total === 0 ? "empty" : ""}`} key={row.door.id}><div className="result-door-title"><strong>الباب {arabicNumber(row.door.id)}</strong><span>{row.total ? `${arabicNumber(row.score)}٪` : "غير موجود في هذه المحاولة"}</span></div><div className="result-door-bar"><span style={{ width: `${row.score}%` }} /></div>{row.total > 0 && <div className="result-door-numbers"><span>صحيح <b>{arabicNumber(row.correct)}</b></span><span>خاطئ <b>{arabicNumber(row.wrong)}</b></span><span>غير مجاب <b>{arabicNumber(row.unanswered)}</b></span><span>إجمالي <b>{arabicNumber(row.total)}</b></span></div>}</div>)}</div></section>;
}

function ShieldIcon() { return <span className="shield-mini">✓</span>; }

function PageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="page-shell"><div className="page-heading"><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}

function PathCard({ icon, title, number, text, accent, onClick }: { icon: React.ReactNode; title: string; number: string; text: string; accent: string; onClick: () => void }) {
  return <button className={`path-card ${accent}`} onClick={onClick}><div className="path-card-top"><span className="path-icon">{icon}</span><span className="path-number">{number}</span></div><div><h3>{title}</h3><p>{text}</p></div><span className="card-arrow"><ArrowLeft size={17} /></span></button>;
}

function StudyQuestion({ question, number, open, favorite, onFavorite, onToggle }: { question: Question; number: number; open: boolean; favorite: boolean; onFavorite: () => void; onToggle: () => void }) {
  return <article className="study-question"><div className="question-index">{arabicNumber(number)}</div><div className="question-body"><div className="question-top"><span className="question-type">سؤال مذاكرة</span><div className="question-actions"><span className="page-ref">صفحة {arabicNumber(question.sourcePage)}</span><button className={`heart-button ${favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}><Heart size={17} fill={favorite ? "currentColor" : "none"} /></button></div></div><h3><MathText text={question.prompt} /></h3><QuestionVisual text={question.prompt} /><div className="study-options">{question.options.map((option, index) => <span key={`${question.id}-study-option-${index}`}><i>{["أ", "ب", "ج", "د"][index]}</i><MathText text={option} /></span>)}</div>{open && <div className="solution-box"><span><Sparkles size={16} /> الحل المختصر</span><p><MathText text={question.solution} /></p><strong>الإجابة الصحيحة: <MathText text={question.options[question.answer]} /></strong></div>}<button className={`solution-toggle ${open ? "open" : ""}`} onClick={onToggle}>{open ? "إخفاء الحل" : "إظهار الحل"}<ChevronLeft size={16} /></button></div></article>;
}

function DoorSelector({ door, active, locked, progress, onClick }: { door: Door; active: boolean; locked: boolean; progress: Progress; onClick: () => void }) {
  const done = progress.completedLessons.filter((id) => door.lessons.some((lesson) => lesson.id === id)).length;
  return <button className={`door-selector ${active ? "active" : ""} ${locked ? "locked" : ""}`} onClick={onClick}><span className="door-number">{locked ? <LockKeyhole size={15} /> : arabicNumber(door.id)}</span><span className="door-selector-copy"><b>{door.title}</b><small>{locked ? "أكمل تدريب الباب السابق" : `${arabicNumber(done)} من ${arabicNumber(door.lessons.length)} دروس`}</small></span><ChevronLeft size={16} /></button>;
}

function DoorMiniCard({ door, locked, progress, onClick }: { door: Door; locked: boolean; progress: Progress; onClick: () => void }) {
  const done = progress.completedLessons.filter((id) => door.lessons.some((lesson) => lesson.id === id)).length;
  return <button className={`door-mini-card ${locked ? "locked" : ""}`} onClick={onClick}><span className="door-mini-number">{locked ? <LockKeyhole size={18} /> : arabicNumber(door.id)}</span><div><b>{door.title}</b><small>{locked ? "مغلق الآن" : `${arabicNumber(done)} / ${arabicNumber(door.lessons.length)} دروس`}</small></div><ChevronLeft size={16} /></button>;
}

function DoorActionCard({ door, locked, completed, actionLabel, onClick }: { door: Door; locked: boolean; completed: boolean; actionLabel: string; onClick: () => void }) {
  return <article className={`door-action-card ${locked ? "locked" : ""}`}><div className="door-action-top"><span className="door-action-number">{locked ? <LockKeyhole size={20} /> : arabicNumber(door.id)}</span><span className="door-action-status">{completed ? <><CheckCircle2 size={14} /> مكتمل</> : locked ? "مغلق" : `${arabicNumber(door.lessons.length)} دروس`}</span></div><h3>{door.title}</h3><p>{locked ? "أكمل تدريب الباب السابق لفتح هذا الباب." : door.summary}</p><button className={`button ${locked ? "button-disabled" : completed ? "button-complete" : "button-primary"}`} disabled={locked} onClick={onClick}>{locked ? <LockKeyhole size={16} /> : completed ? <Check size={16} /> : <Play size={16} />}{locked ? "مغلق حاليًا" : completed ? "إعادة التدريب" : actionLabel}</button></article>;
}

function ComprehensiveActionCard({ mode, onClick }: { mode: "practice" | "test"; onClick: () => void }) {
  const isPractice = mode === "practice";
  return <article className="door-action-card comprehensive-card"><div className="door-action-top"><span className="door-action-number"><Target size={20} /></span><span className="door-action-status">كل الأبواب</span></div><h3>{isPractice ? "تدريب شامل" : "اختبار شامل"}</h3><p>{isPractice ? "٢٠ سؤالًا عشوائيًا من الأبواب الأربعة مع تحليل أدائك." : "٥٠ سؤالًا عشوائيًا من الأبواب الأربعة خلال ٥٠ دقيقة."}</p><button className="button button-primary" onClick={onClick}><Play size={16} /> {isPractice ? "ابدأ التدريب الشامل" : "ابدأ الاختبار الشامل"}</button></article>;
}

function DoorZeroStudy({ progress, onCompleteLesson, onStartTraining, onFavorite }: { progress: Progress; onCompleteLesson: (lessonIndex: number) => void; onStartTraining: () => void; onFavorite: (question: Question) => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const lesson = doorZeroLessons[lessonIndex];
  const questions = doorZeroQuestions.filter((question) => question.lessonIndex === lessonIndex);
  const question = questions[questionIndex] ?? questions[0];
  const quizQuestion = asQuizQuestion(question);
  const completed = progress.completedLessons.includes(`door-0-pdf-lesson-${lessonIndex}`);
  if (!question) return null;
  return <div className="door-zero-study">
    <div className="door-zero-header"><div><span className="section-kicker">الباب ٠ · أسئلة مستخرجة من الملف</span><h2>تجمّعات البنوك المحسوب</h2><p>تم تحويل السؤال والاختيارات والحل إلى نص قابل للقراءة والبحث. لا يظهر الحل إلا عند الضغط على الزر.</p></div><button className="button button-primary" onClick={onStartTraining}><Dumbbell size={17} /> ابدأ تدريبًا عشوائيًا</button></div>
    <div className="door-zero-lesson-tabs">{doorZeroLessons.map((item, index) => <button key={item.index} className={index === lessonIndex ? "active" : ""} onClick={() => { setLessonIndex(index); setQuestionIndex(0); setShowSolution(false); }}><span>{arabicNumber(index + 1)}</span><b>{item.title.replace(`الدرس ${arabicNumber(index + 1)} · `, "")}</b><small>{arabicNumber(item.count)} سؤال</small></button>)}</div>
    <div className="door-zero-meta"><span>السؤال {arabicNumber(questionIndex + 1)} من {arabicNumber(questions.length)}</span><span>{question.topic} · صفحة المصدر {arabicNumber(question.sourcePage)}</span></div>
    <article className="text-question-card"><div className="text-question-label"><BookOpen size={16} /> السؤال والاختيارات بدون حل<button className={`heart-button ${progress.favorites.some((item) => item.id === quizQuestion.id) ? "is-favorite" : ""}`} onClick={() => onFavorite(quizQuestion)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === quizQuestion.id) ? "currentColor" : "none"} /></button></div><h3><MathText text={question.question} /></h3><QuestionVisual text={question.question} /><div className="text-options">{question.options.map((option, index) => <div key={`${question.id}-${index}`}><span>{["أ", "ب", "ج", "د"][index]}</span><b><MathText text={option} /></b></div>)}</div>{showSolution && <div className="written-solution"><span><Sparkles size={16} /> الحل المكتوب</span><p><MathText text={question.solution} /></p><strong>الإجابة الصحيحة: <MathText text={question.options[question.answer]} /></strong></div>}<button className={`solution-toggle ${showSolution ? "open" : ""}`} onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}<ChevronLeft size={16} /></button></article>
    <div className="door-zero-actions"><div className="pdf-page-nav"><button className="button button-quiet" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((value) => value - 1); setShowSolution(false); }}><ArrowRight size={16} /> السابق</button><button className="button button-quiet" disabled={questionIndex === questions.length - 1} onClick={() => { setQuestionIndex((value) => value + 1); setShowSolution(false); }}>التالي <ArrowLeft size={16} /></button></div><button className={`button ${completed ? "button-complete" : "button-primary"}`} onClick={() => onCompleteLesson(lessonIndex)}>{completed ? <><Check size={16} /> تمت مراجعة الدرس</> : <>علّمت الدرس كمكتمل <CheckCircle2 size={16} /></>}</button></div>
  </div>;
}

function DoorOneStudy({ progress, onCompleteLesson, onStartTraining, onFavorite }: { progress: Progress; onCompleteLesson: (lessonIndex: number) => void; onStartTraining: () => void; onFavorite: (question: Question) => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const questions = doorOneQuestions.filter((question) => question.lessonIndex === lessonIndex);
  const question = questions[questionIndex] ?? questions[0];
  const quizQuestion = asDoorOneQuizQuestion(question);
  const completed = progress.completedLessons.includes(`door-1-pdf-lesson-${lessonIndex}`);
  if (!question) return null;
  return <div className="door-zero-study">
    <div className="door-zero-header"><div><span className="section-kicker">الباب ١ · أسئلة مستخرجة من الملف</span><h2>تجمّعات البنوك المحسوب</h2><p>تم تحويل السؤال والاختيارات والحل إلى نص قابل للقراءة والبحث. لا يظهر الحل إلا عند الضغط على الزر.</p></div><button className="button button-primary" onClick={onStartTraining}><Dumbbell size={17} /> ابدأ تدريبًا عشوائيًا</button></div>
    <div className="door-zero-lesson-tabs">{doorOneLessons.map((item, index) => <button key={item.index} className={index === lessonIndex ? "active" : ""} onClick={() => { setLessonIndex(index); setQuestionIndex(0); setShowSolution(false); }}><span>{arabicNumber(index + 1)}</span><b>{item.title.replace(`الدرس ${arabicNumber(index + 1)} · `, "")}</b><small>{arabicNumber(item.count)} سؤال</small></button>)}</div>
    <div className="door-zero-meta"><span>السؤال {arabicNumber(questionIndex + 1)} من {arabicNumber(questions.length)}</span><span>{question.topic} · صفحة المصدر {arabicNumber(question.sourcePage)}</span></div>
    <article className="text-question-card"><div className="text-question-label"><BookOpen size={16} /> السؤال والاختيارات بدون حل<button className={`heart-button ${progress.favorites.some((item) => item.id === quizQuestion.id) ? "is-favorite" : ""}`} onClick={() => onFavorite(quizQuestion)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === quizQuestion.id) ? "currentColor" : "none"} /></button></div><h3><MathText text={question.question} /></h3><QuestionVisual text={question.question} /><div className="text-options">{question.options.map((option, index) => <div key={`${question.id}-${index}`}><span>{["أ", "ب", "ج", "د"][index]}</span><b><MathText text={option} /></b></div>)}</div>{showSolution && <div className="written-solution"><span><Sparkles size={16} /> الحل المكتوب</span><p><MathText text={question.solution} /></p><strong>الإجابة الصحيحة: <MathText text={question.options[question.answer]} /></strong></div>}<button className={`solution-toggle ${showSolution ? "open" : ""}`} onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}<ChevronLeft size={16} /></button></article>
    <div className="door-zero-actions"><div className="pdf-page-nav"><button className="button button-quiet" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((value) => value - 1); setShowSolution(false); }}><ArrowRight size={16} /> السابق</button><button className="button button-quiet" disabled={questionIndex === questions.length - 1} onClick={() => { setQuestionIndex((value) => value + 1); setShowSolution(false); }}>التالي <ArrowLeft size={16} /></button></div><button className={`button ${completed ? "button-complete" : "button-primary"}`} onClick={() => onCompleteLesson(lessonIndex)}>{completed ? <><Check size={16} /> تمت مراجعة الدرس</> : <>علّمت الدرس كمكتمل <CheckCircle2 size={16} /></>}</button></div>
  </div>;
}


function DoorTwoStudy({ progress, onCompleteLesson, onStartTraining, onFavorite }: { progress: Progress; onCompleteLesson: (lessonIndex: number) => void; onStartTraining: () => void; onFavorite: (question: Question) => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const questions = doorTwoQuestions.filter((question) => question.lessonIndex === lessonIndex);
  const question = questions[questionIndex] ?? questions[0];
  const quizQuestion = asDoorTwoQuizQuestion(question);
  const completed = progress.completedLessons.includes(`door-2-pdf-lesson-${lessonIndex}`);
  if (!question) return null;
  return <div className="door-zero-study">
    <div className="door-zero-header"><div><span className="section-kicker">الباب ٢ · أسئلة مستخرجة من الملف</span><h2>تجمّعات البنوك المحسوب</h2><p>تم تحويل السؤال والاختيارات والحل إلى نص قابل للقراءة والبحث. لا يظهر الحل إلا عند الضغط على الزر.</p></div><button className="button button-primary" onClick={onStartTraining}><Dumbbell size={17} /> ابدأ تدريبًا عشوائيًا</button></div>
    <div className="door-zero-lesson-tabs">{doorTwoLessons.map((item, index) => <button key={item.index} className={index === lessonIndex ? "active" : ""} onClick={() => { setLessonIndex(index); setQuestionIndex(0); setShowSolution(false); }}><span>{arabicNumber(index + 1)}</span><b>{item.title.replace(`الدرس ${arabicNumber(index + 1)} · `, "")}</b><small>{arabicNumber(item.count)} سؤال</small></button>)}</div>
    <div className="door-zero-meta"><span>السؤال {arabicNumber(questionIndex + 1)} من {arabicNumber(questions.length)}</span><span>{question.topic} · صفحة المصدر {arabicNumber(question.sourcePage)}</span></div>
    <article className="text-question-card"><div className="text-question-label"><BookOpen size={16} /> السؤال والاختيارات بدون حل<button className={`heart-button ${progress.favorites.some((item) => item.id === quizQuestion.id) ? "is-favorite" : ""}`} onClick={() => onFavorite(quizQuestion)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === quizQuestion.id) ? "currentColor" : "none"} /></button></div><h3><MathText text={question.question} /></h3><QuestionVisual text={question.question} /><div className="text-options">{question.options.map((option, index) => <div key={`${question.id}-${index}`}><span>{["أ", "ب", "ج", "د"][index]}</span><b><MathText text={option} /></b></div>)}</div>{showSolution && <div className="written-solution"><span><Sparkles size={16} /> الحل المكتوب</span><p><MathText text={question.solution} /></p><strong>الإجابة الصحيحة: <MathText text={question.options[question.answer]} /></strong></div>}<button className={`solution-toggle ${showSolution ? "open" : ""}`} onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}<ChevronLeft size={16} /></button></article>
    <div className="door-zero-actions"><div className="pdf-page-nav"><button className="button button-quiet" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((value) => value - 1); setShowSolution(false); }}><ArrowRight size={16} /> السابق</button><button className="button button-quiet" disabled={questionIndex === questions.length - 1} onClick={() => { setQuestionIndex((value) => value + 1); setShowSolution(false); }}>التالي <ArrowLeft size={16} /></button></div><button className={`button ${completed ? "button-complete" : "button-primary"}`} onClick={() => onCompleteLesson(lessonIndex)}>{completed ? <><Check size={16} /> تمت مراجعة الدرس</> : <>علّمت الدرس كمكتمل <CheckCircle2 size={16} /></>}</button></div>
  </div>;
}


function DoorThreeStudy({ progress, onCompleteLesson, onStartTraining, onFavorite }: { progress: Progress; onCompleteLesson: (lessonIndex: number) => void; onStartTraining: () => void; onFavorite: (question: Question) => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const questions = doorThreeQuestions.filter((question) => question.lessonIndex === lessonIndex);
  const question = questions[questionIndex] ?? questions[0];
  const quizQuestion = asDoorThreeQuizQuestion(question);
  const completed = progress.completedLessons.includes(`door-3-pdf-lesson-${lessonIndex}`);
  if (!question) return null;
  return <div className="door-zero-study">
    <div className="door-zero-header"><div><span className="section-kicker">الباب ٣ · أسئلة مستخرجة من الملف</span><h2>تجمّعات البنوك المحسوب</h2><p>تم تحويل السؤال والاختيارات والحل إلى نص قابل للقراءة والبحث. لا يظهر الحل إلا عند الضغط على الزر.</p></div><button className="button button-primary" onClick={onStartTraining}><Dumbbell size={17} /> ابدأ تدريبًا عشوائيًا</button></div>
    <div className="door-zero-lesson-tabs">{doorThreeLessons.map((item, index) => <button key={item.index} className={index === lessonIndex ? "active" : ""} onClick={() => { setLessonIndex(index); setQuestionIndex(0); setShowSolution(false); }}><span>{arabicNumber(index + 1)}</span><b>{item.title.replace(`الدرس ${arabicNumber(index + 1)} · `, "")}</b><small>{arabicNumber(item.count)} سؤال</small></button>)}</div>
    <div className="door-zero-meta"><span>السؤال {arabicNumber(questionIndex + 1)} من {arabicNumber(questions.length)}</span><span>{question.topic} · صفحة المصدر {arabicNumber(question.sourcePage)}</span></div>
    <article className="text-question-card"><div className="text-question-label"><BookOpen size={16} /> السؤال والاختيارات بدون حل<button className={`heart-button ${progress.favorites.some((item) => item.id === quizQuestion.id) ? "is-favorite" : ""}`} onClick={() => onFavorite(quizQuestion)} aria-label="إضافة أو إزالة من المفضلة"><Heart size={17} fill={progress.favorites.some((item) => item.id === quizQuestion.id) ? "currentColor" : "none"} /></button></div><h3><MathText text={question.question} /></h3><QuestionVisual text={question.question} /><div className="text-options">{question.options.map((option, index) => <div key={`${question.id}-${index}`}><span>{["أ", "ب", "ج", "د"][index]}</span><b><MathText text={option} /></b></div>)}</div>{showSolution && <div className="written-solution"><span><Sparkles size={16} /> الحل المكتوب</span><p><MathText text={question.solution} /></p><strong>الإجابة الصحيحة: <MathText text={question.options[question.answer]} /></strong></div>}<button className={`solution-toggle ${showSolution ? "open" : ""}`} onClick={() => setShowSolution((value) => !value)}>{showSolution ? "إخفاء الحل" : "إظهار الحل"}<ChevronLeft size={16} /></button></article>
    <div className="door-zero-actions"><div className="pdf-page-nav"><button className="button button-quiet" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((value) => value - 1); setShowSolution(false); }}><ArrowRight size={16} /> السابق</button><button className="button button-quiet" disabled={questionIndex === questions.length - 1} onClick={() => { setQuestionIndex((value) => value + 1); setShowSolution(false); }}>التالي <ArrowLeft size={16} /></button></div><button className={`button ${completed ? "button-complete" : "button-primary"}`} onClick={() => onCompleteLesson(lessonIndex)}>{completed ? <><Check size={16} /> تمت مراجعة الدرس</> : <>علّمت الدرس كمكتمل <CheckCircle2 size={16} /></>}</button></div>
  </div>;
}

function LawsGuide() {
  return <div className="laws-guide">
    <div className="laws-banner">
      <div className="laws-banner-copy"><span className="section-kicker">الملف المرفق · ٣٦ صفحة</span><h2>دليل القوانين الكمية</h2><p>هذا هو الملخص الذي تذاكره قبل الدخول إلى بنك الأسئلة. استخدم البطاقات السريعة للمراجعة، أو افتح الملف كاملًا عند الحاجة.</p><a className="button button-gold" href="/manus-storage/quant-laws_30131af2.pdf" target="_blank" rel="noreferrer"><LibraryBig size={17} /> فتح ملف القوانين كاملًا <ArrowLeft size={16} /></a></div>
      <div className="laws-banner-mark"><LibraryBig size={66} strokeWidth={1.15} /><span>قوانين<br /><b>كمي</b></span></div>
    </div>
    <div className="laws-groups">{lawGroups.map((group) => <div key={group.id} className="law-group-pill"><span>{group.icon}</span><div><b>{group.label}</b><small>{group.summary}</small></div></div>)}</div>
    <div className="section-title-row laws-title"><div><span className="section-kicker">مراجعة سريعة</span><h2>أهم القوانين في مكان واحد</h2></div><span className="muted-note">تقدر ترجع للملف الأصلي في أي وقت</span></div>
    <div className="law-card-grid">{lawCards.map((law, index) => <LawCard key={`${law.title}-${index}`} law={law} index={index} />)}</div>
  </div>;
}

function LawCard({ law, index }: { law: { title: string; rule: string; example?: string; group: string }; index: number }) {
  return <article className={`law-card law-${law.group}`}><div className="law-card-top"><span className="law-index">{arabicNumber(index + 1)}</span><span className="law-label">قاعدة</span></div><h3>{law.title}</h3><LawVisual title={law.title} /><p>{law.rule}</p>{law.example && <div className="law-example"><span>مثال</span><b>{law.example}</b></div>}</article>;
}

function LawVisual({ title }: { title: string }) {
  if (title.includes("نوع المثلث")) return <div className="law-visual"><svg viewBox="0 0 250 135" role="img" aria-label="مثلث مختلف الأضلاع أضلاعه خمسة وستة وسبعة"><path d="M125 20L42 112H225Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="125" y="15" textAnchor="middle">٥</text><text x="32" y="70" textAnchor="end">٧</text><text x="232" y="70">٦</text><text x="125" y="130" textAnchor="middle">نقارن مربعات الأضلاع</text></svg><small>كما في الملف: نربع الأضلاع ٥، ٦، ٧ ونقارن مربع الأكبر بمجموع المربعين الآخرين.</small></div>;
  if (title.includes("نظرية فيثاغورس") || title.includes("٤٥°") || title.includes("٣٠°")) return <div className="law-visual"><svg viewBox="0 0 250 135" role="img" aria-label="مثلث قائم مع وتر وضلعين قائمين"><path d="M42 112V28L218 112Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><path d="M42 96H58V112" fill="none" stroke="currentColor" strokeWidth="2" /><text x="42" y="21" textAnchor="middle">قائم</text><text x="28" y="72" textAnchor="end">ضلع قائم</text><text x="130" y="126" textAnchor="middle">ضلع قائم</text><text x="142" y="62" textAnchor="middle" className="shape-measurements">الوتر</text>{title.includes("٤٥°") && <><text x="55" y="47">٤٥°</text><text x="190" y="105">٤٥°</text></>}{title.includes("٣٠°") && <><text x="55" y="47">٣٠°</text><text x="190" y="105">٦٠°</text></>}</svg><small>علامة الزاوية القائمة والوتر موضّحان كما في أمثلة الملف.</small></div>;
  if (title.includes("مجموع زوايا المثلث")) return <div className="law-visual"><svg viewBox="0 0 250 135" role="img" aria-label="مثلث بزواياه الثلاث"><path d="M125 18L38 112H220Z" fill="var(--gold)" opacity=".12" stroke="currentColor" strokeWidth="3" /><path d="M51 104A18 18 0 0 1 62 91M188 91A18 18 0 0 1 199 104M115 32A17 17 0 0 1 136 32" fill="none" stroke="var(--gold)" strokeWidth="2" /><text x="47" y="106">أ</text><text x="203" y="106">ب</text><text x="125" y="29">ج</text><text x="125" y="130" textAnchor="middle">أ + ب + ج = ١٨٠°</text></svg><small>مواضع الزوايا الثلاث ومجموعها ١٨٠°.</small></div>;
  if (title.includes("القطعة المتوسطة") || title.includes("التوازي") || title.includes("الأجزاء المتناسبة")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="مثلث بداخله قطعة موازية للقاعدة"><path d="M125 18L35 118H220Z" fill="var(--gold)" opacity=".1" stroke="currentColor" strokeWidth="3" /><line x1="78" y1="70" x2="172" y2="70" stroke="var(--gold)" strokeWidth="3" /><path d="M92 65l8 10M150 65l8 10M105 112l8 10M138 112l8 10" stroke="currentColor" strokeWidth="2" /><path d="M101 70l8 -4v8zM149 70l-8 -4v8zM78 118l8 -4v8zM172 118l-8 -4v8z" fill="var(--gold)" /><text x="125" y="15" textAnchor="middle">أ</text><text x="65" y="68" textAnchor="end">ص</text><text x="185" y="68">س</text><text x="125" y="135" textAnchor="middle">القطعة الداخلية ∥ القاعدة</text></svg><small>أعدت رسم القطعة الموازية وعلامات التساوي الموجودة في صفحات الملف.</small></div>;
  if (title.includes("مساحة المثلث")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="مثلث مع قاعدة وارتفاع عمودي"><path d="M125 18L35 116H220Z" fill="var(--gold)" opacity=".12" stroke="currentColor" strokeWidth="3" /><line x1="125" y1="18" x2="125" y2="116" stroke="var(--gold)" strokeWidth="2" strokeDasharray="5 4" /><path d="M125 101h15v15" fill="none" stroke="currentColor" strokeWidth="2" /><text x="125" y="134" textAnchor="middle">القاعدة</text><text x="132" y="68">الارتفاع</text></svg><small>الارتفاع عمودي على القاعدة: مساحة المثلث = القاعدة × الارتفاع ÷ ٢.</small></div>;
  if (title.includes("مساحة المعين")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="معين بقطرين متعامدين"><path d="M125 15L220 70L125 125L30 70Z" fill="var(--gold)" opacity=".14" stroke="currentColor" strokeWidth="3" /><line x1="30" y1="70" x2="220" y2="70" stroke="var(--gold)" strokeWidth="2" /><line x1="125" y1="15" x2="125" y2="125" stroke="var(--gold)" strokeWidth="2" /><path d="M125 62h8v8" fill="none" stroke="currentColor" strokeWidth="2" /><text x="125" y="137" textAnchor="middle">القطران متعامدان</text></svg><small>قطرا المعين متعامدان وينصف كل منهما الآخر.</small></div>;
  if (title.includes("مساحة شبه المنحرف")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="شبه منحرف بقاعدتين وارتفاع"><path d="M70 25H185L225 115H30Z" fill="var(--gold)" opacity=".14" stroke="currentColor" strokeWidth="3" /><line x1="70" y1="25" x2="70" y2="115" stroke="var(--gold)" strokeWidth="2" strokeDasharray="5 4" /><path d="M70 25v15h15M70 115h15" fill="none" stroke="currentColor" strokeWidth="2" /><text x="128" y="18" textAnchor="middle">القاعدة ١</text><text x="128" y="133" textAnchor="middle">القاعدة ٢</text><text x="77" y="75">الارتفاع</text></svg><small>القاعدتان متوازيتان والارتفاع عمودي عليهما.</small></div>;
  if (title.includes("مساحة المربع")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="مربع وقطره"><rect x="58" y="15" width="125" height="105" fill="var(--gold)" opacity=".12" stroke="currentColor" strokeWidth="3" /><line x1="58" y1="15" x2="183" y2="120" stroke="var(--gold)" strokeWidth="2" /><text x="120" y="133" textAnchor="middle">الضلع</text><text x="125" y="62" textAnchor="middle">القطر</text></svg><small>مساحة المربع = طول الضلع² = القطر² ÷ ٢.</small></div>;
  if (title.includes("مساحة المستطيل")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="مستطيل بالطول والعرض والقطرين"><rect x="35" y="30" width="185" height="75" fill="var(--gold)" opacity=".12" stroke="currentColor" strokeWidth="3" /><line x1="35" y1="30" x2="220" y2="105" stroke="var(--gold)" strokeWidth="2" /><line x1="220" y1="30" x2="35" y2="105" stroke="var(--gold)" strokeWidth="2" /><text x="127" y="22" textAnchor="middle">الطول</text><text x="228" y="72">العرض</text></svg><small>قطرا المستطيل متساويان وينصف كل منهما الآخر.</small></div>;
  if (title.includes("الأشكال داخل الدائرة")) return <div className="law-visual"><svg viewBox="0 0 250 140" role="img" aria-label="مربع وسداسي منتظم داخل دائرة"><circle cx="125" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="83" y="28" width="84" height="84" fill="var(--gold)" opacity=".1" stroke="var(--gold)" strokeWidth="2" /><polygon points="125,15 175,42 175,98 125,125 75,98 75,42" fill="none" stroke="currentColor" strokeWidth="2" /></svg><small>قطر المربع داخل الدائرة يساوي قطرها، وضلع السداسي يساوي نصف القطر.</small></div>;
  if (title.includes("عدد المربعات") || title.includes("عدد المستطيلات")) return <div className="law-visual"><svg viewBox="0 0 250 130" role="img" aria-label="شبكة ثلاثة أعمدة وأربعة صفوف"><rect x="35" y="10" width="180" height="96" fill="none" stroke="currentColor" strokeWidth="2" />{[1,2].map((n) => <line key={`lv${n}`} x1={35+n*60} y1="10" x2={35+n*60} y2="106" stroke="currentColor" />)}{[1,2,3].map((n) => <line key={`lh${n}`} x1="35" y1={10+n*24} x2="215" y2={10+n*24} stroke="currentColor" />)}<text x="125" y="123" textAnchor="middle">أعمدة ١،٢،٣ · صفوف ١،٢،٣،٤</text></svg><small>نرقّم أفقيًا ورأسيًا ثم نجمع التركيبات.</small></div>;
  if (title.includes("القوس") || title.includes("الزاوية المركزية")) return <div className="law-visual"><svg viewBox="0 0 250 135" role="img" aria-label="دائرة وقوس أ ب وزاوية مركزية"><circle cx="125" cy="68" r="48" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M125 68L91 34M125 68L163 35" stroke="var(--gold)" strokeWidth="3" /><path d="M91 34A48 48 0 0 1 163 35" fill="none" stroke="var(--gold)" strokeWidth="4" /><circle cx="125" cy="68" r="3" fill="currentColor" /><text x="84" y="30">أ</text><text x="168" y="31">ب</text><text x="125" y="88" textAnchor="middle">م</text></svg><small>قوس أ ب يقابله قياس الزاوية المركزية عند م.</small></div>;
  if (title.includes("نقطة المنتصف") || title.includes("مسافة نقطتين")) return <div className="law-visual"><svg viewBox="0 0 280 100" role="img" aria-label="قطعة مستقيمة أ م ب"><line x1="35" y1="45" x2="245" y2="45" stroke="currentColor" strokeWidth="3" /><circle cx="35" cy="45" r="4" /><circle cx="140" cy="45" r="4" fill="var(--gold)" /><circle cx="245" cy="45" r="4" /><text x="35" y="28" textAnchor="middle">ب</text><text x="140" y="28" textAnchor="middle">م</text><text x="245" y="28" textAnchor="middle">أ</text><text x="140" y="80" textAnchor="middle">م = (أ + ب) ÷ ٢</text></svg><small>م نقطة المنتصف، والمسافتان على جانبيها متساويتان.</small></div>;
  if (!/(مثلث|زاوية|مضلع|دائرة|قطاع|محيط|مساحة|مربع|مستطيل|معين|متوازي|شبه المنحرف|حجم|مكعب|أسطوانة|وتر|أقطار|متباينة|تشابه|تطابق)/.test(title)) return null;
  const circle = title.includes("دائرة") || title.includes("قطاع") || title.includes("أسطوانة");
  const triangle = title.includes("مثلث") || title.includes("وتر") || title.includes("تشابه") || title.includes("تطابق") || title.includes("متباينة");
  const shape = circle ? <><circle cx="125" cy="65" r="47" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M125 65L91 32M125 65L164 36" stroke="var(--gold)" strokeWidth="3" /><path d="M91 32A47 47 0 0 1 164 36" fill="none" stroke="var(--gold)" strokeWidth="5" /><text x="125" y="88" textAnchor="middle">نق</text></> : triangle ? <><path d="M125 14L38 125H220Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="125" y="11" textAnchor="middle">الوتر</text><text x="30" y="76" textAnchor="end">الضلع ١</text><text x="230" y="76">الضلع ٢</text></> : title.includes("مربع") || title.includes("مكعب") ? <><rect x="70" y="22" width="110" height="90" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="125" y="133" textAnchor="middle">الضلع</text></> : title.includes("مستطيل") || title.includes("متوازي") || title.includes("شبه المنحرف") || title.includes("معين") ? <><path d="M48 112L78 30H210L232 112Z" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="140" y="128" textAnchor="middle">القاعدة × الارتفاع</text></> : <><polygon points="125,12 215,58 182,125 68,125 35,58" fill="var(--gold)" opacity=".16" stroke="currentColor" strokeWidth="3" /><text x="125" y="145" textAnchor="middle">عدد الأضلاع = ن</text></>;
  return <div className="law-visual"><svg viewBox="0 0 270 160" role="img" aria-label={`رسم توضيحي لقاعدة ${title}`}>{shape}</svg><small>رسم هندسي قابل للقراءة مرتبط مباشرة بقاعدة «{title}».</small></div>;
}
