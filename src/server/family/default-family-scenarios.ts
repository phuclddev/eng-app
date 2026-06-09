import type { FamilyChildFocus } from "@/lib/types";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/server/bootstrap-admin";

export type FamilyScenarioSeed = {
  category: string;
  childFocus: FamilyChildFocus;
  description: string;
  difficulty: number;
  title: string;
};

export const DEFAULT_FAMILY_SCENARIOS: FamilyScenarioSeed[] = [
  {
    title: "Morning routine",
    category: "Routine",
    childFocus: "BOTH",
    difficulty: 1,
    description:
      "Early-morning wake-up, getting dressed, and moving Kiwi and Vivi out of bed without turning the whole apartment into a negotiation.",
  },
  {
    title: "Car ride to school",
    category: "Routine",
    childFocus: "BOTH",
    difficulty: 1,
    description:
      "A realistic school commute with traffic, sleepy children, and short father-child exchanges in the car.",
  },
  {
    title: "Asking for phone",
    category: "Boundaries",
    childFocus: "KIWI",
    difficulty: 2,
    description:
      "Kiwi asks to use a phone and Phuc needs to set a calm limit without escalating the conversation too quickly.",
  },
  {
    title: "Watching cartoons in the car",
    category: "Boundaries",
    childFocus: "BOTH",
    difficulty: 2,
    description:
      "The children ask for cartoons during the ride and Phuc responds with gentle boundaries plus distraction or redirection.",
  },
  {
    title: "Refusing homework",
    category: "Study time",
    childFocus: "BOTH",
    difficulty: 3,
    description:
      "Evening homework resistance after a long day, with Phuc trying to keep the tone warm but firm.",
  },
  {
    title: "Refusing handwriting practice",
    category: "Study time",
    childFocus: "BOTH",
    difficulty: 3,
    description:
      "The children do not want to practice writing, so Phuc must encourage them without sounding too formal or punitive.",
  },
  {
    title: "Refusing tooth brushing",
    category: "Hygiene",
    childFocus: "BOTH",
    difficulty: 2,
    description:
      "A familiar bedtime hygiene struggle with excuses, delays, and emotional pushback before brushing teeth.",
  },
  {
    title: "Bedtime struggle",
    category: "Bedtime",
    childFocus: "BOTH",
    difficulty: 3,
    description:
      "Phuc tries to settle the children at night when they want to keep talking, playing, or clinging to him.",
  },
  {
    title: "Fear of ghosts",
    category: "Emotional coaching",
    childFocus: "BOTH",
    difficulty: 2,
    description:
      "One or both children feel scared of ghosts or the dark, and Phuc needs to comfort them in simple natural English.",
  },
  {
    title: "Kiwi losing chess",
    category: "Emotional coaching",
    childFocus: "KIWI",
    difficulty: 4,
    description:
      "Kiwi loses a chess game, feels embarrassed or upset, and Phuc helps him regulate disappointment and keep trying.",
  },
  {
    title: "Vivi refusing medicine",
    category: "Health",
    childFocus: "VIVI",
    difficulty: 3,
    description:
      "Vivi complains that medicine is bitter and resists taking it, so Phuc needs patient but practical language.",
  },
  {
    title: "Messy toys",
    category: "House rules",
    childFocus: "BOTH",
    difficulty: 2,
    description:
      "The room is messy with toys everywhere, and Phuc asks the children to clean up without turning it into a fight.",
  },
  {
    title: "Playground visit",
    category: "Outing",
    childFocus: "BOTH",
    difficulty: 1,
    description:
      "A light outing conversation before, during, or after going to an indoor playground or slides.",
  },
  {
    title: "Visiting maternal grandparents",
    category: "Family visit",
    childFocus: "BOTH",
    difficulty: 1,
    description:
      "A warm family visit near Trung Van, including pickup routines, greetings, and the children feeling comfortable there.",
  },
  {
    title: "Visiting paternal grandparents",
    category: "Family visit",
    childFocus: "BOTH",
    difficulty: 1,
    description:
      "A weekend visit to the paternal grandparents, with talk about gifts, toys, and family affection.",
  },
  {
    title: "Weekend outing",
    category: "Outing",
    childFocus: "BOTH",
    difficulty: 2,
    description:
      "Planning or discussing a family outing for the weekend in a relaxed, natural Hanoi family tone.",
  },
  {
    title: "English practice at home",
    category: "English practice",
    childFocus: "BOTH",
    difficulty: 3,
    description:
      "Phuc practices English with Kiwi and Vivi at home using short natural exchanges rather than academic drills.",
  },
];

export function shouldSeedDefaultFamilyScenarios(email?: null | string) {
  return email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function getDefaultFamilyScenariosForUser(email?: null | string) {
  return shouldSeedDefaultFamilyScenarios(email) ? DEFAULT_FAMILY_SCENARIOS : [];
}
