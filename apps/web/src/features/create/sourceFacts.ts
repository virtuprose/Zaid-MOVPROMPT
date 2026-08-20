import {
  CampaignSourceSchema,
  type CampaignFactField,
  type CampaignGoal,
  type ConfirmedFact,
  type CampaignSource,
} from "@movprompt/contracts";

/** Parse at every browser boundary so campaign facts cannot acquire display URLs or duplicate fields. */
export function normalizeCampaignSource(source: CampaignSource): CampaignSource {
  return CampaignSourceSchema.parse(source);
}

type ImportedFactInput = Pick<ConfirmedFact, "field" | "value">;

export type CampaignSourceSubject = CampaignSource["subject"];

export type CampaignFactReviewItem = {
  field: CampaignFactField;
  state: "present" | "required_missing" | "not_added";
  fact?: ConfirmedFact;
};

const PRODUCT_FACT_FIELDS: CampaignFactField[] = [
  "name",
  "description",
  "brand",
  "price",
  "offer",
  "logo",
  "brand_color",
  "media",
  "whatsapp",
];

const SERVICE_FACT_FIELDS: CampaignFactField[] = [
  "service_name",
  "description",
  "service_details",
  "location",
  "booking_url",
  "whatsapp",
  "price",
  "offer",
  "logo",
  "brand_color",
  "media",
];

function primaryNameField(subject: CampaignSourceSubject): CampaignFactField {
  return subject === "product" ? "name" : "service_name";
}

function requiredFieldsFor(subject: CampaignSourceSubject, goal: CampaignGoal): CampaignFactField[] {
  const name = primaryNameField(subject);
  if (goal === "whatsapp_orders") return [name, "whatsapp"];
  if (goal === "bookings") return [name, "booking_url"];
  if (goal === "offer") return [name, "offer"];
  return [name];
}

/** Minimum facts are purpose-specific; empty optional values are never invented. */
export function requiredFactsForOutcome(goal: CampaignGoal, subject: CampaignSourceSubject): CampaignFactField[] {
  return requiredFieldsFor(subject, goal);
}

/**
 * Scanner facts become imported facts as an immutable replacement by field.
 * Caller-supplied values never inherit an old fact's provenance accidentally.
 */
export function applyImportedFacts(source: CampaignSource, imported: readonly ImportedFactInput[]): CampaignSource {
  const incoming = new Map(imported.map((fact) => [fact.field, {
    field: fact.field,
    value: fact.value,
    provenance: "imported" as const,
  }]));
  const retained = source.facts.filter((fact) => !incoming.has(fact.field));
  return normalizeCampaignSource({ ...source, facts: [...retained, ...incoming.values()] });
}

/** A user edit creates a manual fact; an empty optional edit intentionally removes that fact. */
export function editFact(source: CampaignSource, field: CampaignFactField, value: string): CampaignSource {
  const trimmed = value.trim();
  const retained = source.facts.filter((fact) => fact.field !== field);
  if (!trimmed) return normalizeCampaignSource({ ...source, facts: retained });
  return normalizeCampaignSource({
    ...source,
    facts: [...retained, { field, value: trimmed, provenance: "manual" }],
  });
}

/** Confirm only untouched imported values selected for this campaign; edits remain explicitly manual. */
export function confirmCampaignFacts(
  source: CampaignSource,
  fields: readonly CampaignFactField[] = source.facts.map((fact) => fact.field),
): CampaignSource {
  const selected = new Set(fields);
  return normalizeCampaignSource({
    ...source,
    facts: source.facts.map((fact) => (
      fact.provenance === "imported" && selected.has(fact.field)
        ? { ...fact, provenance: "user_confirmed" as const }
        : fact
    )),
  });
}

/** Review metadata makes absent optional facts visible without adding invented values to campaign truth. */
export function factsForReview(source: CampaignSource, goal: CampaignGoal): CampaignFactReviewItem[] {
  const present = new Map(source.facts.map((fact) => [fact.field, fact]));
  const required = new Set(requiredFactsForOutcome(goal, source.subject));
  const expected = source.subject === "product" ? PRODUCT_FACT_FIELDS : SERVICE_FACT_FIELDS;
  return expected.map((field) => {
    const fact = present.get(field);
    if (fact) return { field, state: "present", fact };
    return { field, state: required.has(field) ? "required_missing" : "not_added" };
  });
}
