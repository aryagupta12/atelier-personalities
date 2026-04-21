import os
from typing import Dict, List, Optional

from pinecone import Pinecone, ServerlessSpec


_pc = None
_index = None
_host = None


def pinecone_enabled() -> bool:
    return bool(os.environ.get("PINECONE_API_KEY") and os.environ.get("PINECONE_INDEX_NAME"))


def get_namespace() -> str:
    return os.environ.get("PINECONE_NAMESPACE", "segments")


def use_integrated_embedding() -> bool:
    return os.environ.get("PINECONE_USE_INTEGRATED_EMBEDDING", "true").lower() in {"1", "true", "yes", "on"}


def get_embed_model() -> str:
    return os.environ.get("PINECONE_EMBED_MODEL", "llama-text-embed-v2")


def get_text_field() -> str:
    return os.environ.get("PINECONE_TEXT_FIELD", "chunk_text")


def get_upsert_batch_size() -> int:
    return max(1, min(96, int(os.environ.get("PINECONE_UPSERT_BATCH_SIZE", "32"))))


def get_pinecone_client() -> Pinecone:
    global _pc
    if _pc is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY is not set")
        _pc = Pinecone(api_key=api_key)
    return _pc


def get_index_host(dimension: Optional[int] = None) -> str:
    global _host
    if _host:
        return _host

    host = os.environ.get("PINECONE_INDEX_HOST")
    if host:
        _host = host
        return _host

    index_name = os.environ.get("PINECONE_INDEX_NAME")
    if not index_name:
        raise ValueError("PINECONE_INDEX_NAME is not set")

    pc = get_pinecone_client()

    try:
        description = pc.describe_index(name=index_name)
        _host = description.host
        return _host
    except Exception:
        cloud = os.environ.get("PINECONE_CLOUD")
        region = os.environ.get("PINECONE_REGION")
        if not (dimension and cloud and region):
            raise

        if use_integrated_embedding():
            pc.create_index_for_model(
                name=index_name,
                cloud=cloud,
                region=region,
                embed={
                    "model": get_embed_model(),
                    "field_map": {"text": get_text_field()},
                    "metric": os.environ.get("PINECONE_METRIC", "cosine"),
                },
            )
        else:
            pc.create_index(
                name=index_name,
                dimension=dimension,
                metric=os.environ.get("PINECONE_METRIC", "cosine"),
                spec=ServerlessSpec(cloud=cloud, region=region),
                deletion_protection="disabled",
            )
        description = pc.describe_index(name=index_name)
        _host = description.host
        return _host


def get_index(dimension: Optional[int] = None):
    global _index
    if _index is None:
        pc = get_pinecone_client()
        _index = pc.Index(host=get_index_host(dimension=dimension))
    return _index


def upsert_segment_vectors(vectors: List[Dict], dimension: int) -> None:
    if not vectors:
        return

    index = get_index(dimension=dimension)
    index.upsert(vectors=vectors, namespace=get_namespace())


def upsert_segment_records(records: List[Dict]) -> None:
    if not records:
        return

    index = get_index()
    index.upsert_records(get_namespace(), records)


def query_segment_vectors(vector: List[float], top_k: int):
    index = get_index()
    return index.query(
        namespace=get_namespace(),
        vector=vector,
        top_k=top_k,
        include_metadata=True,
    )


def search_segment_records(query_text: str, top_k: int, fields: Optional[List[str]] = None):
    index = get_index()
    return index.search(
        namespace=get_namespace(),
        query={
            "inputs": {"text": query_text},
            "top_k": top_k,
        },
        fields=fields or [],
    )
