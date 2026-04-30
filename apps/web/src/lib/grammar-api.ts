import axios from "axios";
import type {
  CheckGrammarRequest,
  CheckGrammarResponse,
  GenerateGrammarRequest,
  GenerateGrammarResponse,
} from "@/types/grammar";

const grammarApi = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function generateGrammarTask(payload: Omit<GenerateGrammarRequest, "action">) {
  const { data } = await grammarApi.post<GenerateGrammarResponse>("/grammar", {
    action: "generate",
    ...payload,
  } satisfies GenerateGrammarRequest);

  return data;
}

export async function checkGrammarAnswer(payload: Omit<CheckGrammarRequest, "action">) {
  const { data } = await grammarApi.post<CheckGrammarResponse>("/grammar", {
    action: "check",
    ...payload,
  } satisfies CheckGrammarRequest);

  return data;
}
