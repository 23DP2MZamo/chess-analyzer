export type OpeningCandidate = { id: string; eco: string; name: string };
const normalized = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

// An ECO code identifies a family, not a unique variation. Never guess among siblings.
export function matchOpening(candidates: OpeningCandidate[], eco: string, name: string | null) {
  const matchingEco = candidates.filter((opening) => opening.eco === eco);
  if (name)
    return matchingEco.find((opening) => normalized(opening.name) === normalized(name))?.id ?? null;
  return matchingEco.length === 1 ? matchingEco[0].id : null;
}
