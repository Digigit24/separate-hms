// src/components/ServerPagination.tsx
// Server-side pagination with inline + floating behavior.
// When the inline pagination is scrolled off-screen, a floating pill appears.

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ServerPaginationProps {
  /** current page number */
  currentPage: number;
  /** total number of items */
  totalCount: number;
  /** number of items on the current page */
  pageSize: number;
  /** whether there is a next page */
  hasNext: boolean;
  /** whether there is a previous page */
  hasPrevious: boolean;
  /** go to previous page */
  onPrevious: () => void;
  /** go to next page */
  onNext: () => void;
  /** label for items, e.g. "patient(s)" */
  itemLabel: string;
}

export function ServerPagination({
  currentPage,
  totalCount,
  pageSize,
  hasNext,
  hasPrevious,
  onPrevious,
  onNext,
  itemLabel,
}: ServerPaginationProps) {
  const [showFloating, setShowFloating] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const inlineRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloating(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const showPagination = hasNext || hasPrevious;

  return (
    <>
      {/* Inline pagination */}
      <div ref={inlineRef} className="flex items-center justify-between px-6 py-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {pageSize} of {totalCount} {itemLabel}
        </p>
        {showPagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={onPrevious}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Floating pagination */}
      {showFloating && showPagination && (
        <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={!hasPrevious}
              onClick={onPrevious}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={!hasNext}
              onClick={onNext}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
