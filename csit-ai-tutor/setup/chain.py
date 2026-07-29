from typing import TypedDict, List

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

try:
    from .prompts import (
        subject_detect_prompt,
        solver_prompt,
        exam_prompt,
        practice_prompt,
    )
except ImportError:
    from prompts import (
        subject_detect_prompt,
        solver_prompt,
        exam_prompt,
        practice_prompt,
    )

try:
    from tutor.rag import get_retriever
except ImportError:
    from rag import get_retriever

load_dotenv()

llm = ChatGroq(model_name="llama-3.3-70b-versatile")

# rag.py also sets these, but keeping it here too makes chain.py safe to import standalone
Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
Settings.llm = None


class SubjectDetectOutput(TypedDict):
    subject: str
    topic: str
    problem_type: str
    difficulty_level: str


class ExamPatternOutput(TypedDict):
    commonly_appears: bool
    likely_years: List[int]
    marks: float
    exam_tip: str


class PracticeProblems(TypedDict):
    problem_one: str
    answer_one: str
    problem_two: str
    answer_two: str


detect_llm = llm.with_structured_output(SubjectDetectOutput)
exam_llm = llm.with_structured_output(ExamPatternOutput)
practice_llm = llm.with_structured_output(PracticeProblems)

detect_chain = subject_detect_prompt | detect_llm
solver_chain = solver_prompt | llm
exam_chain = exam_prompt | exam_llm
practice_chain = practice_prompt | practice_llm


def build_context(problem: str, semester_number: int | None, top_k: int = 4) -> str:
    """Retrieve the most relevant course-note chunks for this semester's collection."""
    retriever = get_retriever(semester_number, top_k=top_k)
    nodes = retriever.retrieve(problem)
    return "\n\n".join(n.text for n in nodes)