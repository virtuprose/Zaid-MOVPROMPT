

## Fix React forwardRef Warning on ResultsPanel

### Problem
Framer Motion's `motion.div` wrapping `ResultsPanel` output triggers a React warning because the component doesn't forward refs.

### Change

**File: `src/components/ResultsPanel.tsx`**
- Wrap the component with `React.forwardRef` so framer-motion can attach its ref without warnings.
- Convert from a plain function component to a `forwardRef` component, passing the ref to the outer `motion.div`.

Single file, ~5 lines changed.

