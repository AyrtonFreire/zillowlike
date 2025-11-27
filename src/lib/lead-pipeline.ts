export type CanonicalPipelineStage =
  | "NEW"
  | "CONTACT"
  | "VISIT"
  | "PROPOSAL"
  | "DOCUMENTS"
  | "WON"
  | "LOST";

export type BoardPipelineGroup = "NEW" | "CONTACT" | "NEGOTIATION" | "CLOSED";

export function canonicalToBoardGroup(
  stage: CanonicalPipelineStage | null | undefined,
  status?: string | null
): BoardPipelineGroup {
  if (stage === "NEW") return "NEW";
  if (stage === "CONTACT") return "CONTACT";
  if (stage === "VISIT" || stage === "PROPOSAL" || stage === "DOCUMENTS") {
    return "NEGOTIATION";
  }
  if (stage === "WON" || stage === "LOST") {
    return "CLOSED";
  }

  if (status === "RESERVED") return "NEW";
  return "CONTACT";
}

export function boardGroupToCanonical(
  group: BoardPipelineGroup,
  currentStage?: CanonicalPipelineStage | null
): CanonicalPipelineStage {
  if (group === "NEW") return "NEW";
  if (group === "CONTACT") return "CONTACT";

  if (group === "NEGOTIATION") {
    if (
      currentStage === "VISIT" ||
      currentStage === "PROPOSAL" ||
      currentStage === "DOCUMENTS"
    ) {
      return currentStage;
    }
    return "PROPOSAL";
  }

  if (currentStage === "WON" || currentStage === "LOST") {
    return currentStage;
  }
  return "WON";
}
