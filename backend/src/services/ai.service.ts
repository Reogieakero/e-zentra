import { loadAttendanceReport } from './dashboard.service';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 90000);
// Feature gate: disabled by default. Set AI_RECOMMENDATIONS_ENABLED=true to enable.
const AI_ENABLED = process.env.AI_RECOMMENDATIONS_ENABLED === 'true';

export interface AiRecommendationResult {
  ok: boolean;
  summary: string;
  recommendations: string[];
  model: string;
  reason?: string;
}

function buildContext(view: 'monthly' | 'daily', gradeLevel?: string, sectionId?: string) {
  return loadAttendanceReport(view, gradeLevel, sectionId);
}

function buildPrompt(ctx: {
  schoolYear: string | null;
  term: string | null;
  targetRate: number;
  granularity: 'monthly' | 'daily';
  enrollmentTotal: number;
  statBlocks: {
    averageRate: number;
    bestPeriod: { label?: string; rate?: number | null } | null;
    lowestPeriod: { label?: string; rate?: number | null } | null;
    periodsAboveTarget: number;
    periodsTracked: number;
  };
  gradeLevels: { label: string; rate: number }[];
  series: { label: string; rate: number | null }[];
}): string {
  const context = {
    schoolYear: ctx.schoolYear,
    term: ctx.term,
    targetRate: ctx.targetRate,
    granularity: ctx.granularity,
    enrollmentTotal: ctx.enrollmentTotal,
    statBlocks: {
      averageRate: ctx.statBlocks.averageRate,
      periodsAboveTarget: ctx.statBlocks.periodsAboveTarget,
      periodsTracked: ctx.statBlocks.periodsTracked,
      bestPeriod: ctx.statBlocks.bestPeriod ?? null,
      lowestPeriod: ctx.statBlocks.lowestPeriod ?? null,
    },
    gradeLevels: ctx.gradeLevels,
    series: ctx.series.map((s) => ({ label: s.label, rate: s.rate })),
  };
  const json = JSON.stringify(context);
  return [
    'You are a concise school attendance analyst for a single school. Use ONLY the structured JSON below. Do not invent data.',
    'Return a short summary (max 3 sentences) of attendance health, then exactly 3 concrete, actionable recommendations.',
    'Recommendations must be actionable for a school principal (e.g., outreach, interventions, follow-ups).',
    'Respond ONLY with valid JSON, no markdown, shaped exactly as: { "summary": string, "recommendations": string[] }',
    `DATA: ${json}`,
  ].join('\n');
}

export async function getAiRecommendations(
  view: 'monthly' | 'daily' = 'monthly',
  gradeLevel?: string,
  sectionId?: string
): Promise<AiRecommendationResult> {
  if (!AI_ENABLED) {
    return {
      ok: false,
      summary: '',
      recommendations: [],
      model: OLLAMA_MODEL,
      reason: 'AI recommendations are currently disabled. Set AI_RECOMMENDATIONS_ENABLED=true to enable.',
    };
  }

  let context;
  try {
    context = await buildContext(view, gradeLevel, sectionId);
  } catch {
    return {
      ok: false,
      summary: '',
      recommendations: [],
      model: OLLAMA_MODEL,
      reason: 'Unable to load report data for AI analysis.',
    };
  }

  const prompt = buildPrompt(context);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 404) {
        return {
          ok: false,
          summary: '',
          recommendations: [],
          model: OLLAMA_MODEL,
          reason: `Model "${OLLAMA_MODEL}" is not installed. Run: ollama pull ${OLLAMA_MODEL}.`,
        };
      }
      return {
        ok: false,
        summary: '',
        recommendations: [],
        model: OLLAMA_MODEL,
        reason: `Ollama returned HTTP ${res.status}.`,
      };
    }

    const body = (await res.json()) as { response?: string };
    const raw = body.response ?? '';
    const parsed = parseJson(raw);
    return {
      ok: true,
      summary: parsed?.summary && typeof parsed.summary === 'string' ? parsed.summary : '',
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed.recommendations.filter((r: unknown): r is string => typeof r === 'string')
        : [],
      model: OLLAMA_MODEL,
    };
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      summary: '',
      recommendations: [],
      model: OLLAMA_MODEL,
      reason: aborted
        ? `Ollama request timed out after ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s.`
        : 'Ollama is not reachable. Make sure it is running and the model is pulled.',
    };
  }
}

function parseJson(raw: string): { summary?: unknown; recommendations?: unknown } | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as { summary?: unknown; recommendations?: unknown };
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as { summary?: unknown; recommendations?: unknown };
      } catch {
        return null;
      }
    }
    return null;
  }
}