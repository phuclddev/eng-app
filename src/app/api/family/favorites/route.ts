import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  familyFavoriteRemoveSchema,
  familyFavoriteToggleSchema,
} from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import {
  addFamilyFavorite,
  listFamilyFavoritesForUser,
  removeFamilyFavorite,
} from "@/server/family/family-favorites-service";

export async function GET() {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const favorites = await listFamilyFavoritesForUser({ userId });

    return NextResponse.json({ favorites });
  } catch (error) {
    logger.error({ error, userId }, "Family favorites listing failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyFavoriteToggleSchema.parse(await request.json());
    const favorite = await addFamilyFavorite({ userId, payload });

    logger.info(
      {
        userId,
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
      "Family favorite added",
    );

    return NextResponse.json({ favorite });
  } catch (error) {
    logger.error({ error, userId }, "Family favorite add failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyFavoriteRemoveSchema.parse(await request.json());
    const result = await removeFamilyFavorite({ userId, payload });

    logger.info(
      {
        userId,
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
      "Family favorite removed",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, userId }, "Family favorite remove failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
