"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users,
  BarChart,
  Layers,
  Bot,
  FileText,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const features = [
    {
      title: "AI-Powered Cleaning",
      description: "Advanced AI automatically detects and fixes data errors, validates formats, and suggests improvements.",
      icon: <Bot className="size-5" />,
    },
    {
      title: "Multi-Format Support",
      description: "Upload CSV, Excel, or other spreadsheet formats. We handle the parsing and conversion automatically.",
      icon: <FileText className="size-5" />,
    },
    {
      title: "Smart Validation",
      description: "Real-time validation with detailed error reports, severity levels, and actionable suggestions.",
      icon: <Shield className="size-5" />,
    },
    {
      title: "Resource Allocation",
      description: "Create complex rules for client-worker-task allocation with priority-based optimization.",
      icon: <Users className="size-5" />,
    },
    {
      title: "Natural Language Queries",
      description: "Search your data using plain English. Ask questions like 'Show me high priority tasks in Phase 2'.",
      icon: <TrendingUp className="size-5" />,
    },
    {
      title: "Instant Export",
      description: "Export cleaned data in multiple formats with comprehensive rule configurations.",
      icon: <Zap className="size-5" />,
    },
  ]

  return (
    <div className="flex min-h-[100dvh] flex-col ml-4 md:ml-8 lg:ml-12">
      <header
      className={`sticky top-0 z-50 w-full backdrop-blur-lg transition-all duration-300 ${isScrolled ? "bg-background/80 shadow-sm" : "bg-transparent"}`}
      >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
        <div className="size-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
          <Bot className="size-5" />
        </div>
        <span>Data Alchemist</span>
        </div>
        <nav className="hidden md:flex gap-8">
        <Link
          href="#features"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Features
        </Link>
        <Link
          href="#how-it-works"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          How It Works
        </Link>
        </nav>
        <div className="hidden md:flex gap-4 items-center">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          {mounted && theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Link href="/dashboard">
          <Button className="rounded-full">
          Dashboard
          <ChevronRight className="ml-1 size-4" />
          </Button>
        </Link>
        </div>
        <div className="flex items-center gap-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          {mounted && theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="md:hidden absolute top-16 inset-x-0 bg-background/95 backdrop-blur-lg border-b"
        >
        <div className="container py-4 flex flex-col gap-4">
          <Link href="#features" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
          Features
          </Link>
          <Link href="#how-it-works" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
          How It Works
          </Link>
          <div className="flex flex-col gap-2 pt-2 border-t">
          <Link href="/dashboard">
            <Button className="rounded-full">
            Dashboard
            <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
          </div>
        </div>
        </motion.div>
      )}
      </header>
      <main className="flex-1">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 lg:py-40 overflow-hidden">
        <div className="container px-4 md:px-6 relative">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
          <Zap className="h-3 w-3 mr-1" />
          AI-Powered Data Cleaning
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          Turn Spreadsheet Chaos into Clarity
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Upload messy CSV files, let AI clean and validate your data, create smart allocation rules, and export
          perfect datasets. No technical skills required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full h-12 px-8 text-base">
            Start Cleaning Data
            <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
         
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto max-w-5xl"
        >
          <div className="rounded-xl overflow-hidden shadow-2xl border border-border/40 bg-gradient-to-b from-background to-muted/20">
          <div className="bg-white/10 dark:bg-black/10 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-dashed border-2 border-black dark:border-white">
              <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-black dark:text-white" />
              <p className="text-sm font-medium">Upload CSV/Excel</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-black dark:border-white">
              <CardContent className="p-4 text-center">
              <Bot className="h-8 w-8 mx-auto mb-2 text-black dark:text-white" />
              <p className="text-sm font-medium">AI Cleans Data</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-black dark:border-white">
              <CardContent className="p-4 text-center">
              <Check className="h-8 w-8 mx-auto mb-2 text-black dark:text-white" />
              <p className="text-sm font-medium">Export Clean Data</p>
              </CardContent>
            </Card>
            </div>
          </div>
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
          </div>
          <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] rounded-full bg-black/10 dark:bg-white/10 blur-3xl opacity-30"></div>
          <div className="absolute -top-6 -left-6 -z-10 h-[300px] w-[300px] rounded-full bg-black/10 dark:bg-white/10 blur-3xl opacity-30"></div>
        </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-10 md:py-12">
        <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
        >
          <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
          Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything You Need to Succeed</h2>
          <p className="max-w-[800px] text-muted-foreground md:text-lg">
          Our comprehensive platform provides all the tools you need to streamline your data workflow, boost
          productivity, and achieve your goals.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mx-auto max-w-6xl"
        >
          {features.map((feature, i) => (
          <motion.div key={i} variants={item}>                    <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-md">
              <CardContent className="p-6 flex flex-col h-full">
              <div className="size-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-black dark:text-white mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
          ))}
        </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

        <div className="container px-4 md:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
        >
          <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
          How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple Process, Powerful Results</h2>
          <p className="max-w-[800px] text-muted-foreground md:text-lg">
          Get started in minutes and see the difference our platform can make for your data.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative max-w-4xl mx-auto">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0"></div>

          {[
          {
            step: "01",
            title: "Upload Your Data",
            description: "Drop your messy CSV or Excel files into our platform. We support all common data formats.",
          },
          {
            step: "02",
            title: "AI Cleans & Validates",
            description: "Our AI automatically detects errors, standardizes formats, and suggests improvements.",
          },
          {
            step: "03",
            title: "Export Perfect Data",
            description: "Download your cleaned data with custom allocation rules and comprehensive reporting.",
          },
          ].map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative z-10 flex flex-col items-center text-center space-y-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black text-xl font-bold shadow-lg">
            {step.step}
            </div>
            <h3 className="text-xl font-bold">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </motion.div>
          ))}
        </div>
        </div>
      </section>
       </main>
    </div>
  )
}
