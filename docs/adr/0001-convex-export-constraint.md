# Convex export constraint — `mutation({...})` is framework scaffolding, not interface width

Architecture reviews must not count Convex `mutation({...})` / `query({...})` / `action({...})` exports as "interface complexity" in the depth calculation. Convex forces a 1:1 mapping between file-level exports and API endpoints. Every discrete operation requires its own export with its own arg validator, even when it delegates entirely to a deeper module.

A module that exports 20 Convex functions but delegates all logic to one `state-machine.ts` is *deep* — the 20 exports are Convex routing, not design surface. The depth lives in the business logic behind the seam, not in the file that hosts the framework bindings.

Applied to this codebase: the 62 exports in the original `games.ts` were not a sign of shallowness. The real shallowness was eight duplicated code blocks and distributed state-transition logic. The deepening (ADR-0001 was applied inline during the same session: `state-machine.ts` extracted) was justified for locality and duplication reasons, not for reducing export count.
