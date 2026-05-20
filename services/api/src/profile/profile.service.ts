import { Injectable, NotFoundException } from "@nestjs/common";
import { type UserProfile } from "@lottery/contracts";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adminRoles: true },
    });
    if (!user) {
      throw new NotFoundException("user not found");
    }
    return {
      id: user.id,
      openId: user.openId,
      unionId: user.unionId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      isAdmin: user.adminRoles.some((role) => role.role === "admin"),
    };
  }
}
