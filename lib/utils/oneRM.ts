/**
 * Epley formula: 1RM = weight × (1 + reps/30)
 * Best accuracy for reps <= 10
 */
export function estimateOneRM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/**
 * From a list of sets, returns the best estimated 1RM
 */
export function getBest1RM(sets: { weight_kg: number; reps_done: number }[]): number {
  return sets.reduce((best, set) => {
    const estimated = estimateOneRM(set.weight_kg, set.reps_done)
    return estimated > best ? estimated : best
  }, 0)
}
