import React from 'react'
import { GetUserInterviewData } from '@/app/api/db_operations'

interface PageProps {
    params: {
        userId: string
    }
}

const ResultPage = async ({ params }: PageProps) => {
    const userId = Number.parseInt(params.userId || "0")
    if (isNaN(userId)) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-black">
                <div className="text-white text-xl">Invalid user ID</div>
            </div>
        )
    }

    const { success, data, error } = await GetUserInterviewData(userId)

    if (!success || !data) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-black">
                <div className="text-white text-xl">{error || "No results found"}</div>
            </div>
        )
    }

    const results = data.results as {
        score: number;
        description: string;
        status: string;
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'promising candidate':
                return 'bg-teal-500/20 text-teal-400 border-teal-500/50'
            case 'qualified candidate':
                return 'bg-green-500/20 text-green-400 border-green-500/50'
            case 'on hold':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
            case 'schedule another interview':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
            case 'bad candidate':
                return 'bg-red-500/20 text-red-400 border-red-500/50'
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-3xl bg-zinc-900/90 backdrop-blur-md rounded-2xl p-8 shadow-lg">
                <h1 className="text-4xl font-semibold text-white mb-6 text-center">Interview Results</h1>

                {/* Score Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full border-4 border-teal-500 flex items-center justify-center">
                            <span className="text-4xl font-bold text-teal-400">{results.score}%</span>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-3">Evaluation</h2>
                    <p className="text-gray-300 leading-relaxed">{results.description}</p>
                </div>

                {/* Status Section */}
                <div>
                    <h2 className="text-xl font-semibold text-white mb-3">Status</h2>
                    <div className="flex flex-wrap gap-3">
                        <span
                            className={`px-4 py-2 rounded-full border ${getStatusColor(results.status)}`}
                        >
                            {results.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ResultPage