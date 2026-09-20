export function calculateQuestionScore(selectedOptions, correctOptions, totalPoints = 10) {
  const selected = new Set(selectedOptions);
  const correct = new Set(correctOptions);
  const isExact = selected.size === correct.size && [...selected].every(option => correct.has(option));
  if (isExact) return totalPoints;

  const hasCorrectSelection = [...selected].some(option => correct.has(option));
  return hasCorrectSelection ? Math.round(totalPoints / 2) : 0;
}
