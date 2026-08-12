# MovPrompt Kuwait campaign benchmark

This scorecard is the gate for enabling a production capability or making a
public claim against another product. UI polish or a single successful sample
is not evidence of category leadership.

## Corpus

The fixed corpus contains 48 briefs: four verticals × four scenarios × three
campaign languages.

| Vertical | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 |
|---|---|---|---|---|
| Salon | WhatsApp booking offer | Practitioner introduction | Facility trust story | Seasonal service launch |
| Clinic | General service explainer | Facility tour | Appointment campaign | Practitioner introduction |
| Retail | Premium product reveal | WhatsApp offer | New-arrival launch | Gift campaign |
| Ecommerce | Product demonstration | UGC review | Unboxing | Feature-led offer |

Every scenario is tested in Arabic, English and bilingual output. Brief IDs use
`KW-{vertical}-{scenario}-{language}`. The input pack for each brief must include:

- Confirmed business/product name.
- Confirmed description and allowed claims.
- Price or explicit “no price”.
- Offer or explicit “no offer”.
- Verified WhatsApp/booking destination.
- Logo and brand colours.
- One hero image plus up to four detail references.
- Person-consent reference when a real person appears.
- Expected 9:16 safe zones and campaign goal.

Clinic briefs must never contain generated before/after imagery, patient health
information, guaranteed results or unverified qualifications.

## Blind comparison

1. Freeze every brief and asset pack before running any provider.
2. Generate at least three outputs for each capability/provider combination.
3. Compare complete campaign results, not raw clips, against the current
   Higgsfield, Creatify/Pippit and HeyGen workflows.
4. Hide tool/provider identity from reviewers and randomize order.
5. Use at least five Kuwait-based reviewers for the campaign-readiness vote.
6. Store the brief version, provider configuration hash, latency, provider cost,
   retries and technical outcome with every review.

## Weighted quality score

| Dimension | Weight | Automatic gate |
|---|---:|---|
| Product/business identity fidelity | 25% | Reject altered logo, label, product shape or invented fact |
| Arabic/English copy accuracy | 20% | Reject incorrect price, offer, CTA or unreadable Arabic |
| Campaign-goal effectiveness | 15% | — |
| Visual quality and motion | 15% | Reject broken frames or material artifacts |
| Kuwait/RTL readiness | 10% | Reject unsafe price, logo, subtitle or mixed-direction layout |
| Reference/prompt adherence | 10% | — |
| Audio, pronunciation and lip sync | 5% | Reject missing/corrupt audio when required |

Reliability and economics are measured separately:

- Technical success rate.
- First-render acceptance.
- Accepted within one revision.
- p50/p95 latency.
- Provider cost and MovPrompt cost per accepted output.
- Contribution margin per accepted output.

## Enablement gates

A capability stays disabled unless all of these are true:

- Provider commercial rights, data retention and deletion terms are approved.
- At least 80% first-render acceptance on its applicable corpus.
- At least 98% technically successful jobs in staging.
- Exact price, offer and CTA accuracy is 100%.
- Arabic/RTL safe-zone pass is at least 99%.
- The accepted-output contribution margin is at least 60%.
- A fallback provider, if configured, passes the same capability contract.

MovPrompt may use “better for Kuwait campaign readiness” only after complete
MovPrompt campaign packs receive at least 60% blind preference over the named
comparison workflow on the frozen corpus.

## Evidence record

Each run records:

```text
brief_id
brief_version
capability_alias
provider_adapter_id (server-only)
provider_model_id (server-only)
configuration_hash
input_asset_checksums
started_at / completed_at
latency_ms
provider_cost_minor
internal_retry_count
technical_status
quality_gate_results
reviewer_scores
accepted / rejected
rejection_reason
```

Provider and model IDs never appear in the public API or beginner interface.
