export function useStatus({
  isGenerating,
  isChecking,
  hasFeedback,
}: {
  isGenerating: boolean;
  isChecking: boolean;
  hasFeedback: boolean;
}) {
  if (isGenerating) return "Generating";
  if (isChecking) return "Checking";
  if (hasFeedback) return "Reviewed";
  return "Ready";
}
