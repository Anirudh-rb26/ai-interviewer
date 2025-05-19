"use client"

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadStartInterviewDetails } from "./api/db_operations";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState<string>("");
  const [resume, setResume] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles changes to the job description textarea
   * @param {ChangeEvent<HTMLTextAreaElement>} e - Textarea change event
   */
  const handleJobDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  };

  /**
   * Handles the resume file upload
   * @param {ChangeEvent<HTMLInputElement>} e - File input change event
   */
  const handleResumeUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF only)
      if (file.type === "application/pdf") {
        setResume(file);
        setUploadStatus(`${file.name} uploaded successfully`);
      } else {
        setUploadStatus("Please upload a PDF document only");
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  /**
   * Triggers the hidden file input when the upload area is clicked
   */
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Handles file drop events
   * @param {DragEvent<HTMLDivElement>} e - Drag event object
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Validate file type (PDF only)
      if (file.type === "application/pdf") {
        setResume(file);
        setUploadStatus(`${file.name} uploaded successfully`);
      } else {
        setUploadStatus("Please upload a PDF document only");
      }
    }
  };

  /**
   * Prevents default behavior for dragover events
   * @param {DragEvent<HTMLDivElement>} e - Drag event object
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Determines if the form is ready to submit
   */
  const isFormReady = (): boolean => {
    return !!jobDescription.trim() && !!resume && resume.type === "application/pdf";
  };

  /**
   * Get button text based on form state
   */
  const getButtonText = (): string => {
    if (isSubmitting) return "Starting Interview...";
    if (!jobDescription.trim() && !resume) return "Enter Job Description & Upload Resume";
    if (!jobDescription.trim()) return "Enter Job Description";
    if (!resume) return "Upload Resume";
    return "Start Interview";
  };

  /**
   * Get button color classes based on form state
   */
  const getButtonClasses = (): string => {
    const baseClasses = "w-full py-3 text-white rounded-lg shadow-md transition-all duration-300";

    if (isSubmitting) {
      return `${baseClasses} bg-purple-600 hover:bg-purple-700 cursor-wait`;
    }

    if (isFormReady()) {
      return `${baseClasses} bg-teal-500 hover:bg-teal-600`;
    }

    return `${baseClasses} bg-zinc-600 hover:bg-zinc-700 cursor-not-allowed opacity-80`;
  };

  /**
   * Submits the form to begin the interview process
   */
  const startInterview = async () => {
    // Validate job description is a non-empty string
    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      setUploadStatus("Please enter a job description");
      return;
    }

    // Validate resume is a PDF file
    if (!resume || resume.type !== "application/pdf") {
      setUploadStatus("Please upload a PDF resume");
      return;
    }

    // Set submitting state
    setIsSubmitting(true);
    setUploadStatus("Interview starting...");

    try {
      const response = await UploadStartInterviewDetails(resume, jobDescription);

      if (response.success && response.userId) {
        console.log("Starting interview with:", {
          jobDescription,
          resume
        });
        router.push(`/start-interview/${response.userId}`);
      } else {
        throw new Error(response.error || "Failed to start interview");
      }
    } catch (error) {
      setUploadStatus("Error starting interview. Please try again.");
      console.error("Interview start error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      {/* Header/Card */}
      <div className="w-full max-w-5xl h-5xl bg-zinc-900/90 backdrop-blur-md rounded-2xl p-8 mb-8 shadow-lg text-center">
        <h1 className="text-5xl font-semibold text-white mb-2">Start Your Interview</h1>
        <p className="text-gray-400">
          Enter the Job Description and Upload your Resume to begin.
        </p>
      </div>

      {/* Form Area */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        {/* Job Description */}
        <div className="flex-1">
          <label className="block mb-2 text-gray-300">Job Description</label>
          <Textarea
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            placeholder="Paste the job description here..."
            className="
              w-full
              h-48
              resize-none
              bg-zinc-800
              border border-zinc-700
              focus:border-teal-400
              focus:ring
              focus:ring-teal-400/30
              rounded-lg
              text-white
              p-4
            "
            disabled={isSubmitting}
          />
        </div>

        {/* Upload Resume */}
        <div className="flex-1 flex flex-col items-center justify-start">
          <label className="block mb-2 text-gray-300">Your Resume</label>
          <div
            className={`w-full h-48 flex flex-col items-center justify-center bg-zinc-800 
              border-2 border-dashed rounded-lg mb-4 
              ${isSubmitting ? 'cursor-default opacity-70' : 'cursor-pointer'} 
              ${resume ? 'border-teal-500' : 'border-zinc-700'}
              ${isSubmitting ? 'border-purple-500' : ''}`}
            onClick={isSubmitting ? undefined : triggerFileInput}
            onDrop={isSubmitting ? undefined : handleDrop}
            onDragOver={isSubmitting ? undefined : handleDragOver}
          >
            {resume ? (
              <>
                <p className={`${isSubmitting ? 'text-purple-400' : 'text-teal-400'} mb-2`}>{resume.name}</p>
                <p className="text-gray-500 text-sm">{(resume.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <p className="text-gray-500">
                {isSubmitting ? "Resume uploaded" : "Drag & drop or click to upload"}
              </p>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleResumeUpload}
              accept=".pdf"
              className="hidden"
              disabled={isSubmitting}
            />
          </div>

          {/* Status message */}
          {uploadStatus && (
            <p className={`text-sm mb-2 ${uploadStatus.includes("success") ? "text-teal-400" :
              uploadStatus.includes("starting") ? "text-purple-400" :
                "text-red-400"
              }`}>
              {uploadStatus}
            </p>
          )}

        </div>
      </div>
      <div className="mt-5 w-full max-w-5xl">
        <Button
          className={getButtonClasses()}
          onClick={startInterview}
          disabled={!isFormReady() || isSubmitting}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}