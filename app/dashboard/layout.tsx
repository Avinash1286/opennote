import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardNavbar } from "@/components/dashboard-navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardNavbar />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
