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


def query_segment_vectors(vector: List[float], top_k: int):
    index = get_index()
    return index.query(
        namespace=get_namespace(),
        vector=vector,
        top_k=top_k,
        include_metadata=True,
    )
