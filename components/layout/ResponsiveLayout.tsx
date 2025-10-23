'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkipNavigation } from '@/components/accessibility/SkipNavigation'
import { cn } from '@/lib/utils'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  className?: string
}

export function ResponsiveLayout({ children, sidebar, className }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setSidebarOpen(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <SkipNavigation />
      
      {/* Mobile header */}
      {isMobile && sidebar && (
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 p-0"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-primary">GetReference</h1>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        {sidebar && (
          <aside 
            className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0"
            aria-label="Main navigation"
          >
            {sidebar}
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {sidebar && sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside 
              id="mobile-sidebar"
              className="fixed left-0 top-0 z-50 h-full w-64 bg-background border-r"
              aria-label="Main navigation"
            >
              <div className="flex h-16 items-center justify-between px-4 border-b">
                <h1 className="text-lg font-semibold text-primary">GetReference</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="h-9 w-9 p-0"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sidebar}
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main 
          id="main-content"
          className={cn(
            "flex-1 overflow-x-hidden focus:outline-none",
            sidebar && "md:ml-64"
          )}
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}