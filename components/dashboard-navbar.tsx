"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"

export function DashboardNavbar() {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">O</span>
          </div>
          <span className="font-semibold">OpenNote</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button className="rounded-full bg-green-500 hover:bg-green-600">
          Upgrade
        </Button>
      </div>
    </header>
  )
}
