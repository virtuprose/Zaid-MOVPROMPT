import { test } from "vitest";
import { rankModels } from "../modelRanking";
test("debug", () => {
  const r = rankModels({ subject: "moody portrait", model_recommendation: "Kling — bold motion" });
  console.log(r.slice(0,8).map(x => `${x.model.id} ${x.score} ${x.reasons.join("|")}`).join("\n"));
});
