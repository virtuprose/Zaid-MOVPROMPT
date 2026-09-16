# Cinematic template demos

Two image-to-video demos were explicitly authorized and completed on 2026-09-15. No paid retries were used. Each cost $0.1648 based on Gateway balance deltas, total $0.3296. The existing configured `bytedance/seedance-v1.0-pro-fast` model was preserved.

Both new H.264 videos are 704×1248 and approximately 8.042 seconds. They are muted. The references, compiled prompts, video files and sanitized manifests are saved here. Private provider diagnostics remain in ignored `artifacts/template-demos/`; they must not be published because recovery metadata may contain expiring URLs.

The reusable recipes live in `packages/creative-engine/src/catalog.ts`. `prompt-compiler.ts` compiles their directions with confirmed facts. `projectStore.ts` pins recipe version 3, prompt version and the visual snapshot in each generation brief. The API validates those visual fields against the published MongoDB version. Different inputs preserve visual direction, not identical AI pixels or guaranteed motion.

Read `TEMPLATE_PROMPTS.md` for all five visual recipes. Exact new demo prompts are `salon-booking-offer-v3-prompt.txt` and `app-service-v3-prompt.txt`.

Run `bun run storage:publish-templates` to publish and checksum-verify approved local demo/poster files. It does not generate videos. New Salon/App media uses `templates/v3/`; older `templates/v1/` objects are preserved. The restricted public API signs only approved demo keys; customer uploads and clean outputs remain private.

The paid generation command is deliberately separate: `MOVPROMPT_CONFIRM_TWO_TEMPLATE_DEMOS=YES bun --env-file=.env scripts/infra/generate-approved-template-demos.ts`. Existing completed outputs skip paid calls. Do not remove these guards/files or rerun after a provider failure without new approval.

Brand and offer details are optional. WhatsApp-order and booking campaigns still require their actual destination. Those fields remain in the guided form; they are not fabricated.
