# Speaking Idea Map

## Initial reusable idea pack

The repo now ships with an idempotent initial `Speaking Idea Map` seed pack for admin use.

Run it with:

```bash
pnpm prisma db seed
```

What the seed does:

- bootstraps the existing admin + family defaults
- creates the initial reusable IELTS Speaking idea pack
- only creates missing ideas
- does not overwrite admin edits on existing ideas
- skips duplicates by normalized `title` or normalized `shortLabel`

Seed behavior:

- new ideas are created as `ACTIVE`
- nested `variants`, `supports`, and `patterns` are created only for newly inserted ideas
- the seed pack is tagged with `generatedBatchId = "seed-idea-pack-v1"`
- `aiReason` stores a short seed note plus example-question coverage hints

Current schema note:

- The source pack includes `exampleQuestions` for every idea.
- `exampleQuestions` are not stored in a dedicated Prisma field yet.
- They are kept in the seed source and documented here so admins can use them during manual review and question mapping.

## Included ideas

The initial pack contains `37` reusable ideas:

1. Convenience and saving time
2. Wider choice
3. Cost saving
4. Flexibility
5. Better communication
6. Access to information
7. Personal development
8. Building confidence
9. Reducing stress
10. Improving health
11. Social connection
12. Independence
13. Safety
14. Environmental protection
15. Cultural exposure
16. Creativity
17. Productivity
18. Emotional support
19. Better opportunities
20. Learning efficiency
21. Entertainment and enjoyment
22. Work-life balance
23. Community belonging
24. Problem solving
25. Long-term benefits
26. Adaptability
27. Motivation
28. Discipline
29. Practical skills
30. Quality of life
31. Problem prevention
32. Access and inclusion
33. Habit formation
34. Sense of achievement
35. Curiosity and exploration
36. Reliability and consistency
37. Shared experiences and memories

## Pack structure

Every seeded idea includes:

- Vietnamese description
- English description
- `popularityScore`
- `reuseScore`
- three band variants: `5.5`, `6.5`, `7.5`
- multiple support points
- at least one reusable answer pattern
- example question coverage in the source pack

## Example question coverage workflow

If you want to review or extend the source pack:

- source data file: [prisma/speaking-idea-pack.ts](/Users/phucluu/Downloads/all_repo/eng-app/prisma/speaking-idea-pack.ts)
- seed helper: [prisma/seed-speaking-ideas.ts](/Users/phucluu/Downloads/all_repo/eng-app/prisma/seed-speaking-ideas.ts)

The example-question hints are intended to support:

- manual `SpeakingIdeaQuestionMap` linking
- AI-assisted question mapping
- future answer-generation review

They do not auto-create mappings during seed.
