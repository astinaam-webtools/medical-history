import { useState, useRef, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source - using local worker file for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image';
}

const DocumentViewer = ({ isOpen, onClose, fileUrl, fileName, fileType }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load PDF document
  useEffect(() => {
    if (!isOpen || fileType !== 'pdf' || !fileUrl) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        // Fetch PDF with credentials/token since it's a protected endpoint
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        
        // Load PDF from array buffer
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        if (cancelled) return;
        
        setPdfDocument(pdf);
        setPdfTotalPages(pdf.numPages);
        setPdfPage(1);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF. The file may be corrupted or inaccessible.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fileUrl, fileType]);

  // Render current PDF page
  useEffect(() => {
    if (!pdfDocument || fileType !== 'pdf') return;

    let cancelled = false;
    setIsLoading(true);

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(pdfPage);
        
        if (cancelled) return;

        // Calculate scale for good quality rendering
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || 800;
        const containerHeight = containerRef.current?.clientHeight || 600;
        
        // Scale to fit container while maintaining aspect ratio
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const baseScale = Math.min(scaleX, scaleY) * 0.9; // 90% to have some padding
        
        // Use higher resolution for quality (2x for retina displays)
        const renderScale = baseScale * 2;
        const scaledViewport = page.getViewport({ scale: renderScale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).promise;

        if (cancelled) return;

        // Convert canvas to image URL
        const imageUrl = canvas.toDataURL('image/png');
        setPageImageUrl(imageUrl);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to render PDF page:', err);
        setError('Failed to render page.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pdfPage, fileType]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setPdfPage(1);
      setError(null);
      setPageImageUrl(null);
      setPdfDocument(null);
    }
  }, [isOpen, fileUrl]);

  // Cleanup PDF document on close
  useEffect(() => {
    if (!isOpen && pdfDocument) {
      pdfDocument.destroy();
      setPdfDocument(null);
    }
  }, [isOpen, pdfDocument]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'ArrowLeft':
          if (fileType === 'pdf' && pdfPage > 1) {
            setPdfPage(p => p - 1);
          }
          break;
        case 'ArrowRight':
          if (fileType === 'pdf' && pdfPage < pdfTotalPages) {
            setPdfPage(p => p + 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose, fileType, pdfPage, pdfTotalPages]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(0.25, prev + delta), 5));
    }
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Pinch-to-zoom for mobile
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

  const handleTouchMoveZoom = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastPinchDistance !== null) {
        const delta = (distance - lastPinchDistance) * 0.01;
        setZoom(prev => Math.min(Math.max(0.25, prev + delta), 5));
      }
      setLastPinchDistance(distance);
    } else {
      handleTouchMove(e);
    }
  };

  const handleTouchEndZoom = () => {
    setLastPinchDistance(null);
    handleTouchEnd();
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    // Open in new tab for download
    window.open(fileUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isFullscreen ? '' : 'p-2 sm:p-4'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-gray-900 rounded-lg shadow-2xl flex flex-col ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full h-full max-w-6xl max-h-[95vh] sm:max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700">
          <h3 className="text-white font-medium truncate max-w-[150px] sm:max-w-md text-sm sm:text-base">
            {fileName}
          </h3>
          
          {/* Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Zoom controls */}
            <div className="flex items-center bg-gray-800 rounded-lg px-1 sm:px-2">
              <button
                onClick={handleZoomOut}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Zoom Out (-)"
              >
                <MagnifyingGlassMinusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-gray-300 text-xs sm:text-sm min-w-[3rem] sm:min-w-[4rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Zoom In (+)"
              >
                <MagnifyingGlassPlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Download"
            >
              <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Fullscreen toggle - hide on mobile since it's already near-fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:block p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <XMarkIcon className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-gray-800"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMoveZoom}
          onTouchEnd={handleTouchEndZoom}
          style={{ 
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none' // Prevent browser handling of touch events
          }}
        >
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
                <p className="text-gray-400 mt-3 text-sm">Loading document...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary"
                >
                  Download Instead
                </button>
              </div>
            </div>
          )}

          {/* Document content */}
          {!error && (
            <div
              ref={contentRef}
              className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              {fileType === 'pdf' ? (
                // Render PDF as image (from canvas)
                pageImageUrl ? (
                  <img
                    src={pageImageUrl}
                    alt={`${fileName} - Page ${pdfPage}`}
                    className="max-w-full max-h-full object-contain select-none"
                    draggable={false}
                  />
                ) : null
              ) : (
                // Render image directly
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                  onLoad={() => setIsLoading(false)}
                  onError={() => setError('Failed to load image.')}
                />
              )}
            </div>
          )}
        </div>

        {/* PDF Page Controls */}
        {fileType === 'pdf' && pdfTotalPages > 1 && (
          <div className="flex items-center justify-center px-4 py-2 border-t border-gray-700 bg-gray-900">
            <button
              onClick={() => setPdfPage(p => Math.max(1, p - 1))}
              disabled={pdfPage <= 1 || isLoading}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-gray-300 text-sm mx-4">
              Page {pdfPage} of {pdfTotalPages}
            </span>
            <button
              onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p + 1))}
              disabled={pdfPage >= pdfTotalPages || isLoading}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Instructions - hide on mobile for cleaner UI */}
        <div className="hidden sm:block absolute bottom-4 left-4 text-xs text-gray-500">
          {zoom > 1 ? 'Drag to pan • ' : ''}Ctrl+Scroll to zoom • Pinch to zoom on mobile • Press Esc to close
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
