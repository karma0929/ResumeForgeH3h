export interface ParsedLocation {
  country: string;
  region: string;
  city: string;
}

function normalizePart(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseLocationString(input: string) {
  const normalized = normalizePart(input);
  if (!normalized) {
    return { country: "", region: "", city: "" } satisfies ParsedLocation;
  }

  const parts = normalized
    .split(/[|,，]/g)
    .map((part) => normalizePart(part))
    .filter(Boolean);

  if (parts.length === 1) {
    return { country: "", region: "", city: parts[0] } satisfies ParsedLocation;
  }

  if (parts.length === 2) {
    return { country: parts[0], region: "", city: parts[1] } satisfies ParsedLocation;
  }

  return {
    country: parts[0],
    region: parts[1],
    city: normalizePart(parts.slice(2).join(", ")),
  };
}

export function formatLocationString(input: {
  country: string;
  region: string;
  city: string;
}) {
  return [input.country, input.region, input.city]
    .map((part) => normalizePart(part))
    .filter(Boolean)
    .join(", ");
}
