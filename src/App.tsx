import React, { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Clock, AlertCircle, CheckCircle, XCircle,
    ChevronRight, ChevronLeft, Flag, Play, Award, RotateCcw,
    Settings, BrainCircuit, FileText, Loader2
} from 'lucide-react';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // API key is injected by the execution environment

// --- API Utility ---
const generateGeminiContent = async (prompt, retryCount = 0) => {
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: "You are an expert exam creator for the GetSuccess portal. Generate high-quality multiple choice questions." }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        question: { type: "STRING" },
                        options: { type: "ARRAY", items: { type: "STRING" } },
                        correctAnswer: { type: "INTEGER", description: "0-based index of the correct option (0, 1, 2, or 3)" }
                    },
                    required: ["question", "options", "correctAnswer"]
                }
            }
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error("Empty response from AI");
        return JSON.parse(textResponse);
    } catch (error) {
        if (retryCount < maxRetries) {
            await new Promise(res => setTimeout(res, delays[retryCount]));
            return generateGeminiContent(prompt, retryCount + 1);
        }
        throw new Error("Failed to generate content after multiple attempts. Please try again.");
    }
};

// --- Main Application Component ---
export default function App() {
    const [view, setView] = useState('setup'); // 'setup', 'exam', 'result'
    const [questions, setQuestions] = useState([]);

    // Configuration State
    const [config, setConfig] = useState({
        timeLimit: 15,
        positiveMarks: 2,
        negativeMarks: 0.5,
        category: 'SSC CGL',
        examMode: 'pyq', // 'pyq' or 'text'
        rawText: ''
    });

    // Exam State
    const [userAnswers, setUserAnswers] = useState({});
    const [questionStatus, setQuestionStatus] = useState({}); // { 0: 'answered', 1: 'marked', 2: 'visited' }
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const categories = ["SSC CGL", "SSC CHSL", "SSC MTS", "BSSC 10+2", "RRB NTPC", "Banking PO"];

    // --- Exam Logic ---
    useEffect(() => {
        let timer;
        if (view === 'exam' && timeRemaining > 0) {
            timer = setInterval(() => {
                setTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (view === 'exam' && timeRemaining === 0) {
            submitExam();
        }
        return () => clearInterval(timer);
    }, [view, timeRemaining]);

    const handleGenerateTest = async () => {
        setIsGenerating(true);
        setErrorMsg("");
        try {
            let prompt = "";
            if (config.examMode === 'pyq') {
                prompt = `Generate 10 standard Previous Year Questions (PYQs) for the ${config.category} examination. Ensure the difficulty matches the actual exam.`;
            } else {
                if (!config.rawText.trim()) throw new Error("Please paste some text to parse.");
                prompt = `Extract and format multiple choice questions from the following text. If answers aren't explicitly provided, infer the most logical correct answer:\n\n${config.rawText}`;
            }

            const generatedQuestions = await generateGeminiContent(prompt);

            if (!generatedQuestions || generatedQuestions.length === 0) {
                throw new Error("No questions could be generated.");
            }

            setQuestions(generatedQuestions);
            startExam(generatedQuestions.length);
        } catch (err) {
            setErrorMsg(err.message || "An error occurred during AI generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const startExam = (qCount) => {
        const initialStatus = {};
        for (let i = 0; i < qCount; i++) initialStatus[i] = 'not_visited';
        initialStatus[0] = 'visited'; // First question is visited

        setQuestionStatus(initialStatus);
        setUserAnswers({});
        setCurrentQuestionIndex(0);
        setTimeRemaining(config.timeLimit * 60);
        setView('exam');
    };

    const submitExam = () => {
        setView('result');
    };

    const handleOptionSelect = (qIndex, optIndex) => {
        setUserAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
    };

    const saveAndNext = () => {
        setQuestionStatus(prev => ({
            ...prev,
            [currentQuestionIndex]: userAnswers[currentQuestionIndex] !== undefined ? 'answered' : 'not_answered'
        }));
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            setQuestionStatus(prev => ({
                ...prev,
                [nextIdx]: prev[nextIdx] === 'not_visited' ? 'visited' : prev[nextIdx]
            }));
        }
    };

    const markForReview = () => {
        setQuestionStatus(prev => ({
            ...prev,
            [currentQuestionIndex]: 'marked'
        }));
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            setQuestionStatus(prev => ({
                ...prev,
                [nextIdx]: prev[nextIdx] === 'not_visited' ? 'visited' : prev[nextIdx]
            }));
        }
    };

    const clearResponse = () => {
        const newAnswers = { ...userAnswers };
        delete newAnswers[currentQuestionIndex];
        setUserAnswers(newAnswers);
    };

    const jumpToQuestion = (index) => {
        setQuestionStatus(prev => ({
            ...prev,
            [currentQuestionIndex]: prev[currentQuestionIndex] === 'visited' && userAnswers[currentQuestionIndex] === undefined ? 'not_answered' : prev[currentQuestionIndex]
        }));
        setCurrentQuestionIndex(index);
        setQuestionStatus(prev => ({
            ...prev,
            [index]: prev[index] === 'not_visited' ? 'visited' : prev[index]
        }));
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- Views ---
    const renderSetup = () => (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
            <div className="flex items-center space-x-3 mb-8 pb-4 border-b">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">GetSuccess Portal - Exam Creator</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Col: Source Configuration */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-blue-500" />
                        Question Generation
                    </h2>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${config.examMode === 'pyq' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setConfig({ ...config, examMode: 'pyq' })}
                        >
                            AI PYQ Generator
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${config.examMode === 'text' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setConfig({ ...config, examMode: 'text' })}
                        >
                            Parse from Text
                        </button>
                    </div>

                    {config.examMode === 'pyq' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Examination Category</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.category}
                                    onChange={(e) => setConfig({ ...config, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800">
                                    Our AI will generate high-quality Previous Year Questions specifically tailored to the <strong>{config.category}</strong> syllabus and pattern.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paste Raw Questions & Options</label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-48 resize-none"
                                    placeholder="Paste your raw text here. E.g.&#10;1. What is the capital of France?&#10;A) Berlin B) Madrid C) Paris D) Rome"
                                    value={config.rawText}
                                    onChange={(e) => setConfig({ ...config, rawText: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: Exam Settings */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        Exam Rules (SSC Pattern)
                    </h2>

                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (Minutes)</label>
                            <input
                                type="number" min="1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                value={config.timeLimit}
                                onChange={(e) => setConfig({ ...config, timeLimit: Number(e.target.value) })}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-green-700 mb-1">Marks per Correct (+)</label>
                                <input
                                    type="number" min="1" step="0.5"
                                    className="w-full p-2 border border-green-300 bg-green-50 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                                    value={config.positiveMarks}
                                    onChange={(e) => setConfig({ ...config, positiveMarks: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-red-700 mb-1">Negative Marks (-)</label>
                                <input
                                    type="number" min="0" step="0.1"
                                    className="w-full p-2 border border-red-300 bg-red-50 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                    value={config.negativeMarks}
                                    onChange={(e) => setConfig({ ...config, negativeMarks: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <ul className="text-xs text-gray-500 mt-4 space-y-1 list-disc pl-4">
                            <li>Auto-evaluation upon timer end.</li>
                            <li>Questions can be marked for review.</li>
                            <li>Calculates final score strictly based on the above marking scheme.</li>
                        </ul>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateTest}
                        disabled={isGenerating}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-blue-400"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Generating CBT Exam...</>
                        ) : (
                            <><Play className="w-6 h-6" /> Start Live Test</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderExam = () => {
        const currentQ = questions[currentQuestionIndex];

        // Status Counts
        const answeredCount = Object.values(questionStatus).filter(s => s === 'answered').length;
        const notAnsweredCount = Object.values(questionStatus).filter(s => s === 'not_answered').length;
        const markedCount = Object.values(questionStatus).filter(s => s === 'marked').length;
        const notVisitedCount = questions.length - Object.keys(questionStatus).length + Object.values(questionStatus).filter(s => s === 'not_visited').length;

        return (
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
                {/* Header bar */}
                <div className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-6 h-6" />
                        <span className="font-bold text-xl">GetSuccess Portal</span>
                        <span className="ml-4 px-2 py-1 bg-blue-700 rounded text-sm hidden sm:inline-block">
                            {config.examMode === 'pyq' ? config.category : 'Custom Test'}
                        </span>
                    </div>
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1 rounded bg-white ${timeRemaining < 60 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                        <Clock className="w-5 h-5" />
                        {formatTime(timeRemaining)}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* Left Area: Question Panel */}
                    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg shadow p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-center border-b pb-4 mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Question {currentQuestionIndex + 1}</h2>
                                <div className="flex gap-4 text-sm font-medium">
                                    <span className="text-green-600">Right: +{config.positiveMarks}</span>
                                    <span className="text-red-600">Wrong: -{config.negativeMarks}</span>
                                </div>
                            </div>

                            <div className="text-lg text-gray-800 mb-8 whitespace-pre-wrap font-medium">
                                {currentQ.question}
                            </div>

                            <div className="space-y-3 flex-1">
                                {currentQ.options.map((opt, idx) => (
                                    <label
                                        key={idx}
                                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${userAnswers[currentQuestionIndex] === idx
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="option"
                                            className="w-5 h-5 text-blue-600"
                                            checked={userAnswers[currentQuestionIndex] === idx}
                                            onChange={() => handleOptionSelect(currentQuestionIndex, idx)}
                                        />
                                        <span className="ml-3 text-gray-700">{opt}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 pt-6 border-t flex flex-wrap gap-3 justify-between">
                                <div className="flex gap-3">
                                    <button onClick={markForReview} className="px-4 py-2 border border-purple-500 text-purple-700 rounded font-medium hover:bg-purple-50 flex items-center gap-2">
                                        <Flag className="w-4 h-4" /> Mark for Review & Next
                                    </button>
                                    <button onClick={clearResponse} className="px-4 py-2 border border-gray-400 text-gray-600 rounded font-medium hover:bg-gray-50">
                                        Clear Response
                                    </button>
                                </div>
                                <button onClick={saveAndNext} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow flex items-center gap-2">
                                    Save & Next <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Area: Status Palette */}
                    <div className="w-full md:w-80 bg-white shadow-lg border-l flex flex-col shrink-0 h-64 md:h-auto">
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="font-bold text-gray-500">CBT</span>
                                </div>
                                <div>
                                    <h3 className="font-bold">Candidate</h3>
                                    <p className="text-xs text-gray-500">Time Left: {formatTime(timeRemaining)}</p>
                                </div>
                            </div>

                            {/* Status Legend */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1"><div className="w-6 h-6 bg-green-500 rounded text-white flex items-center justify-center">{answeredCount}</div> Answered</div>
                                <div className="flex items-center gap-1"><div className="w-6 h-6 bg-red-500 rounded text-white flex items-center justify-center">{notAnsweredCount}</div> Not Answered</div>
                                <div className="flex items-center gap-1"><div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded text-gray-600 flex items-center justify-center">{notVisitedCount}</div> Not Visited</div>
                                <div className="flex items-center gap-1"><div className="w-6 h-6 bg-purple-600 rounded text-white flex items-center justify-center">{markedCount}</div> Marked</div>
                            </div>
                        </div>

                        {/* Grid Map */}
                        <div className="p-4 flex-1 overflow-y-auto bg-gray-50">
                            <h4 className="font-bold text-sm text-gray-700 mb-3">Question Palette</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {questions.map((_, idx) => {
                                    let bgColor = "bg-gray-200 border-gray-300 text-gray-700"; // default not visited
                                    if (questionStatus[idx] === 'answered') bgColor = "bg-green-500 text-white border-green-600";
                                    if (questionStatus[idx] === 'not_answered') bgColor = "bg-red-500 text-white border-red-600";
                                    if (questionStatus[idx] === 'marked') bgColor = "bg-purple-600 text-white border-purple-700";
                                    if (questionStatus[idx] === 'visited' && userAnswers[idx] === undefined) bgColor = "bg-red-500 text-white border-red-600";

                                    // Pulse current question
                                    const isCurrent = idx === currentQuestionIndex;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => jumpToQuestion(idx)}
                                            className={`h-10 w-full rounded font-medium border shadow-sm transition-transform ${bgColor} ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : 'hover:scale-105'}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="p-4 border-t bg-gray-100">
                            <button
                                onClick={submitExam}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow"
                            >
                                Submit Examination
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResult = () => {
        let attempted = 0;
        let correct = 0;
        let incorrect = 0;

        questions.forEach((q, idx) => {
            if (userAnswers[idx] !== undefined) {
                attempted++;
                if (userAnswers[idx] === q.correctAnswer) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });

        const totalQuestions = questions.length;
        const positiveScore = correct * config.positiveMarks;
        const negativeScore = incorrect * config.negativeMarks;
        const finalScore = positiveScore - negativeScore;
        const maxScore = totalQuestions * config.positiveMarks;
        const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

        return (
            <div className="max-w-4xl mx-auto p-6 mt-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-800 p-8 text-center text-white">
                        <Award className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                        <h1 className="text-3xl font-bold mb-2">Examination Results</h1>
                        <p className="text-blue-200">GetSuccess CBT Evaluation System</p>
                    </div>

                    <div className="p-8">
                        {/* Score Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-lg border text-center">
                                <p className="text-sm text-gray-500 font-medium">Final Score</p>
                                <p className="text-3xl font-bold text-blue-700">{finalScore.toFixed(2)} <span className="text-lg text-gray-400">/ {maxScore}</span></p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border text-center">
                                <p className="text-sm text-gray-500 font-medium">Accuracy</p>
                                <p className="text-3xl font-bold text-gray-800">{accuracy}%</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                                <p className="text-sm text-green-600 font-medium">Correct (+{config.positiveMarks})</p>
                                <p className="text-3xl font-bold text-green-700">{correct}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                                <p className="text-sm text-red-600 font-medium">Incorrect (-{config.negativeMarks})</p>
                                <p className="text-3xl font-bold text-red-700">{incorrect}</p>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-8 text-sm font-medium border-b pb-8">
                            <div className="flex-1 text-center">Total Questions: <strong>{totalQuestions}</strong></div>
                            <div className="flex-1 text-center border-l">Attempted: <strong>{attempted}</strong></div>
                            <div className="flex-1 text-center border-l">Unattempted: <strong>{totalQuestions - attempted}</strong></div>
                        </div>

                        {/* Detail Analysis */}
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            Detailed Review
                        </h3>
                        <div className="space-y-6">
                            {questions.map((q, idx) => {
                                const userAnsIndex = userAnswers[idx];
                                const isAttempted = userAnsIndex !== undefined;
                                const isCorrect = isAttempted && userAnsIndex === q.correctAnswer;

                                return (
                                    <div key={idx} className={`p-4 rounded-lg border ${!isAttempted ? 'bg-gray-50 border-gray-200' : isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex gap-3 mb-2">
                                            <span className="font-bold text-gray-500">Q{idx + 1}.</span>
                                            <p className="font-medium text-gray-800">{q.question}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8 mt-4">
                                            {q.options.map((opt, oIdx) => {
                                                let optStyle = "border-gray-200 text-gray-600 bg-white";
                                                let icon = null;

                                                if (oIdx === q.correctAnswer) {
                                                    optStyle = "border-green-500 bg-green-100 text-green-800 font-semibold";
                                                    icon = <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />;
                                                } else if (isAttempted && userAnsIndex === oIdx) {
                                                    optStyle = "border-red-500 bg-red-100 text-red-800";
                                                    icon = <XCircle className="w-4 h-4 text-red-600 ml-auto" />;
                                                }

                                                return (
                                                    <div key={oIdx} className={`p-2 rounded border flex items-center ${optStyle} text-sm`}>
                                                        <span className="mr-2 font-medium">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                                        {icon}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setView('setup')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow inline-flex items-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" /> Create Another Test
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {view === 'setup' && renderSetup()}
            {view === 'exam' && renderExam()}
            {view === 'result' && renderResult()}
        </div>
    );
}