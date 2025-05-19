import { GetResumeData } from "@/app/api/db_operations"
import { InterviewService } from "@/app/services/interview"
import InterviewChat from "@/components/chat"

interface PageProps {
    params: {
        "user-id": string
    }
}

interface Question {
    number: number
    question: string
}

const StartInterview = async ({ params }: PageProps) => {
    const userId = Number.parseInt(params["user-id"] || "0")
    if (isNaN(userId)) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-gray-900">
                <div className="text-white text-xl">Invalid user ID</div>
            </div>
        )
    }
    const { success, data, error } = await GetResumeData(userId)

    if (!success || !data || data.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-gray-900">
                <div className="text-white text-xl">{error || "No data found"}</div>
            </div>
        )
    }

    const resumeData = data[0]

    // Generate interview questions
    let questions: Question[] = []
    try {
        const interviewService = new InterviewService()
        questions = await interviewService.generateQuestions({
            resume: resumeData.resume,
            jobDescription: resumeData.job_description
        })
    } catch (err) {
        console.error("Error generating questions:", err)
    }

    return (
        <div className="w-screen h-screen bg-gray-900 p-4 md:p-8">
            <div className="w-full h-full rounded-lg overflow-hidden">
                <InterviewChat
                    questions={questions}
                    resumeData={resumeData.resume}
                    jobDescription={resumeData.job_description}
                    userId={userId}
                />
            </div>
        </div>
    )
}

export default StartInterview
