"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { CapsuleCard } from "@/components/capsule-card"
import { Loader2 } from "lucide-react"

export default function AllCapsulesPage() {
    const capsules = useQuery(api.capsules.listCapsules, { limit: 100 })

    if (capsules === undefined) {
        return (
            <div className="flex flex-col items-center justify-center p-8 min-h-[50vh]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">Your Capsules</h1>
                <p className="text-muted-foreground">
                    All your learning capsules in one place.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {capsules.map((capsule) => (
                    <CapsuleCard key={capsule._id} capsule={capsule} />
                ))}

                {capsules.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        No capsules found. Create one from the dashboard!
                    </div>
                )}
            </div>
        </div>
    )
}
