import chromadb
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
Settings.llm = None  # we never let llama_index call an LLM itself; we only use it for retrieval

CHROMA_PATH = "./chroma_db"

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client


def _collection_name(semester_number: int | None) -> str:
    # one collection per semester keeps retrieval scoped to the right syllabus
    return f"csit_sem_{semester_number}" if semester_number else "csit_general"


def get_retriever(semester_number: int | None = None, top_k: int = 4):
    """Return a llama_index retriever scoped to a given semester's notes."""
    client = _get_client()
    collection = client.get_or_create_collection(_collection_name(semester_number))
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_vector_store(vector_store, storage_context=storage_context)
    return index.as_retriever(similarity_top_k=top_k)


def get_index_for_ingestion(semester_number: int | None = None):
    """Return an empty/loadable index to add documents into (used by ingest.py)."""
    client = _get_client()
    collection = client.get_or_create_collection(_collection_name(semester_number))
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(vector_store, storage_context=storage_context), storage_context