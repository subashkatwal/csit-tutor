"""
Ingest course notes into the vector store for a given semester.

Usage:
    python -m tutor.ingest --semester 7 --path ./notes/sem7

Put your PDFs / .txt / .md notes for each semester in their own folder, then run this
once (and again whenever you add new material). It's safe to re-run; documents are
just appended to the collection.
"""
import argparse
from pathlib import Path

from llama_index.core import SimpleDirectoryReader

try:
    from .rag import get_index_for_ingestion
except ImportError:
    from rag import get_index_for_ingestion


def ingest(semester_number: int, path: str) -> int:
    folder = Path(path)
    if not folder.exists():
        raise FileNotFoundError(f"No such folder: {folder}")

    documents = SimpleDirectoryReader(input_dir=str(folder), recursive=True).load_data()
    index, _ = get_index_for_ingestion(semester_number)

    for doc in documents:
        index.insert(doc)

    return len(documents)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest notes into the semester's vector store")
    parser.add_argument("--semester", type=int, required=True, help="Semester number, e.g. 7")
    parser.add_argument("--path", type=str, required=True, help="Folder containing notes for that semester")
    args = parser.parse_args()

    count = ingest(args.semester, args.path)
    print(f"Ingested {count} documents into semester {args.semester}'s collection.")