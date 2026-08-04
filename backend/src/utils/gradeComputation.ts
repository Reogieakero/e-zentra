import { ComponentType } from '@prisma/client';

export interface ComponentWeight {
  componentType: ComponentType;
  weightPercentage: number;
}

export interface AssessmentInfo {
  id: string;
  componentType: ComponentType;
  maxScore: number;
}

export interface StudentScoreInfo {
  assessmentId: string;
  score: number;
}

export interface ComputedFinalGrade {
  quizAverage: number | null;
  performanceTaskAverage: number | null;
  examAverage: number | null;
  initialGrade: number;
  transmutedGrade: number;
  remarks: 'passed' | 'failed' | 'incomplete';
}

const COMPONENT_ORDER: ComponentType[] = ['quiz', 'performance_task', 'exam'];

function averagePercentage(
  assessments: AssessmentInfo[],
  scores: StudentScoreInfo[],
  componentType: ComponentType
): number | null {
  const ofType = assessments.filter((a) => a.componentType === componentType);
  if (ofType.length === 0) return null;

  const scoreMap = new Map(scores.map((s) => [s.assessmentId, s.score]));
  const percentages = ofType.map((a) => {
    const score = scoreMap.get(a.id);
    if (score === undefined) return null;
    const max = a.maxScore > 0 ? a.maxScore : 1;
    return (score / max) * 100;
  });

  const present = percentages.filter((p): p is number => p !== null);
  if (present.length === 0) return null;
  const mean = present.reduce((sum, p) => sum + p, 0) / present.length;
  return round2(mean);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeFinalGrade(
  assessments: AssessmentInfo[],
  scores: StudentScoreInfo[],
  weights: ComponentWeight[]
): ComputedFinalGrade {
  const weightMap = new Map<ComponentType, number>();
  for (const w of weights) {
    weightMap.set(w.componentType, w.weightPercentage);
  }

  const averages = {
    quiz: averagePercentage(assessments, scores, 'quiz'),
    performance_task: averagePercentage(assessments, scores, 'performance_task'),
    exam: averagePercentage(assessments, scores, 'exam'),
  };

  let weighted = 0;
  let weightSum = 0;
  let complete = true;

  for (const component of COMPONENT_ORDER) {
    const avg = averages[component];
    const weight = weightMap.get(component) ?? 0;
    if (avg !== null) {
      weighted += avg * weight;
      weightSum += weight;
    } else {
      complete = false;
    }
  }

  const initialGrade = weightSum > 0 ? round2(weighted / weightSum) : 0;
  const transmutedGrade = transmuteGrade(initialGrade);

  return {
    quizAverage: averages.quiz,
    performanceTaskAverage: averages.performance_task,
    examAverage: averages.exam,
    initialGrade,
    transmutedGrade,
    remarks: complete ? (transmutedGrade >= 75 ? 'passed' : 'failed') : 'incomplete',
  };
}

export const DEPED_TRANSMUTATION_TABLE: ReadonlyArray<{ min: number; max: number; value: number }> = [
  { min: 98, max: 100, value: 100 },
  { min: 95, max: 97, value: 97 },
  { min: 92, max: 94, value: 94 },
  { min: 89, max: 91, value: 91 },
  { min: 86, max: 88, value: 88 },
  { min: 83, max: 85, value: 85 },
  { min: 80, max: 82, value: 82 },
  { min: 77, max: 79, value: 79 },
  { min: 75, max: 76, value: 76 },
  { min: 73, max: 74, value: 74 },
  { min: 71, max: 72, value: 73 },
  { min: 69, max: 70, value: 72 },
  { min: 67, max: 68, value: 71 },
  { min: 65, max: 66, value: 70 },
  { min: 63, max: 64, value: 69 },
  { min: 61, max: 62, value: 68 },
  { min: 59, max: 60, value: 67 },
  { min: 56, max: 58, value: 66 },
  { min: 53, max: 55, value: 65 },
  { min: 50, max: 52, value: 64 },
  { min: 47, max: 49, value: 63 },
  { min: 44, max: 46, value: 62 },
  { min: 40, max: 43, value: 61 },
  { min: 0, max: 39, value: 60 },
];

export function transmuteGrade(initial: number): number {
  const clamped = Math.min(100, Math.max(0, initial));
  const band = DEPED_TRANSMUTATION_TABLE.find((b) => clamped >= b.min && clamped <= b.max);
  if (!band) return 60;
  if (clamped >= 75) {
    return round2(clamped);
  }
  return band.value;
}
