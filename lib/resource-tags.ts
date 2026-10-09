const strandPattern = /^\[\[tm-strand:([\s\S]*?)\]\]\[\[tm-substrand:([\s\S]*?)\]\]\s*/;

export function parseResourceTags(description: string) {
  const match = description.match(strandPattern);

  if (!match) {
    return {
      strand: "",
      subStrand: "",
      cleanDescription: description
    };
  }

  return {
    strand: decodeURIComponent(match[1] ?? ""),
    subStrand: decodeURIComponent(match[2] ?? ""),
    cleanDescription: description.replace(strandPattern, "").trim()
  };
}

export function composeResourceDescription(input: {
  description: string;
  strand?: string;
  subStrand?: string;
}) {
  const cleanDescription = parseResourceTags(input.description).cleanDescription.trim();
  const strand = input.strand?.trim() ?? "";
  const subStrand = input.subStrand?.trim() ?? "";

  if (!strand && !subStrand) {
    return cleanDescription;
  }

  return `[[tm-strand:${encodeURIComponent(strand)}]][[tm-substrand:${encodeURIComponent(subStrand)}]] ${cleanDescription}`;
}
