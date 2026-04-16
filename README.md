# Al-Hashimi Platform Rebuild (Performance-first)

## Confirmed constraints

- Platform targets low-end PCs and mid-range mobile devices.
- Video playback is the highest-priority experience.
- No modal-based player architecture.
- Minimalist Apple-style UI.
- No heavy animation libraries.

## Recommended stack

1. **Frontend runtime:** React 18 + Vite (fast local builds, small baseline).
2. **Styling:** Tailwind CSS + minimal handcrafted CSS tokens.
3. **Playback engine:** Native `<video>` first; optional HLS fallback only when needed.
4. **Routing approach:** Dedicated theater route/screen for lecture playback.
5. **Performance defaults:**
   - No large component libraries.
   - No runtime animation library.
   - Code-split theater screen.
   - Lazy load lecture thumbnails.

## Initial structure

```txt
src/
  components/
    VideoPlayer.tsx
  data/
    mockCourses.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```

## Player design notes

- Fullscreen uses native Fullscreen API with iOS webkit fallback.
- Keyboard shortcuts:
  - Space: play/pause
  - Left/Right arrows: seek ±10s
  - F: fullscreen
  - Esc: exit theater mode
- `100dvh` + fluid constraints avoid classic `100vh` mobile address-bar jumps.
- Player lives in dedicated theater layout, never inside a modal.
