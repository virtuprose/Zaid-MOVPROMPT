

# Generate MovPrompt Business Model Document (PDF + DOCX)

Create a professional business model and product overview document for the marketing team, covering:

## Document Contents

1. **Executive Summary** — What MovPrompt is and the problem it solves
2. **The Problem** — Gap between still images and AI video generation prompts
3. **The Solution** — AI Director of Photography that analyzes scenes and writes model-specific prompts
4. **Key Features** — Three workflows (Single Frame, Two Frames, Multi-Shot), 8 AI video platforms supported (35+ models), scene decomposition, model-specific syntax
5. **Target Audience** — Content creators, filmmakers, marketing teams, social media managers
6. **Supported Platforms** — Hailuo, Kling, Sora, Veo, Higgsfield, Wan, Seedance, Grok
7. **Business Model / Monetization** — Freemium tiers, potential API access, enterprise plans
8. **Competitive Advantage** — Model-aware prompting, scene analysis depth, multi-workflow support
9. **Go-to-Market Strategy** — Community-driven growth, creator partnerships, platform integrations

## Approach

- Write a Python script using `reportlab` for the PDF (dark-themed, branded with MovPrompt colors)
- Write a Node.js script using `docx` for the DOCX (clean, professional, editable)
- QA both outputs visually
- Output to `/mnt/documents/`

## Files produced
- `/mnt/documents/MovPrompt_Business_Model.pdf`
- `/mnt/documents/MovPrompt_Business_Model.docx`

