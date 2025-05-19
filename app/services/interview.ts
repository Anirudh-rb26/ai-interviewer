interface Question {
  number: number;
  question: string;
}

interface ResumeData {
  text: string;
}

interface InterviewContext {
  resume: ResumeData;
  jobDescription: string;
  initialQAs?: { question: string; answer: string }[];
  followupQAs?: { question: string; answer: string }[];
}

interface InterviewResult {
  description: string;
  score: number;
  status: InterviewStatus;
}

enum InterviewStatus {
  PROMISING_CANDIDATE = "Promising Candidate",
  QUALIFIED_CANDIDATE = "Qualified Candidate",
  ON_HOLD = "On Hold",
  SCHEDULE_ANOTHER_INTERVIEW = "Schedule Another Interview",
  BAD_CANDIDATE = "Bad Candidate",
}

export class InterviewService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.apiKey = apiKey;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private parseQuestions(text: string, startNumber: number = 1): Question[] {
    const questions: Question[] = [];
    const lines = text.split("\n").filter((line) => line.trim());

    let currentNumber = startNumber;
    for (const line of lines) {
      const match = line.match(/^(\d+)[.)]\s*(.+)$/);
      if (match) {
        questions.push({
          number: currentNumber,
          question: match[2].trim(),
        });
        currentNumber++;
      }
    }

    return questions;
  }

  async generateQuestions(context: InterviewContext): Promise<Question[]> {
    const isFollowUp =
      !!context.followupQAs || (context.initialQAs && context.initialQAs.length > 0);

    const prompt = isFollowUp
      ? this.generateFollowUpPrompt(context)
      : this.generateInitialPrompt(context);

    const generatedText = await this.callGeminiAPI(prompt);

    // Calculate the next question number based on existing QAs
    let nextQuestionNumber = 1;
    if (context.initialQAs) {
      nextQuestionNumber += context.initialQAs.length;
    }
    if (context.followupQAs) {
      nextQuestionNumber += context.followupQAs.length;
    }

    return this.parseQuestions(generatedText, isFollowUp ? nextQuestionNumber : 1);
  }

  private generateInitialPrompt(context: InterviewContext): string {
    return `Based on the following resume and job description, generate relevant interview questions. 
    Format each question with a number and the question text. Focus on technical skills, experience, and how the candidate's background aligns with the job requirements.

    Resume:
    ${context.resume.text}

    Job Description:
    ${context.jobDescription}

    Generate 4-6 specific technical and experience-based interview questions.`;
  }

  private generateFollowUpPrompt(context: InterviewContext): string {
    // Combine initialQAs and followupQAs for context
    const allQAs = [...(context.initialQAs || []), ...(context.followupQAs || [])];

    return `Based on the following resume, job description, and interview responses, generate relevant follow-up interview questions. 
    Format each question with a number and the question text. Focus on areas that need more clarification or deeper exploration.

    Resume:
    ${context.resume.text}

    Job Description:
    ${context.jobDescription}

    Previous Interview Responses:
    ${allQAs.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}

    Generate specific follow-up questions that would help clarify or expand on the candidate's responses.`;
  }

  async generateInterviewResult(context: InterviewContext): Promise<InterviewResult> {
    // Combine initialQAs and followupQAs for evaluation
    const allQAs = [...(context.initialQAs || []), ...(context.followupQAs || [])];

    if (allQAs.length === 0) {
      throw new Error("Cannot generate results without interview responses");
    }

    const prompt = this.generateResultPrompt(context);
    const resultText = await this.callGeminiAPI(prompt);

    return this.parseInterviewResult(resultText);
  }

  private generateResultPrompt(context: InterviewContext): string {
    // Combine initialQAs and followupQAs for the prompt
    const allQAs = [...(context.initialQAs || []), ...(context.followupQAs || [])];

    return `Based on the following interview details, analyze the candidate's performance and provide a comprehensive evaluation.

    Resume:
    ${context.resume.text}

    Job Description:
    ${context.jobDescription}

    Interview Questions and Responses:
    ${allQAs.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}

    Please provide the following in your response:
    
    1) DESCRIPTION: A short description (2-3 paragraphs) analyzing the overall interview performance, highlighting strengths, weaknesses, and alignment with the job requirements.
    
    2) SCORE: A numerical score from 0 to 100 representing the candidate's fit for the position, where:
       - 90-100: Exceptional match, exceeding requirements
       - 75-89: Strong match, meeting most requirements
       - 60-74: Adequate match with some gaps
       - 40-59: Partial match with significant gaps
       - 0-39: Poor match with major deficiencies
    
    3) STATUS: Assign one of the following statuses:
       - Promising Candidate: Excellent fit, recommend proceeding
       - Qualified Candidate: Good fit, shows potential
       - On Hold: Not enough information or could be either good or bad
       - Schedule Another Interview: Needs further assessment
       - Bad Candidate: Not suitable for the position
    
    Format your response as:
    DESCRIPTION: [your analysis]
    SCORE: [number]
    STATUS: [one of the five statuses]`;
  }

  private parseInterviewResult(text: string): InterviewResult {
    let description = "";
    let score = 0;
    let status: InterviewStatus = InterviewStatus.ON_HOLD;

    // Extract description
    const descMatch = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=SCORE:|$)/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // Extract score
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    if (scoreMatch && scoreMatch[1]) {
      score = parseInt(scoreMatch[1], 10);
      // Ensure score is within valid range
      score = Math.min(100, Math.max(0, score));
    }

    // Extract status
    const statusMatch = text.match(/STATUS:\s*([\w\s]+)$/im);
    if (statusMatch && statusMatch[1]) {
      const statusText = statusMatch[1].trim();

      // Match to enum values
      if (statusText.toLowerCase().includes("promising")) {
        status = InterviewStatus.PROMISING_CANDIDATE;
      } else if (statusText.toLowerCase().includes("qualified")) {
        status = InterviewStatus.QUALIFIED_CANDIDATE;
      } else if (statusText.toLowerCase().includes("on hold")) {
        status = InterviewStatus.ON_HOLD;
      } else if (
        statusText.toLowerCase().includes("schedule") ||
        statusText.toLowerCase().includes("another interview")
      ) {
        status = InterviewStatus.SCHEDULE_ANOTHER_INTERVIEW;
      } else if (statusText.toLowerCase().includes("bad")) {
        status = InterviewStatus.BAD_CANDIDATE;
      }
    }

    return {
      description,
      score,
      status,
    };
  }
}
