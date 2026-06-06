import { getDocumentPdfIframeUrl } from "../../api/client";
import type { DocumentListItem, ReviewProfileListItem } from "../../api/client";
import type { DocumentViewItem, ProfileListItem } from "../types";

export function mapProfileListItem(item: ReviewProfileListItem): ProfileListItem {
  return {
    id: item.id,
    name: item.name,
    dob: item.dob,
    gender: item.gender,
  };
}

export function mapDocumentToViewItem(doc: DocumentListItem): DocumentViewItem {
  const normalizedDocType = (doc.document_type || "").toLowerCase();
  const lowerName = doc.filename.toLowerCase();
  const isImageDocument =
    normalizedDocType.includes("image") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"].some((ext) => lowerName.endsWith(ext));

  return {
    id: doc.id,
    name: doc.filename,
    type: isImageDocument ? "image" : "pdf",
    url: isImageDocument ? (doc.s3_url || getDocumentPdfIframeUrl(doc.id)) : getDocumentPdfIframeUrl(doc.id),
    uploadDate: doc.created_at,
  };
}
