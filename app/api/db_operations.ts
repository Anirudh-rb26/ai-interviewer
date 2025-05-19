"use server";

import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ResumeData {
  text: string;
  numPages: number;
  info: {
    [key: string]: unknown;
  };
}

interface QA {
  question: string;
  answer: string;
}

interface FollowUpQA {
  question: string;
  answer: string;
}

interface InterviewResults {
  score: number;
  description: string;
  status: string[];
}

export async function UploadStartInterviewDetails(
  pdfFile: File,
  jobDescription: string
): Promise<{ success: boolean; error?: string; userId?: number }> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Parse PDF and extract text
    const pdfData = await pdfParse(Buffer.from(arrayBuffer));
    const extractedText = {
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
    };

    // Upload to Supabase
    const { data, error } = await supabase
      .from("User")
      .insert([
        {
          resume: extractedText,
          job_description: jobDescription,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return { success: true, userId: data[0].id };
  } catch (error) {
    console.error("Error processing resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function GetResumeData(id: number): Promise<{
  success: boolean;
  data?: { id: number; resume: ResumeData; job_description: string }[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("User")
      .select("id, resume, job_description")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data ? [data] : [],
    };
  } catch (error) {
    console.error("Error fetching resume data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function UpdateUserInterviewData(
  userId: number,
  qas: Record<string, unknown>,
  followup_qas: Record<string, unknown>,
  results: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("User")
      .update({
        qas,
        followup_qas,
        results,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating interview data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function GetUserInterviewData(userId: number): Promise<{
  success: boolean;
  data?: {
    results: Record<string, unknown>;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.from("User").select("results").eq("id", userId).single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || undefined,
    };
  } catch (error) {
    console.error("Error fetching interview data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
