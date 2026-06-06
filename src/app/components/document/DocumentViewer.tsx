import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut } from "lucide-react";
import { fetchDocumentPdf } from "../../../api/client";
import type { DocumentViewItem } from "../../types";
import Button from "../common/Button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface DocumentViewerProps {
  documents: DocumentViewItem[];
  selectedDocumentId?: string;
  onSelectDocument: (documentId: string) => void;
}

const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function DocumentViewer({ documents, selectedDocumentId, onSelectDocument }: DocumentViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) ?? documents[0],
    [documents, selectedDocumentId],
  );
  const useIframeFallback = Boolean(pdfLoadError || pdfRenderError);

  const switchToIframeFallback = (reason: string) => {
    setPdfRenderError(reason);
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  useEffect(() => {
    if (selectedDocument?.type !== "pdf" || !selectedDocument.id) {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfLoadError(null);
      setPdfRenderError(null);
      return;
    }
    let cancelled = false;
    let blobUrl: string | null = null;
    setPdfLoadError(null);
    setPdfRenderError(null);
    fetchDocumentPdf(selectedDocument.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          // Keep direct URL fallback active when blob fetch fails.
          setPdfLoadError(err instanceof Error ? err.message : "Failed to load PDF");
          setPdfRenderError(null);
          setPdfBlobUrl(null);
        }
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [selectedDocument?.id, selectedDocument?.type]);

  const updateZoom = (nextZoom: number) => {
    const clamped = Math.min(2, Math.max(0.5, nextZoom));
    setZoom(clamped);
  };

  const handleImageMouseDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - imageOffset.x, y: clientY - imageOffset.y });
  };

  const handleImageMouseMove = (clientX: number, clientY: number) => {
    if (!isDragging || zoom <= 1) {
      return;
    }
    setImageOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleDocumentChange = (newId: string) => {
    onSelectDocument(newId);
    setZoom(1);
    setCurrentPage(1);
    setTotalPages(1);
    setImageOffset({ x: 0, y: 0 });
  };

  if (!selectedDocument) {
    return (
      <div className="h-full rounded-md border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
        No document available.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 p-3">
        <select
          value={selectedDocument.id}
          onChange={(event) => handleDocumentChange(event.target.value)}
          aria-label="Select document"
          className="flex-1 rounded-sm border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900"
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        <Button
          onClick={() => updateZoom(zoom - 0.25)}
          aria-label="Zoom out"
          className="inline-flex items-center gap-1 px-3"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-14 text-center text-xs text-gray-700">{Math.round(zoom * 100)}%</span>
        <Button onClick={() => updateZoom(zoom + 0.25)} aria-label="Zoom in" className="inline-flex items-center gap-1 px-3">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {selectedDocument.type === "pdf" ? (
        <div className="flex h-full flex-col overflow-hidden">
          {useIframeFallback ? (
            <div className="border-b border-gray-200 p-3 text-xs text-amber-700">
              PDF preview switched to browser viewer because the in-app renderer failed.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 border-b border-gray-200 p-3">
              <Button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>
                Next
              </Button>
              <select
                aria-label="Select zoom level"
                value={zoom}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                {zoomLevels.map((value) => (
                  <option key={value} value={value}>
                    {Math.round(value * 100)}%
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            {useIframeFallback ? (
              <iframe
                title={selectedDocument.name}
                src={selectedDocument.url}
                className="h-full w-full rounded-sm border border-gray-200 bg-white"
              />
            ) : pdfBlobUrl ? (
              <Document
                file={pdfBlobUrl}
                loading={<p className="text-sm text-gray-600">Loading PDF...</p>}
                error={<p className="text-sm text-red-500">Unable to load PDF preview.</p>}
                onLoadError={(error) => {
                  switchToIframeFallback(error instanceof Error ? error.message : "Failed to render PDF");
                }}
                onSourceError={(error) => {
                  switchToIframeFallback(error instanceof Error ? error.message : "Failed to read PDF source");
                }}
                onLoadSuccess={({ numPages }) => {
                  setTotalPages(numPages);
                  setCurrentPage(1);
                }}
              >
                <Page pageNumber={currentPage} scale={zoom} width={640} />
              </Document>
            ) : (
              <p className="text-sm text-gray-600">Loading PDF...</p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-center gap-2 border-b border-gray-200 p-3">
            <Button onClick={() => updateZoom(1)}>Fit</Button>
            <Button onClick={() => setImageOffset({ x: 0, y: 0 })}>Reset Pan</Button>
            <select
              aria-label="Select zoom level"
              value={zoom}
              onChange={(event) => updateZoom(Number(event.target.value))}
              className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
            >
              {zoomLevels.map((value) => (
                <option key={value} value={value}>
                  {Math.round(value * 100)}%
                </option>
              ))}
            </select>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-100"
            onMouseMove={(event) => handleImageMouseMove(event.clientX, event.clientY)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <img
              src={selectedDocument.url}
              alt={selectedDocument.name}
              onMouseDown={(event) => handleImageMouseDown(event.clientX, event.clientY)}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform"
              style={{
                transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
