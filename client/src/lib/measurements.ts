export interface ParsedMeasurements {
  weight_g: number | null;
  diameter_mm: number | null;
}

export function parseMeasurements(description: string): ParsedMeasurements {
  const weightMatch = description.match(/Weight:\s*([\d.]+)\s*g/i);
  const diameterMatch = description.match(/Diameter:\s*([\d.]+)\s*mm/i);
  return {
    weight_g: weightMatch ? parseFloat(weightMatch[1]) : null,
    diameter_mm: diameterMatch ? parseFloat(diameterMatch[1]) : null,
  };
}

export function convertMeasurements(
  parsed: ParsedMeasurements,
  units: "metric" | "imperial"
): { weight: string | null; diameter: string | null } {
  if (units === "imperial") {
    return {
      weight: parsed.weight_g !== null
        ? `${(parsed.weight_g / 28.3495).toFixed(4)} oz`
        : null,
      diameter: parsed.diameter_mm !== null
        ? `${(parsed.diameter_mm / 25.4).toFixed(3)} in`
        : null,
    };
  }
  return {
    weight: parsed.weight_g !== null ? `${parsed.weight_g} g` : null,
    diameter: parsed.diameter_mm !== null ? `${parsed.diameter_mm} mm` : null,
  };
}
