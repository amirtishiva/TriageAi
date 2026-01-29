"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  activeSection?: string
  onItemClick?: (url: string) => void
}

export function NavBar({ items, className, activeSection, onItemClick }: NavBarProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Determine active tab - use activeSection if provided, otherwise first item
  const activeTab = activeSection 
    ? items.find(item => item.url === activeSection)?.name || items[0]?.name
    : items[0]?.name

  const handleClick = (item: NavItem) => {
    onItemClick?.(item.url)
  }

  return (
    <div className={cn("relative z-10", className)}>
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-lg border border-border/50 rounded-full px-2 py-1.5 shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <button
              key={item.name}
              onClick={() => handleClick(item)}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-all duration-300",
                "text-muted-foreground hover:text-foreground",
                isActive && "text-primary"
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon className="h-4 w-4" />
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="tubelight-indicator"
                  className="absolute inset-0 -z-10 rounded-full"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md" />
                  {/* Main background */}
                  <div className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-full backdrop-blur-sm" />
                  {/* Top highlight */}
                  <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
