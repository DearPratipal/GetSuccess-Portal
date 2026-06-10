export interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

export interface ExamConfig {
    timeLimit: number;
    positiveMarks: number;
    negativeMarks: number;
    category: string;
    examMode: 'pyq' | 'text';
    rawText: string;
}