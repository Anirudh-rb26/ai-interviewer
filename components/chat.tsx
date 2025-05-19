"use client"

import { useState, useRef, useEffect, SetStateAction } from "react"
import { Mic, Send, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "./ui/input"
import { UpdateUserInterviewData } from "@/app/api/db_operations"
import { useRouter } from "next/navigation"
import { SpeechService } from "@/utils/speech"

interface Question {
    number: number
    question: string
}

interface Message {
    id: string
    sender: "interviewer" | "user"
    text: string
    timestamp: Date
}

interface InterviewChatProps {
    questions: Question[]
    resumeData: {
        text: string
        numPages: number
        info: {
            [key: string]: unknown
        }
    }
    jobDescription: string
    userId: number
}

interface InterviewState {
    questions: Question[]
    answers: { [key: number]: string }
    currentQuestionIndex: number
    isComplete: boolean
    isGeneratingFollowUp: boolean
    hasGeneratedFollowUps: boolean
}

export default function InterviewChat({ questions, resumeData, jobDescription, userId }: InterviewChatProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isEndingInterview, setIsEndingInterview] = useState(false)
    const [interviewState, setInterviewState] = useState<InterviewState>({
        questions,
        answers: {},
        currentQuestionIndex: 0,
        isComplete: false,
        isGeneratingFollowUp: false,
        hasGeneratedFollowUps: false
    })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const speechServiceRef = useRef<SpeechService | null>(null)

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: "welcome",
                    sender: "interviewer",
                    text: "Welcome to your interview! I'll be asking you some questions based on your resume and the job description. Let's get started by briefly introducing yourself.",
                    timestamp: new Date(),
                },
            ])
        }
    }, [])

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        // Initialize speech service
        speechServiceRef.current = new SpeechService();

        // Request permissions when component mounts
        const requestPermissions = async () => {
            const granted = await speechServiceRef.current?.requestPermissions();
            if (!granted) {
                console.warn('Microphone permission not granted');
            }
        };
        requestPermissions();

        // Cleanup on unmount
        return () => {
            speechServiceRef.current?.stopListening();
            speechServiceRef.current?.stopSpeaking();
        };
    }, []);

    const sendInterviewerMessage = (text: string) => {
        const messageId = `interviewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setMessages((prev) => [
            ...prev,
            {
                id: messageId,
                sender: "interviewer",
                text,
                timestamp: new Date(),
            },
        ])

        // Auto-speak new interviewer messages if speaking is enabled
        if (isSpeaking && speechServiceRef.current) {
            speechServiceRef.current.speak(text);
        }
    }

    const handleSendMessage = async () => {
        if (input.trim() === "" || interviewState.isGeneratingFollowUp) return

        console.log("[Chat] Handling new message. Current state:", {
            currentIndex: interviewState.currentQuestionIndex,
            totalQuestions: interviewState.questions.length,
            isGeneratingFollowUp: interviewState.isGeneratingFollowUp
        });

        // Store the current input before clearing
        const currentInput = input;

        // Clear input immediately
        setInput("");

        // Add user message with unique ID
        const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setMessages((prev) => [
            ...prev,
            {
                id: userMessageId,
                sender: "user",
                text: currentInput,
                timestamp: new Date(),
            },
        ])

        // Store the answer
        setInterviewState(prev => ({
            ...prev,
            answers: {
                ...prev.answers,
                [prev.currentQuestionIndex]: currentInput
            }
        }))

        // Move to next question after a short delay
        setTimeout(async () => {
            const nextIndex = interviewState.currentQuestionIndex + 1
            console.log("[Chat] Moving to next question. Next index:", nextIndex);

            if (nextIndex < interviewState.questions.length) {
                setInterviewState(prev => ({
                    ...prev,
                    currentQuestionIndex: nextIndex
                }))
                sendInterviewerMessage(interviewState.questions[nextIndex].question)
            } else if (!interviewState.hasGeneratedFollowUps) {
                console.log("[Chat] Reached end of initial questions, generating follow-ups");

                // Set generating state to prevent new messages
                setInterviewState(prev => ({
                    ...prev,
                    isGeneratingFollowUp: true,
                    hasGeneratedFollowUps: true
                }))

                // Show loading message
                sendInterviewerMessage("Processing your answers and generating follow-up questions...")

                try {
                    const interviewData = Object.entries(interviewState.answers).map(([index, answer]) => ({
                        question: interviewState.questions[parseInt(index)].question,
                        answer: answer
                    }))

                    console.log("[Chat] Sending interview data for follow-up generation:", interviewData);

                    const response = await fetch("/api/interview", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            resume: resumeData,
                            jobDescription,
                            previousQAs: interviewData
                        })
                    });

                    if (!response.ok) {
                        throw new Error("Failed to generate follow-up questions");
                    }

                    const { questions: followUpQuestions } = await response.json();

                    console.log("[Chat] Received follow-up questions:", followUpQuestions);

                    if (followUpQuestions && followUpQuestions.length > 0) {
                        // The questions are already in the correct format from the API
                        setInterviewState(prev => ({
                            ...prev,
                            questions: [...prev.questions, ...followUpQuestions],
                            currentQuestionIndex: nextIndex,
                            isGeneratingFollowUp: false
                        }))
                        sendInterviewerMessage(followUpQuestions[0].question)
                    } else {
                        console.log("[Chat] No follow-up questions generated, ending interview");
                        setInterviewState(prev => ({
                            ...prev,
                            isComplete: true,
                            isGeneratingFollowUp: false
                        }))
                        sendInterviewerMessage(
                            "Thank you for completing the interview! We'll review your responses and get back to you soon."
                        )
                    }
                } catch (error) {
                    console.error("[Chat] Error in follow-up generation:", error);
                    setInterviewState(prev => ({
                        ...prev,
                        isComplete: true,
                        isGeneratingFollowUp: false
                    }))
                    sendInterviewerMessage(
                        "Thank you for completing the interview! We'll review your responses and get back to you soon."
                    )
                }
            } else {
                console.log("[Chat] Reached end of follow-up questions, ending interview");
                setInterviewState(prev => ({
                    ...prev,
                    isComplete: true
                }))
                sendInterviewerMessage(
                    "Thank you for completing the interview! We'll review your responses and get back to you soon."
                )
            }
        }, 1000)
    }

    // Add effect to clear input when question changes
    useEffect(() => {
        setInput("");
        if (speechServiceRef.current && isRecording) {
            speechServiceRef.current.stopListening();
            setIsRecording(false);
        }
    }, [interviewState.currentQuestionIndex]);

    const toggleRecording = async () => {
        if (!speechServiceRef.current) return;

        if (!isRecording) {
            // Clear any existing input when starting new recording
            setInput("");
            setIsRecording(true);
            speechServiceRef.current.startListening(
                (text, isFinal) => {
                    setInput(text);
                },
                (error) => {
                    console.error('Speech recognition error:', error);
                    setIsRecording(false);
                }
            );
        } else {
            setIsRecording(false);
            speechServiceRef.current.stopListening();
        }
    };

    const toggleSpeaking = () => {
        if (!speechServiceRef.current) return;

        if (!isSpeaking) {
            setIsSpeaking(true);
            // Speak the last interviewer message
            const lastInterviewerMessage = [...messages]
                .reverse()
                .find(msg => msg.sender === 'interviewer');
            if (lastInterviewerMessage) {
                speechServiceRef.current.speak(lastInterviewerMessage.text);
            }
        } else {
            setIsSpeaking(false);
            speechServiceRef.current.stopSpeaking();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    const handleEndInterview = async () => {
        if (isEndingInterview) return;

        setIsEndingInterview(true);
        try {
            // Separate initial QAs from follow-up QAs
            const initialQAs = interviewState.questions
                .slice(0, questions.length)
                .map((q, index) => ({
                    question: q.question,
                    answer: interviewState.answers[index] || ''
                }));

            const followUpQAs = interviewState.questions
                .slice(questions.length)
                .map((q, index) => ({
                    question: q.question,
                    answer: interviewState.answers[questions.length + index] || ''
                }));

            const response = await fetch("/api/interview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    resume: resumeData,
                    jobDescription,
                    previousQAs: [...initialQAs, ...followUpQAs],
                    action: "generateResult"
                })
            });

            if (!response.ok) {
                throw new Error("Failed to generate interview result");
            }

            const result = await response.json();
            console.log("[Chat] Interview result:", result);

            // Convert interview data to Record<string, unknown> format
            const qasRecord: Record<string, unknown> = {};
            initialQAs.forEach((qa, index) => {
                qasRecord[index.toString()] = qa;
            });

            const followUpQAsRecord: Record<string, unknown> = {};
            followUpQAs.forEach((qa, index) => {
                followUpQAsRecord[index.toString()] = qa;
            });

            // Upload the interview data to the database
            const { success, error } = await UpdateUserInterviewData(
                userId,
                qasRecord,
                followUpQAsRecord,
                result
            );

            if (!success) {
                throw new Error(error || "Failed to update interview data");
            }

            console.log("[Chat] Interview data uploaded successfully");

            router.push(`/result/${userId}`);

        } catch (error) {
            console.error("[Chat] Error in end interview process:", error);
        }
    }

    // Add effect to auto-end interview when completion message is received
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.sender === "interviewer" &&
            lastMessage.text === "Thank you for completing the interview! We'll review your responses and get back to you soon.") {
            handleEndInterview();
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full w-full bg-gray-800">
            <div className="bg-gray-700 p-4 text-white font-medium text-center border-b border-gray-600 flex flex-row justify-between ">
                <div>Interview Chat</div>
                <Button
                    className="bg-red-500 hover:bg-red-700"
                    onClick={handleEndInterview}
                    disabled={interviewState.isGeneratingFollowUp || isEndingInterview}
                >
                    {isEndingInterview ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Ending Interview...
                        </div>
                    ) : (
                        "End Interview"
                    )}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-400">
                {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.sender === "user"
                                ? "bg-blue-500 text-white rounded-br-none"
                                : "bg-gray-600 text-white rounded-bl-none"
                                }`}
                        >
                            <div className="mb-1">{message.text}</div>
                            <div className={`text-xs ${message.sender === "user" ? "text-blue-100" : "text-gray-300"} text-right`}>
                                {formatTime(message.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-gray-700 border-t border-gray-600">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleRecording}
                        className={`${isRecording ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white border-none`}
                    >
                        <Mic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleSpeaking}
                        className={`${isSpeaking ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-400 hover:bg-blue-500"} text-white border-none`}
                    >
                        {isSpeaking ? (
                            <VolumeX className="h-4 w-4" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                    </Button>
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-gray-600 text-white placeholder-gray-400 border-gray-500 focus-visible:ring-blue-400"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={input.trim() === "" || interviewState.isGeneratingFollowUp}
                        className="bg-blue-400 hover:bg-blue-500 text-white border-none disabled:bg-gray-600 disabled:hover:bg-gray-600"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
