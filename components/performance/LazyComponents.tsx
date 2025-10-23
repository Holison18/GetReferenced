'use client'

import { lazy, Suspense, ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Lazy loading utilities for performance optimization
 */

// Loading skeletons for different component types
export const LoadingSkeletons = {
  Dashboard: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  ),

  Table: () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  ),

  Form: () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  ),

  Card: () => (
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),

  Chart: () => (
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Higher-order component for lazy loading with custom loading state
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent: ComponentType = LoadingSkeletons.Card
) {
  const LazyComponent = lazy(importFn)

  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Intersection Observer hook for lazy loading on scroll
 */
import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [options])

  return [ref, isIntersecting]
}

/**
 * Lazy loading container component
 */
interface LazyContainerProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  height?: string | number
  className?: string
  once?: boolean // Only load once when visible
}

export function LazyContainer({
  children,
  fallback = <LoadingSkeletons.Card />,
  height = 'auto',
  className = '',
  once = true
}: LazyContainerProps) {
  const [ref, isIntersecting] = useIntersectionObserver()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (isIntersecting && !hasLoaded) {
      setHasLoaded(true)
    }
  }, [isIntersecting, hasLoaded])

  const shouldRender = once ? hasLoaded : isIntersecting

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
    >
      {shouldRender ? children : fallback}
    </div>
  )
}

/**
 * Lazy image component with progressive loading
 */
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  onLoad,
  onError
}: LazyImageProps) {
  const [ref, isIntersecting] = useIntersectionObserver()
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState(placeholder)

  useEffect(() => {
    if (isIntersecting && !isLoaded && !hasError) {
      const img = new Image()
      
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
        onLoad?.()
      }
      
      img.onerror = () => {
        setHasError(true)
        onError?.()
      }
      
      img.src = src
    }
  }, [isIntersecting, isLoaded, hasError, src, onLoad, onError])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-50'
        }`}
        loading="lazy"
      />
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          Failed to load image
        </div>
      )}
    </div>
  )
}

/**
 * Virtual scrolling component for large lists
 */
interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Lazy loaded chart component
 */
export const LazyChart = withLazyLoading(
  () => import('@/components/ui/chart'),
  LoadingSkeletons.Chart
)

/**
 * Lazy loaded data table component
 */
export const LazyDataTable = withLazyLoading(
  () => import('@/components/ui/data-table'),
  LoadingSkeletons.Table
)

/**
 * Performance-optimized list component
 */
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  loadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  className?: string
  itemClassName?: string
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  loadMore,
  hasMore = false,
  loading = false,
  className = '',
  itemClassName = ''
}: OptimizedListProps<T>) {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (isIntersecting && hasMore && !loading && loadMore) {
      loadMore()
    }
  }, [isIntersecting, hasMore, loading, loadMore])

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {hasMore && (
        <div ref={ref} className="py-4 text-center">
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span>Loading more...</span>
            </div>
          ) : (
            <span className="text-gray-500">Scroll to load more</span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Code splitting utility for route-based lazy loading
 */
export const LazyRoutes = {
  StudentDashboard: lazy(() => import('@/app/student/dashboard/page')),
  LecturerDashboard: lazy(() => import('@/app/lecturer/dashboard/page')),
  AdminDashboard: lazy(() => import('@/app/admin/dashboard/page')),
  RequestForm: lazy(() => import('@/components/student/RequestForm')),
  LetterEditor: lazy(() => import('@/components/lecturer/LetterEditor')),
  PaymentForm: lazy(() => import('@/components/payments/PaymentForm'))
}

/**
 * Preload utility for critical components
 */
export const preloadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  // Preload the component
  importFn()
}

// Preload critical components on idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Preload commonly used components
    preloadComponent(() => import('@/components/ui/button'))
    preloadComponent(() => import('@/components/ui/input'))
    preloadComponent(() => import('@/components/ui/card'))
  })
}