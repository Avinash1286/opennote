"use client"

import * as React from "react"
import Link from "next/link"
import {
  Play,
  Sparkles,
  BookOpen,
  Gamepad2,
  GraduationCap,
  Youtube,
  Brain,
  Zap,
  Users,
  Trophy,
  Target,
  FileText,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  BarChart3,
  Clock,
  MessageSquare,
  Layers,
  Award,
  TrendingUp,
  AlertTriangle,
  ClipboardCheck,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description,
  features,
  gradient,
  badge,
}: {
  icon: React.ElementType
  title: string
  description: string
  features: string[]
  gradient: string
  badge?: string
}) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {badge && (
        <Badge className="absolute right-4 top-4 bg-primary/10 text-primary">
          {badge}
        </Badge>
      )}
      <CardContent className="p-6">
        <div
          className={cn(
            "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl",
            gradient
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// Step component for How It Works
function Step({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: number
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

// Stat component
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary md:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

// Teacher tool card
function TeacherToolCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4 rounded-lg border border-border/50 bg-card/30 p-4 transition-colors hover:bg-card/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
        <Icon className="h-5 w-5 text-emerald-500" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">OpenNote</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How it Works
            </Link>
            <Link
              href="#teachers"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              For Teachers
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4 bg-primary/10 text-primary" variant="secondary">
                🚀 AI-Powered Learning Platform
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Personalized &{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Interactive Learning
                </span>{" "}
                Powered by AI
              </h1>
              <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
                Paste a YouTube link or type any topic. Get AI-generated notes, quizzes,
                flashcards, and an AI tutor instantly. Learn smarter, not harder.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <Play className="mr-2 h-5 w-5" />
                    Start Learning Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="#features">
                    Explore Features
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>100% Free to Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Works on Any Device</span>
                </div>
              </div>
            </div>

            {/* Hero visual preview */}
            <div className="relative mx-auto mt-16 max-w-5xl">
              <div className="rounded-xl border border-border/50 bg-card/30 p-2 shadow-2xl backdrop-blur-sm">
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 flex items-center justify-center border border-border/30">
                  <div className="text-center p-8">
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
                      <Youtube className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Paste any YouTube URL and watch the magic happen</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">Notes</span>
                      <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500">Quiz</span>
                      <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-500">Flashcards</span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">AI Chat</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -left-4 top-1/4 hidden rounded-lg border border-border/50 bg-card p-3 shadow-lg lg:block">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">AI Tutor Ready</span>
                </div>
              </div>
              <div className="absolute -right-4 bottom-1/4 hidden rounded-lg border border-border/50 bg-card p-3 shadow-lg lg:block">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Auto-Generate Content</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="border-y border-border/40 bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                The Problem with Traditional Video Learning
              </h2>
              <p className="text-muted-foreground">
                Students spend hours watching educational videos but retain only a fraction.
                Why? Because passive watching isn't learning.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-red-500">90%</div>
                <p className="text-sm text-muted-foreground">
                  of video content is forgotten within a week without active recall
                </p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-red-500">3x</div>
                <p className="text-sm text-muted-foreground">
                  more time spent re-watching videos vs. structured learning
                </p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-red-500">65%</div>
                <p className="text-sm text-muted-foreground">
                  of students lack access to personalized tutoring support
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Features Section */}
        <section id="features" className="px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <Badge className="mb-4" variant="secondary">
                Features
              </Badge>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                Everything You Need to Learn Effectively
              </h2>
              <p className="text-muted-foreground">
                Four powerful features designed to transform passive watching into active learning
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Feature 1: YouTube Integration */}
              <FeatureCard
                icon={Youtube}
                title="YouTube Integration"
                description="Transform any YouTube video into a complete learning module with AI-powered tools."
                gradient="bg-gradient-to-br from-red-500 to-red-600"
                features={[
                  "Auto-generated transcripts with clickable timestamps",
                  "AI-structured notes with key points & definitions",
                  "Smart quiz generation with explanations",
                  "Flashcards for spaced repetition",
                  "Interactive simulations (HTML/CSS/JS)",
                  "AI Chat Tutor - ask questions anytime",
                ]}
              />

              {/* Feature 2: Personalized Capsules */}
              <FeatureCard
                icon={Sparkles}
                title="Personalized Capsule Generation"
                description="Type any topic and get a complete micro-course generated by AI, tailored to your learning needs."
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                features={[
                  "Complete course structure with modules",
                  "Interactive lessons with rich content",
                  "MCQ, fill-in-blanks, drag-and-drop exercises",
                  "Code examples with explanations",
                  "Progress tracking & completion badges",
                  "Learn any topic without finding videos",
                ]}
              />

              {/* Feature 3: Gamified Learning */}
              <FeatureCard
                icon={Gamepad2}
                title="Gamified Learning - Find Match"
                description="Compete with other students in real-time quiz battles. Learn together, win together."
                gradient="bg-gradient-to-br from-pink-500 to-pink-600"
                badge="Coming Soon"
                features={[
                  "Real-time multiplayer quiz battles",
                  "AI generates questions on-the-fly",
                  "Speed-based scoring system",
                  "Ranked matches with ELO ratings",
                  "Daily challenges & leaderboards",
                  "Challenge friends or find random matches",
                ]}
              />

              {/* Feature 4: Teacher Tools */}
              <FeatureCard
                icon={GraduationCap}
                title="Teacher Tools"
                description="Powerful AI-assisted tools for educators to create, assign, and grade effortlessly."
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                badge="Coming Soon"
                features={[
                  "AI Assignment Generator from any topic",
                  "Automatic grading with detailed feedback",
                  "Student weakness identification",
                  "Class progress dashboard",
                  "Share capsules & videos with students",
                  "Export reports for parents/admin",
                ]}
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="border-y border-border/40 bg-muted/30 px-4 py-20 sm:px-6 sm:py-32 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <Badge className="mb-4" variant="secondary">
                How It Works
              </Badge>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                Start Learning in 3 Simple Steps
              </h2>
              <p className="text-muted-foreground">
                No complicated setup. No learning curve. Just paste and learn.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
              <Step
                number={1}
                icon={Youtube}
                title="Paste a Link or Topic"
                description="Enter any YouTube URL or type a topic you want to learn. That's all you need to start."
              />
              <Step
                number={2}
                icon={Sparkles}
                title="AI Generates Everything"
                description="Our AI analyzes the content and creates notes, quizzes, flashcards, and more in seconds."
              />
              <Step
                number={3}
                icon={Trophy}
                title="Learn & Track Progress"
                description="Study with interactive tools, test your knowledge, and track your improvement over time."
              />
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Try It Now - It's Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* For Teachers Section */}
        <section id="teachers" className="px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge className="mb-4 bg-emerald-500/10 text-emerald-500" variant="secondary">
                  For Educators
                </Badge>
                <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                  Supercharge Your Teaching with AI
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Save hours on lesson planning, assignment creation, and grading. Let AI handle
                  the repetitive tasks while you focus on what matters - teaching.
                </p>

                <div className="space-y-4">
                  <TeacherToolCard
                    icon={FileText}
                    title="AI Assignment Generator"
                    description="Generate comprehensive assignments from any topic in seconds. Customize difficulty, question types, and length."
                  />
                  <TeacherToolCard
                    icon={ClipboardCheck}
                    title="Automatic Grading"
                    description="AI grades student submissions instantly with detailed feedback and explanations for wrong answers."
                  />
                  <TeacherToolCard
                    icon={AlertTriangle}
                    title="Weakness Identification"
                    description="Automatically identify areas where students struggle. Get recommendations for targeted interventions."
                  />
                  <TeacherToolCard
                    icon={LineChart}
                    title="Progress Analytics"
                    description="Track class and individual progress with visual dashboards. Export reports for parents and administrators."
                  />
                </div>

                <div className="mt-8">
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/dashboard">
                      <GraduationCap className="mr-2 h-5 w-5" />
                      Join as a Teacher
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Teacher Dashboard Preview */}
              <div className="relative">
                <div className="rounded-xl border border-border/50 bg-card/30 p-6 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Class Performance Overview</h3>
                    <Badge variant="secondary">Live</Badge>
                  </div>
                  
                  {/* Mock chart */}
                  <div className="mb-6 h-40 rounded-lg bg-gradient-to-t from-emerald-500/10 to-transparent border border-border/30 flex items-end justify-around p-4">
                    {[65, 78, 45, 89, 72, 56, 83].map((height, i) => (
                      <div
                        key={i}
                        className="w-8 rounded-t bg-emerald-500/60"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  {/* Mock student list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20" />
                        <span className="text-sm font-medium">Ram Sharma</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-emerald-500">89%</span>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-500/20" />
                        <span className="text-sm font-medium">Sita Thapa</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-yellow-500">72%</span>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-pink-500/20" />
                        <span className="text-sm font-medium">Hari Gurung</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-500">45%</span>
                        <span className="text-xs text-red-500">Needs Help</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification */}
                <div className="absolute -right-4 top-4 hidden rounded-lg border border-border/50 bg-card p-3 shadow-lg lg:block">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>3 assignments graded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border/40 bg-primary/5 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
              <Stat value="10K+" label="Active Learners" />
              <Stat value="50K+" label="Videos Processed" />
              <Stat value="1M+" label="Quizzes Generated" />
              <Stat value="95%" label="User Satisfaction" />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 px-8 py-16 text-center sm:px-16 sm:py-24">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHY2aDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              
              <div className="relative">
                <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                  Ready to Transform Your Learning?
                </h2>
                <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
                  Join thousands of students and teachers who are already learning smarter with
                  OpenNote. Start for free, no credit card required.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/dashboard">
                      <Zap className="mr-2 h-5 w-5" />
                      Get Started Free
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                    asChild
                  >
                    <Link href="#features">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">OpenNote</span>
              </Link>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                Transform any YouTube video into an interactive learning experience. AI-powered
                notes, quizzes, flashcards, and more. Learning made smarter.
              </p>
              <div className="mt-4 flex gap-4">
                <span className="text-sm text-muted-foreground">
                  Made with ❤️ for students in Nepal
                </span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-foreground">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#teachers" className="hover:text-foreground">
                    For Teachers
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} OpenNote. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}