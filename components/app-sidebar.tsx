"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Youtube, Pill, LayoutDashboard } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const mainItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "YT Learning",
    icon: Youtube,
    href: "/dashboard/yt-learning",
  },
  {
    title: "Capsule",
    icon: Pill,
    href: "/dashboard/capsule",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">O</span>
          </div>
          <span className="text-lg font-semibold">OpenNote</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2 text-center text-xs text-muted-foreground">
          Free Plan
        </div>
        <SignedIn>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
            />
            <span className="flex-1 truncate text-sm">
              {user?.firstName || user?.emailAddresses[0]?.emailAddress || "User"}
            </span>
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              Sign in
            </Button>
          </SignInButton>
        </SignedOut>
      </SidebarFooter>
    </Sidebar>
  )
}
