import { test } from "vitest";
import { rankModels } from "../modelRanking";
test("debug", () => {
  const r = rankModels({ subject: "moody portrait", model_recommendation: "Kling — bold motion" });
  console.log(r.slice(0,5).map(x => ({id: x.model.id, score: x.score, reasons: x.reasons})));
});
