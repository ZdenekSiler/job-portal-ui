# Technical Specification — Issue #13

## 1. Issue Overview

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Title       | Inside the footer, when hover onto the "Cookie Policy" nothing being displayed |
| Description | Hovering the "Cookie Policy" footer link shows no tooltip text        |
| Labels      | —                                                                     |
| Priority    | Low                                                                   |
| State       | Closed                                                                |

## 2. Problem Analysis

The footer contains four legal/nav links: **Privacy Policy**, **Terms of Service**, **Cookie Policy**, and **Contact Us**. Each is implemented as an `<a>` (or `<Link>`) element that uses a CSS `group-hover` pattern to reveal an informative tooltip on hover.

At the time the issue was reported, at least one link lacked the tooltip inner `div`, leaving it blank on hover. Historical commits confirm a series of incremental fixes:

| Commit   | Fix                                    |
|----------|----------------------------------------|
| 9e1e645  | Add tooltip for Cookie Policy (`#3`)   |
| 3081b4f  | Add tooltip for Privacy Policy (`#6`)  |
| 346eb4a  | Add tooltip for Terms of Service (`#7`)|
| fd6f03e  | Add tooltip for Contact Us (`#10`)     |
| 2c6c5a2  | Add tooltip for Contact Us (`#13`)     |

Issue #13's closing commit (`2c6c5a2`) targeted the **Contact Us** link, suggesting the screenshot in the issue body depicted that link despite the title mentioning Cookie Policy. By the time #13 was filed, Cookie Policy already had a tooltip (committed in #3). The net unfixed case was Contact Us.

Root cause: the hover-tooltip `div` block was absent from the `<Link to="/contact">` element, so the `group-hover:opacity-100` transition had nothing to reveal.

## 3. Proposed Solution

Add the same tooltip structure used by Privacy Policy, Terms of Service, and Cookie Policy to the Contact Us `<Link>` element in `Footer.jsx`. No new components, no new patterns — pure markup parity.

The tooltip renders at `bottom-full` (above the link), uses the shared `bg-gray-900 border-gray-700` styling, and includes an arrow caret via a zero-width border trick. The `pointer-events-none` class prevents the tooltip from stealing mouse focus and accidentally hiding itself.

## 4. Step-by-Step Implementation

1. **Locate the Contact Us `<Link>` block** — `src/components/Footer.jsx` lines 171–182 (current state: already fixed in master). The span contains the label; a gradient highlight div follows; the tooltip div is the third child.
2. **Add the tooltip `div`** — insert after the highlight `div`, before `</Link>`. Use `w-72 bottom-full` positioning with `mb-3` gap and a downward-pointing `border-t-gray-700` caret.
3. **Write tooltip copy** — a short sentence explaining that the contact page accepts support and feedback messages.
4. **Verify parity** — all four links now share identical hover-tooltip structure and styling.

## 5. Verification Strategy

### Manual Checks

- Hover Privacy Policy → tooltip appears above link with correct copy
- Hover Terms of Service → tooltip appears above link with correct copy
- Hover Cookie Policy → tooltip appears above link with correct copy
- Hover Contact Us → tooltip appears above link with correct copy
- Move cursor away → all tooltips fade out cleanly
- On mobile viewport (< md) — links stack vertically; no tooltip overflow off-screen

### Visual Regression

- Dark and light theme: tooltip `bg-gray-900` is intentionally fixed-dark and does not invert with theme toggle (matches existing three tooltips).

## 6. Files to Modify

| File Path                        | Nature of Change                                      |
|----------------------------------|-------------------------------------------------------|
| `src/components/Footer.jsx`      | Add tooltip `div` inside the Contact Us `<Link>` block |

## 7. New Files to Create

None.

## 8. Existing Utilities to Leverage

| Utility / Pattern                                      | Benefit                                           |
|--------------------------------------------------------|---------------------------------------------------|
| Tailwind `group` / `group-hover:opacity-100`           | Zero-JS tooltip — already used by the other three links |
| `pointer-events-none` on tooltip div                   | Prevents mouse-leave flicker when cursor enters tooltip |
| `absolute bottom-full left-1/2 -translate-x-1/2 mb-3` | Consistent above-link positioning across all tooltips   |

## 9. Acceptance Criteria

- Hovering "Contact Us" in the footer displays an informative tooltip.
- Tooltip styling matches Privacy Policy, Terms of Service, and Cookie Policy tooltips exactly.
- No regressions on the other three footer link tooltips.
- No new components or CSS files introduced.

## 10. Out of Scope

- Making footer links navigate to real pages (Privacy Policy, Terms of Service, Cookie Policy are `<a>` with no `href` — that is a separate concern).
- Accessibility improvements (keyboard focus tooltip visibility) — separate issue.
- Mobile touch-tap behaviour — tooltips are hover-only; touch devices are a separate UX consideration.
