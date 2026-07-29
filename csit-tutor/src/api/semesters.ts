import { apiFetch } from "./client";

export interface Semester {
  id: string;
  number: number;
  name: string;
}

export async function listSemesters() {
  return apiFetch("/semesters") as Promise<Semester[]>;
}

export async function selectSemester(semesterId: string) {
  return apiFetch("/semesters/select", {
    method: "POST",
    body: JSON.stringify({ semester_id: semesterId }),
  }) as Promise<Semester>;
}

export async function getMySemester() {
  return apiFetch("/semesters/me") as Promise<Semester>;
}