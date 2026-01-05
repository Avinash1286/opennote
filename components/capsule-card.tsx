"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BookOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

interface CapsuleCardProps {
    capsule: {
        _id: string
        title: string
        description?: string
        status: string
        moduleCount?: number
        lessonCount?: number
        generation?: {
            currentStage: string
            modulesGenerated: number
            totalModules: number
        } | null
    }
}

export function CapsuleCard({ capsule }: CapsuleCardProps) {
    const router = useRouter()

    const handleCapsuleClick = () => {
        if (capsule.status !== "completed" && capsule.status !== "failed") {
            toast.message("Capsule is still being generated", {
                description: "Please wait a bit and try again.",
            })
            return
        }

        router.push(`/capsule/${capsule._id}`)
    }

    return (
        <button
            type="button"
            onClick={handleCapsuleClick}
            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-xl h-full"
        >
            <Card className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 h-full flex flex-col pt-0">
                {/* Thumbnail area - mimicking video card style */}
                <div className="relative w-full h-32 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <BookOpen className="size-10 text-primary/40" />
                </div>

                <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-2">{capsule.title}</p>
                        {capsule.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {capsule.description}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                            {capsule.moduleCount} modules • {capsule.lessonCount} lessons
                        </p>

                        {capsule.status !== "completed" && capsule.status !== "failed" && (
                            <div className="mt-3 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    {capsule.status === "generating_outline"
                                        ? "Creating course outline..."
                                        : `Generating content... Module ${(capsule.generation?.modulesGenerated ?? 0) + 1} of ${capsule.generation?.totalModules || "?"}`}
                                </p>
                                <Progress
                                    value={
                                        capsule.status === "generating_outline"
                                            ? 10
                                            : Math.round(
                                                ((capsule.generation?.modulesGenerated ?? 0) /
                                                    Math.max(capsule.generation?.totalModules ?? 1, 1)) *
                                                100
                                            )
                                    }
                                />
                            </div>
                        )}

                        {capsule.status === "failed" && (
                            <p className="mt-2 text-xs text-destructive">Generation failed</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </button>
    )
}
