import { designCases } from "./designCases";

export type DesignQuery = {
  images: number;
  hasVideo: boolean;
  purpose?: string;
  prefer?: readonly string[];
  avoid?: readonly string[];
};

// External providers supply reviewed records with usage rights before indexing.
export interface ReviewedCaseProvider {
  discover(query: DesignQuery, signal: AbortSignal): Promise<readonly {
    url: string;
    creator: string;
    usageScope: string;
    reviewedAt: string;
  }[]>;
}

export function retrieveDesignCases(query: DesignQuery) {
  return designCases
    .filter(record => !query.avoid?.includes(record.id))
    .filter(record => record.material === "text" || (
      record.material === "image" ? query.images > 0 : query.hasVideo
    ))
    .filter(record => !["case-12", "case-13", "case-22"].includes(record.id) || query.images >= 3)
    .map(record => ({
      record,
      score: (query.prefer?.includes(record.id) ? 4 : 0)
        + (/作品|攝影|portfolio/i.test(query.purpose ?? "") && ["case-07", "case-12", "case-13", "case-20", "case-22"].includes(record.id) ? 3 : 0)
        + (record.material !== "text" ? 2 : 0) + (record.evidence === "article-screenshot" ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ record }) => record);
}

/** Free-text search across all cases (name, what was observed, the guidance), for the moodboard. */
export function searchDesignCases(query: string, material?: "image" | "text" | "video") {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return designCases.filter((c) => (!material || c.material === material) && words.every((w) => (c.name + c.observation + c.guidance).toLowerCase().includes(w)));
}
