import pymupdf as fitz
import uuid
from typing import List, Dict


def parse_pdf(file_bytes: bytes, filename: str) -> List[Dict]:
    """Parse PDF into list of {page, text} dicts using PyMuPDF"""
    pages = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            pages.append({"page": page_num + 1, "text": text})
    doc.close()
    return pages


def parse_text(file_bytes: bytes, filename: str) -> List[Dict]:
    """Parse text file into list of {page: 0, text} dicts"""
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1")
    return [{"page": 0, "text": text}]


def segment_text(pages: List[Dict], filename: str, approx_tokens_per_chunk: int = 800, overlap_tokens: int = 100) -> List[Dict]:
    """
    Segment text into chunks of ~800 tokens with 100-token overlap.
    Approximate token count as len(text.split()) * 1.3.
    Each segment: {id, source, page, text, preview}
    """
    segments = []

    # Combine all text with page tracking
    all_words = []
    for page_data in pages:
        words = page_data["text"].split()
        all_words.extend([(w, page_data["page"]) for w in words])

    if not all_words:
        return segments

    # Convert token counts to word counts
    words_per_chunk = int(approx_tokens_per_chunk / 1.3)
    overlap_words = int(overlap_tokens / 1.3)

    i = 0
    while i < len(all_words):
        chunk_words_with_pages = all_words[i: i + words_per_chunk]
        if not chunk_words_with_pages:
            break

        chunk_text = " ".join(w for w, _ in chunk_words_with_pages)
        # Use the page of the first word in chunk
        chunk_page = chunk_words_with_pages[0][1]

        if "libmupdf.dylib" in chunk_text or "Library not loaded" in chunk_text:
            continue
        segment = {
            "id": str(uuid.uuid4()),
            "source": filename,
            "page": chunk_page,
            "text": chunk_text,
            "preview": chunk_text[:100]
        }
        segments.append(segment)

        # Advance by chunk size minus overlap
        advance = words_per_chunk - overlap_words
        if advance <= 0:
            advance = words_per_chunk
        i += advance

    return segments


def ingest_files(files: List[Dict]) -> List[Dict]:
    """
    files: list of {filename, bytes, content_type}
    Returns list of all segments across all files.
    """
    all_segments = []

    for f in files:
        filename = f["filename"]
        file_bytes = f["bytes"]
        content_type = f.get("content_type", "")

        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            pages = parse_pdf(file_bytes, filename)
        else:
            pages = parse_text(file_bytes, filename)

        segments = segment_text(pages, filename)
        all_segments.extend(segments)

    return all_segments
