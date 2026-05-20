export interface AuthenticatedUser {
  userId: string;
  openId: string;
  unionId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
}

export interface JwtPayload {
  sub: string;
  openId: string;
  unionId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}
