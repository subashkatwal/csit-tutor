"""
Quick manual test for the RAG retriever — run this before wiring RAG into the chat endpoint.

Usage:
    python test_rag.py --semester 7 --query "What is K-Means clustering?"
"""
import argparse

try:
    from tutor.rag import get_retriever
except ImportError:
    from rag import get_retriever


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--semester", type=int, required=True)
    parser.add_argument("--query", type=str, required=True)
    parser.add_argument("--top_k", type=int, default=4)
    args = parser.parse_args()

    retriever = get_retriever(args.semester, top_k=args.top_k)
    nodes = retriever.retrieve(args.query)

    if not nodes:
        print(f"No results found for semester {args.semester}. "
              f"Did you run ingest.py for this semester yet?")
        return

    print(f"Found {len(nodes)} relevant chunks:\n")
    for i, node in enumerate(nodes, start=1):
        print(f"--- Chunk {i} (score: {node.score:.4f}) ---")
        print(node.text[:500])
        print()


if __name__ == "__main__":
    main()