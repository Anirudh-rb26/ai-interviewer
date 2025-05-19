"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "./ui/input"
import { UpdateUserInterviewData } from "@/app/api/db_operations"
import { useRouter } from "next/navigation"

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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const handleEndInterview = async () => {
        if (isEndingInterview) return

        setIsEndingInterview(true)
        sendInterviewerMessage("Ending interview and saving your responses...")

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

            // Convert to Record format
            const qasRecord: Record<string, unknown> = {};
            initialQAs.forEach((qa, index) => {
                qasRecord[index.toString()] = qa;
            });

            const followUpQAsRecord: Record<string, unknown> = {};
            followUpQAs.forEach((qa, index) => {
                followUpQAsRecord[index.toString()] = qa;
            });

            // Generate results
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

            const { success, error } = await UpdateUserInterviewData(
                userId,
                qasRecord,
                followUpQAsRecord,
                result
            );

            if (success) {
                router.push(`/result/${userId}`)
            } else {
                throw new Error(error || "Failed to save interview data")
            }
        } catch (error) {
            console.error("Error saving interview data:", error)
            sendInterviewerMessage("There was an error saving your interview data. Please try again.")
            setIsEndingInterview(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.sender === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-900"
                                }`}
                        >
                            <p className="text-sm">{message.text}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                                {formatTime(message.timestamp)}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex space-x-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type your message..."
                        disabled={interviewState.isGeneratingFollowUp || interviewState.isComplete}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || interviewState.isGeneratingFollowUp || interviewState.isComplete}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                    {interviewState.isComplete && (
                        <Button onClick={handleEndInterview} disabled={isEndingInterview}>
                            End Interview
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
