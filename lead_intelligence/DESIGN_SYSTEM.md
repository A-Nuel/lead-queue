# Nuel Intelligence design system

## Synthesis of five public design references

1. **Anthropic frontend-design** — choose a coherent visual direction first; avoid generic component-first output.
2. **Studio-Groei anti-slop** — curate taste references, reject predictable templates, and iterate against a defined direction.
3. **sboghossian/design-skill** — ground design in product context, then verify at mobile/tablet/desktop widths in a browser.
4. **Vercel Web Interface Guidelines** — keyboard usability, clear focus, forms, loading/error states, semantics and responsive behavior.
5. **nattergabriel/frontend-craft** — detect repeated AI-style tells and review typography, spacing, copy and component repetition.

These projects are references, not installed runtime dependencies. We synthesize their principles here instead of copying unrelated code.

## Product-specific art direction

A working sales research console, not a marketing landing page: dense but legible, evidence-first, fast, quiet and trustworthy. Prioritize source URLs, contact details, verification state, last researched date and pipeline stage.

- Palette: ink #080D16, surface #111B2A, border #253449, text #E7EDF7, cyan #19B6C8.
- Avoid purple/blue gradients, glassmorphism, decorative glow, repeated feature cards, emoji icons, generic SaaS hero sections and animation without a function.
- Use restrained typography and strong hierarchy; styling must support information architecture.
- Tables must work on small screens; actions need clear labels and useful error states.
- Empty/loading/error states explain what happened and the next action.
- Accessibility: semantic controls, visible keyboard focus, adequate contrast, labels, and no color-only status indicators.

## Verification gate

Before calling the UI done:
- Render screenshots at 375px, 768px and 1440px.
- Check keyboard-only navigation, labels, focus, contrast and table overflow.
- Review real discovery, empty, failure and long-name states.
- Run a source-level anti-slop check and manually review false positives.
- No claims of visual quality without screenshot evidence.

Current status: visual direction and basic Streamlit styling exist. Browser screenshots and accessibility review remain outstanding.
