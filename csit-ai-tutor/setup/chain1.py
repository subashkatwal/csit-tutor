# from typing import TypedDict, List
# from langchain_groq import ChatGroq
# from dotenv import load_dotenv

# try:
#     from .prompts3 import (
#         subject_detect_prompt,
#         solver_prompt,
#         exam_prompt,
#         practice_prompt,
#     )
# except ImportError:
#     try:
#         from prompts3 import (
#             subject_detect_prompt,
#             solver_prompt,
#             exam_prompt,
#             practice_prompt,
#         )
#     except ImportError:
#         try:
#             from .prompts2 import (
#                 subject_detect_prompt,
#                 solver_prompt,
#                 exam_prompt,
#                 practice_prompt,
#             )
#         except ImportError:
#             from prompts2 import (
#                 subject_detect_prompt,
#                 solver_prompt,
#                 exam_prompt,
#                 practice_prompt,
#             )


# load_dotenv()
# llm = ChatGroq(model_name="llama-3.3-70b-versatile")


# class SubjectDetectOutput(TypedDict):
#     subject: str
#     topic: str
#     problem_type: str
#     difficulty_level: str


# class ExamPatternOutput(TypedDict):
#     commonly_appears: bool
#     likely_years: List[int]
#     marks: float
#     exam_tip: str


# class PracticeProblems(TypedDict):
#     problem_one: str
#     answer_one: str
#     problem_two: str
#     answer_two: str


# # Set up structured outputs and chains
# detect_llm = llm.with_structured_output(SubjectDetectOutput)
# exam_llm = llm.with_structured_output(ExamPatternOutput)
# practice_llm = llm.with_structured_output(PracticeProblems)

# solver_chain = solver_prompt | llm
# detect_chain = subject_detect_prompt | detect_llm
# exam_chain = exam_prompt | exam_llm
# practice_chain = practice_prompt | practice_llm