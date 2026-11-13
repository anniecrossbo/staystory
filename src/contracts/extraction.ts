/** Contract: reel caption → structured trip extraction. */

export interface ExtractionRequest {
  caption: string;
  reelUrl: string;
}

export interface ExtractionResponse {
  destination: string | null;
  days: number | null;
  places: string[];
  budgetPerPerson: number | null;
  namedStay: string | null;
  style: string[];
  title: string | null;
}

export type ExtractionSource = "openai" | "cache" | "rules";

export interface ExtractionResult {
  extraction: ExtractionResponse;
  source: ExtractionSource;
  note?: string;
}
