

# Add "Download Analytics Report" Button

Add a CSV download button to the Analytics tab that exports the current analytics data as a report.

## What you'll get
- A "Download Report" button in the Analytics tab header area
- Clicking it generates and downloads a CSV file containing summary stats, daily trends, workflow breakdown, and model breakdown

## Steps

### 1. Add download function to `AnalyticsTab.tsx`
- Add a `Download` icon button next to the tab content
- Implement a `downloadCSV` function that converts the `stats` prop into a multi-section CSV:
  - **Summary**: Total visits, unique visitors, total generations, today's counts, conversion rate
  - **Daily Trend (30 days)**: Date, Visits, Generations
  - **Workflow Breakdown**: Workflow type, Count
  - **Model Breakdown**: Model name, Count
- Use `Blob` + `URL.createObjectURL` + temporary `<a>` click to trigger the download
- File named `movprompt-analytics-YYYY-MM-DD.csv`

### 2. Style the button
- Place it in the top-right of the AnalyticsTab, above the stat cards
- Use the `Download` icon from lucide-react with "Download Report" label
- Match existing dark cinematic theme styling

## Technical notes
- Pure client-side CSV generation from the already-fetched `stats` object — no new API calls
- Single file change: `src/components/admin/AnalyticsTab.tsx`

