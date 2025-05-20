# Nora AI - AI Interviewer

An intelligent interviewing platform that conducts automated interviews based on resumes and job descriptions, providing comprehensive feedback and candidate evaluation.

## Demo

> **Note:** Text-to-speech and speech-to-text features may not be visible in the video demo due to limitations with the recording software.

<video width="100%" controls>
  <source src="demo/Arc 2025-05-20 04-29-44.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

<img width="100%" src="demo/Screenshot 2025-05-20 045153.png" alt="Screenshot of the application">

## Features

- **Resume & Job Description Upload**: Initiate interviews with personalized questions based on candidate qualifications and job requirements
- **Dynamic Interview Process**: AI-generated questions adapt based on previous responses
- **Speech Capabilities**:
  - Text-to-speech for interview questions
  - Speech-to-text for candidate responses
- **Intelligent Interview Flow**:
  - Follows up with deeper questions based on initial responses
  - Automatically concludes interview when sufficient data is gathered
- **Comprehensive Feedback**:
  - Candidate performance score
  - Detailed performance analysis
  - Hiring recommendation (accept/reject)
- **Complete Data Storage**: All interview data saved to Supabase for review and analysis

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Supabase account
- Gemini API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nora-ai-interviewer.git
cd nora-ai-interviewer
```

2. Install dependencies:

```bash
npm i --legacy-peer-deps
```

3. Create a `.env` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_SUPABASE_ANON_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Database Setup

Create a table in Supabase with the following columns:

- `id` (int8)
- `resume` (json)
- `job_description` (text)
- `qas` (json)
- `followup_qas` (json)
- `results` (json)

### Starting the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage Flow

1. **Upload Phase**:

   - User uploads their resume and the job description
   - Click "Start Interview" to proceed

2. **Interview Phase**:

   - AI asks questions using text-to-speech
   - User can respond via speech-to-text or by typing
   - AI generates follow-up questions based on responses

3. **Conclusion**:

   - AI automatically ends the interview after sufficient questioning
   - User can also manually end the interview at any point

4. **Feedback**:
   - System generates performance score
   - Provides detailed analysis of interview performance
   - Offers hiring recommendation

## Technology Stack

- **Frontend**: Next.js, ShadcnUI
- **Backend**: Next.js API routes
- **Database**: Supabase
- **AI/ML**:
  - Gemini API for question generation and response analysis
  - Web Speech API for speech capabilities.
- **Cursor & V0**: To quickly implement and debug.
