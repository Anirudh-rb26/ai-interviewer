import { InterviewService } from "@/app/services/interview";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resume, jobDescription, previousQAs, action } = body;

    const interviewService = new InterviewService();

    if (action === "generateResult") {
      const result = await interviewService.generateInterviewResult({
        resume,
        jobDescription,
        initialQAs: previousQAs,
      });
      return NextResponse.json(result);
    } else {
      // Default action is to generate questions
      const questions = await interviewService.generateQuestions({
        resume,
        jobDescription,
        initialQAs: previousQAs,
      });
      return NextResponse.json({ questions });
    }
  } catch (error) {
    console.error("[InterviewAPI] Error:", error);
    return NextResponse.json({ error: "Failed to process interview request" }, { status: 500 });
  }
}
