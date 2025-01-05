"use client";

import { useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { useAppContext } from "@/app/context/appContext";
import { pdfService } from "@/utils/services/pdfService";
import PDFAnalysisTools from "./pdfAnalysisTools";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: string | null;
  onTextExtracted: (text: string) => void;
  onOutlineExtracted: (outline: any[]) => void;
}

export default function PDFViewer({
  file,
  onTextExtracted,
  onOutlineExtracted,
}: PDFViewerProps) {
  const { state } = useAppContext();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPDF = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);
      return pdfUrl;
    } catch (error) {
      throw error;
    }
  }, []);

  const extractPDFContent = async (pdfDoc: any, numPages: number) => {
    const MAX_PAGES_PER_BATCH = 10;
    let fullText = "";

    try {
      for (
        let batchStart = 1;
        batchStart <= numPages;
        batchStart += MAX_PAGES_PER_BATCH
      ) {
        const batchEnd = Math.min(
          batchStart + MAX_PAGES_PER_BATCH - 1,
          numPages
        );

        const batchPromises = [];
        for (let i = batchStart; i <= batchEnd; i++) {
          batchPromises.push(
            pdfDoc.getPage(i).then(async (page: any) => {
              try {
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .filter((item: any) => typeof item.str === 'string' && item.str.trim() !== '')
                  .map((item: any) => item.str.trim())
                  .join(' ');
                
                if (pageText.length === 0) {
                  console.warn(`No text content found on page ${i}`);
                }
                
                return pageText;
              } catch (error) {
                console.error(`Error extracting text from page ${i}:`, error);
                return "";
              }
            })
          );
        }

        const batchTexts = await Promise.all(batchPromises);
        const validTexts = batchTexts.filter(text => text.length > 0);
        
        if (validTexts.length > 0) {
          fullText += (fullText ? "\n\n" : "") + validTexts.join("\n\n");
        }

        if (batchEnd < numPages) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Only throw if no text was extracted from any page
      if (!fullText || fullText.trim().length === 0) {
        throw new Error("No text could be extracted from the PDF");
      }

      return fullText;
    } catch (error) {
      throw error;
    }
  };

  const onDocumentLoadSuccess = useCallback(
    async ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
      setError(null);

      if (!file || !state.currentPDFConversation?.id || !state.user?.id) return;

      try {
        await pdfService.saveExtractedContent(
          state.currentPDFConversation.id,
          {
            content: "",
            metadata: {
              pageCount: numPages,
              status: "processing",
            },
          },
          state.user.id
        );

        const loadingTask = pdfjs.getDocument({
          url: file,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/",
          cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        const metadata = await pdfDoc.getMetadata().catch(() => null);
        const metadataInfo = metadata?.info || {};

        const fullText = await extractPDFContent(pdfDoc, numPages);
        
        // Validate extracted text
        if (!fullText || fullText.trim().length === 0) {
          throw new Error("No text could be extracted from the PDF");
        }

        // Update UI first
        onTextExtracted(fullText);

        // Then save to database
        const savedContent = await pdfService.saveExtractedContent(
          state.currentPDFConversation.id,
          {
            content: fullText,
            metadata: {
              ...metadataInfo,
              pageCount: numPages,
              status: "complete",
            },
          },
          state.user.id
        );

        if (!savedContent) {
          throw new Error("Failed to save extracted content");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error processing PDF";
        setError(errorMessage);
        setLoading(false);

        await pdfService
          .saveExtractedContent(
            state.currentPDFConversation.id,
            {
              content: "",
              metadata: {
                pageCount: numPages,
                status: "error",
                error: errorMessage,
              },
            },
            state.user.id
          )
          .catch(() => {});
      }
    },
    [file, state.currentPDFConversation?.id, state.user?.id, onTextExtracted]
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    setError("Failed to load PDF. Please try again.");
    setLoading(false);
  }, []);

  useEffect(() => {
    let pdfUrl: string | null = null;

    const loadPDFFile = async () => {
      setPageNumber(1);
      setLoading(true);
      setError(null);

      if (!file) {
        setLoading(false);
        return;
      }

      try {
        pdfUrl = await loadPDF(file);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load PDF");
        setLoading(false);
      }
    };

    loadPDFFile();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, loadPDF]);

  if (!file) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-4 text-center'>
        <div className='mb-4'>
          <FileText className='w-12 h-12 text-muted-foreground' />
        </div>
        <h3 className='text-lg font-medium'>No PDF Selected</h3>
        <p className='text-sm text-muted-foreground'>
          Select a conversation or start a new chat to view PDF
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-4 text-center'>
        <div className='mb-4 text-destructive'>
          <FileText className='w-12 h-12' />
        </div>
        <h3 className='text-lg font-medium text-destructive'>
          Error Loading PDF
        </h3>
        <p className='text-sm text-muted-foreground'>{error}</p>
        <Button className='mt-4' onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className='relative flex flex-col h-full'>
      {/* PDF Controls */}
      <div className='flex items-center justify-between p-4 border-b'>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
          >
            <ZoomOut className='h-4 w-4' />
          </Button>
          <span className='text-sm'>{Math.round(scale * 100)}%</span>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
          >
            <ZoomIn className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm'>
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant='outline'
            size='icon'
            onClick={() =>
              setPageNumber((prev) => Math.min(numPages, prev + 1))
            }
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-auto'>
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-background/80'>
            <Loader2 className='h-8 w-8 animate-spin' />
            <span className='ml-2'>Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='text-center text-destructive'>
              <FileText className='h-8 w-8 mx-auto mb-2' />
              <p>{error}</p>
            </div>
          </div>
        )}

        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className='flex items-center justify-center p-4'>
                <Loader2 className='h-6 w-6 animate-spin' />
                <span className='ml-2'>Loading PDF...</span>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className='flex items-center justify-center p-4'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}
