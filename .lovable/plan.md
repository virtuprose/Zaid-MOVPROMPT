## Remove the "Model recommendation" section from the prompt result card

Based on our last exchange, you want the Model recommendation block gone from generated prompt cards.

### Change (`src/components/director/PromptResultCard.tsx`)
- Remove the two `<Section label="Model recommendation" body={recommendation} />` renders (lines 408 and 548).
- Remove line 204 that appends `## Model recommendation` to the "Copy all" text.
- Leave the data fields (`recommended_model_id`, `recommendation_reason`) intact — they still drive routing internally; we just stop showing them to the user.

No other UI changes. The model badge / picker stays where it is.