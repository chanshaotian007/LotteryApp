import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { AuthenticatedUser, JwtPayload } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyAuthorizationHeader(authorization?: string | null): Promise<AuthenticatedUser> {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("bearer token is required");
    }
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    const user = await this.prisma.user.upsert({
      where: { openId: payload.openId },
      create: {
        openId: payload.openId,
        unionId: payload.unionId ?? null,
        nickname: payload.nickname ?? null,
        avatarUrl: payload.avatarUrl ?? null,
      },
      update: {
        unionId: payload.unionId ?? undefined,
        nickname: payload.nickname ?? undefined,
        avatarUrl: payload.avatarUrl ?? undefined,
      },
    });
    const isAdmin = await this.isAdminUser(user.id);
    return {
      userId: user.id,
      openId: payload.openId,
      unionId: payload.unionId ?? null,
      nickname: payload.nickname ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      isAdmin,
    };
  }

  extractBearerToken(authorization?: string | null): string | null {
    if (!authorization) {
      return null;
    }
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return null;
    }
    return token.trim();
  }

  async isAdminUser(userId: string): Promise<boolean> {
    const count = await this.prisma.adminRole.count({
      where: { userId, role: "admin" },
    });
    return count > 0;
  }
}
