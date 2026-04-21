import os
import anthropic
import heapq
import numpy as np
import uuid
import json
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional

try:
    from .pinecone_store import pinecone_enabled, query_segment_vectors, upsert_segment_vectors
except ImportError:
    from pinecone_store import pinecone_enabled, query_segment_vectors, upsert_segment_vectors

_model = None
_client = None


def get_embedding_model():
    global _model
    if _model is None:
        model_name = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        device = os.environ.get("EMBEDDING_DEVICE", "cpu")
        _model = SentenceTransformer(model_name, device=device)
    return _model


def get_embedding_batch_size() -> int:
    return max(1, int(os.environ.get("EMBEDDING_BATCH_SIZE", "8")))


def get_embedding_dimension() -> int:
    configured = os.environ.get("EMBEDDING_DIMENSION")
    if configured:
        return int(configured)
    return int(get_embedding_model().get_sentence_embedding_dimension())


def normalize_embeddings_enabled() -> bool:
    return os.environ.get("EMBEDDING_NORMALIZE", "true").lower() in {"1", "true", "yes", "on"}


def encode_texts(texts: List[str]) -> np.ndarray:
    if not texts:
        return np.array([])

    model = get_embedding_model()
    return model.encode(
        texts,
        batch_size=get_embedding_batch_size(),
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=normalize_embeddings_enabled(),
    )


def index_segments_in_pinecone(segments: List[Dict]) -> bool:
    if not pinecone_enabled() or not segments:
        return False

    batch_size = get_embedding_batch_size()
    dimension = get_embedding_dimension()

    for start in range(0, len(segments), batch_size):
        batch = segments[start:start + batch_size]
        batch_texts = [seg.get("text", "")[:1024] for seg in batch]
        embeddings = encode_texts(batch_texts)

        vectors = []
        for seg, embedding in zip(batch, embeddings):
            vectors.append({
                "id": seg["id"],
                "values": embedding.tolist(),
                "metadata": {
                    "segment_id": seg["id"],
                    "source": str(seg.get("source", "")),
                    "page": int(seg.get("page", 0)),
                    "preview": str(seg.get("preview", ""))[:500],
                }
            })

        upsert_segment_vectors(vectors, dimension=dimension)

    return True


def get_anthropic_client():
    global _client
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. Put your key in backend/.env as: ANTHROPIC_API_KEY=your-key"
        )
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def extract_candidates(segments: List[Dict], supplemental_info: str = "") -> List[Dict]:
    """
    Call Claude to identify witness candidates from segments.
    """
    client = get_anthropic_client()

    # Concatenate segment texts (limit to avoid token limits)
    combined_text = ""
    for seg in segments[:40]:  # limit to first 40 segments
        combined_text += f"\n[Segment {seg['id']} | Source: {seg['source']} | Page: {seg['page']}]\n{seg['text']}\n"

    if supplemental_info:
        combined_text += f"\n\nSupplemental Information:\n{supplemental_info}\n"

    system_prompt = (
        "You are analyzing legal documents to identify witness candidates "
        "for cross-examination simulation. Extract all individuals who appear as witnesses, "
        "deponents, or key factual actors. For each, return a JSON array of objects with "
        "fields: name, role, organization, key_points (array of strings), "
        "evidence_segment_ids (array of segment ids where they appear), "
        "side (claimant/respondent/neutral/unknown)."
    )

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"Please analyze the following documents and extract witness candidates:\n\n{combined_text}"
            }
        ]
    )

    response_text = message.content[0].text

    # Extract JSON from response
    candidates = []
    try:
        # Try to find JSON array in the response
        start = response_text.find("[")
        end = response_text.rfind("]") + 1
        if start >= 0 and end > start:
            json_str = response_text[start:end]
            candidates = json.loads(json_str)
        else:
            # Try parsing the whole response as JSON
            candidates = json.loads(response_text)
    except (json.JSONDecodeError, ValueError):
        # Return empty list if parsing fails
        candidates = []

    return candidates


