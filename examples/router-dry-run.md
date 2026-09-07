# Router dry run

This dry run checks the behavior that matters most: resume from evidence and stop only at the correct gate.

## Input

```text
Use $ask-park-video to continue this project. Steps 1–10 have passing evidence.
There is no visual-plan.json yet.
```

## Expected route

```text
Stage C · Step 11

Next: invoke Video ShotCraft as the Product B visual director, generate
visual-plan.json and its spec table, calculate total visual coverage, then
stop at H2 before rendering.
```

The Agent must not restart subtitle alignment, rebuild Product A, request an additional creative-direction approval, or render visual layers before H2.