def rank_segments_by_relevance(candidate: Dict, segments: List[Dict], top_n: int = 18) -> List[Dict]:
    """
    Rank segments by cosine similarity to candidate key_points.
    """
    key_points = candidate.get("key_points", [])
    if not key_points:
        return segments[:top_n]

    kp_embeddings = encode_texts(key_points)
    mean_kp_embedding = np.mean(kp_embeddings, axis=0)

    if not segments:
        return []

    def cosine_sim(a, b):
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    segments_by_id = {seg["id"]: seg for seg in segments}

    if pinecone_enabled():
        try:
            query_top_k = min(len(segments), max(top_n * 3, top_n))
            result = query_segment_vectors(vector=mean_kp_embedding.tolist(), top_k=query_top_k)
            ranked = []
            seen = set()
            for match in getattr(result, "matches", []):
                metadata = getattr(match, "metadata", {}) or {}
                segment_id = getattr(match, "id", None)
                if not segment_id and isinstance(metadata, dict):
                    segment_id = metadata.get("segment_id")
                if segment_id in segments_by_id and segment_id not in seen:
                    ranked.append(segments_by_id[segment_id])
                    seen.add(segment_id)
                    if len(ranked) >= top_n:
                        return ranked

            if ranked:
                remaining = [seg for seg in segments if seg["id"] not in seen]
                return ranked + _rank_segments_locally(mean_kp_embedding, remaining, top_n - len(ranked), cosine_sim)
        except Exception:
            pass

    return _rank_segments_locally(mean_kp_embedding, segments, top_n, cosine_sim)


def _rank_segments_locally(mean_kp_embedding: np.ndarray, segments: List[Dict], top_n: int, cosine_sim) -> List[Dict]:
    if top_n <= 0 or not segments:
        return []

    heap = []
    batch_size = get_embedding_batch_size()

    for start in range(0, len(segments), batch_size):
        batch = segments[start:start + batch_size]
        batch_texts = [seg.get("text", "")[:512] for seg in batch]
        batch_embeddings = encode_texts(batch_texts)

        for seg, embedding in zip(batch, batch_embeddings):
            sim = cosine_sim(mean_kp_embedding, embedding)
            item = (sim, seg["id"], seg)
            if len(heap) < top_n:
                heapq.heappush(heap, item)
            else:
                heapq.heappushpop(heap, item)

    heap.sort(key=lambda item: item[0], reverse=True)
    return [seg for _, _, seg in heap]


def build_persona(candidate: Dict, support_segments: List[Dict], supplemental_info: str = "", mode: str = "cross_examination") -> Dict:
    """
    Build a detailed witness persona using Claude.
    """
    client = get_anthropic_client()

    # Select top 18 segments by relevance
    top_segments = rank_segments_by_relevance(candidate, support_segments, top_n=18)

    # Build context from segments
    segments_context = ""
    for seg in top_segments:
        segments_context += f"\n[Segment ID: {seg['id']} | Source: {seg['source']} | Page: {seg['page']}]\n{seg['text']}\n"

    if supplemental_info:
        segments_context += f"\n\nSupplemental Information:\n{supplemental_info}\n"

    candidate_info = json.dumps({
        "name": candidate.get("name", "Unknown"),
        "role": candidate.get("role", "Unknown"),
        "organization": candidate.get("organization", "Unknown"),
        "key_points": candidate.get("key_points", []),
        "side": candidate.get("side", "unknown")
    }, indent=2)

    system_prompt = (
        "Build a witness persona from evidence only. Every factual claim "
        "must cite segment IDs. Return JSON with fields: name, role, organization, "
        "background (string), key_points (array), statement (2-3 paragraph narrative summary), "
        "claims (array of {facet, text, confidence 0-1, support_segment_ids}), "
        "known_facts (string), hidden_facts (string), "
        "sensitive_topics (array of {topic: string, sensitivity: float 0-1, basis: string})."
    )

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Build a detailed witness persona for the following candidate:\n\n"
                    f"Candidate Information:\n{candidate_info}\n\n"
                    f"Mode: {mode}\n\n"
                    f"Supporting Evidence Segments:\n{segments_context}"
                )
            }
        ]
    )

    response_text = message.content[0].text

    # Extract JSON from response
    persona = {}
    try:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = response_text[start:end]
            persona = json.loads(json_str)
        else:
            persona = json.loads(response_text)
    except (json.JSONDecodeError, ValueError):
        # Build a minimal persona if parsing fails
        persona = {
            "name": candidate.get("name", "Unknown"),
            "role": candidate.get("role", "Unknown"),
            "organization": candidate.get("organization", "Unknown"),
            "background": "Information extracted from documents.",
            "key_points": candidate.get("key_points", []),
            "statement": response_text[:500],
            "claims": [],
            "known_facts": "",
            "hidden_facts": "",
            "sensitive_topics": []
        }

    # Add persona_id
    persona["persona_id"] = str(uuid.uuid4())
    persona["mode"] = mode

    return persona
