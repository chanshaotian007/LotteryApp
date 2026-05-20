import { Injectable, OnModuleInit } from "@nestjs/common";
import { gameDefinitions } from "@lottery/domain";
import { PrismaService } from "./prisma.service";

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await Promise.all(
      (Object.values(gameDefinitions) as Array<(typeof gameDefinitions)[keyof typeof gameDefinitions]>).map((game) =>
        this.prisma.game.upsert({
          where: { code: game.code },
          create: {
            code: game.code,
            name: game.name,
            ticketPrice: game.ticketPrice,
            ruleSourceUrl: game.ruleSourceUrl,
            drawSourceUrl: game.drawSourceUrl,
          },
          update: {
            name: game.name,
            ticketPrice: game.ticketPrice,
            ruleSourceUrl: game.ruleSourceUrl,
            drawSourceUrl: game.drawSourceUrl,
          },
        }),
      ),
    );

    const products = [
      {
        code: "premium_monthly",
        name: "高级会员月卡",
        description: "开启历史排除、模型预测、预算约束和高级报告。",
        priceFen: 1900,
        durationDays: 30,
      },
      {
        code: "premium_yearly",
        name: "高级会员年卡",
        description: "开启全部会员能力，适合长期使用。",
        priceFen: 16800,
        durationDays: 365,
      },
    ];

    await Promise.all(
      products.map((product) =>
        this.prisma.product.upsert({
          where: { code: product.code },
          create: product,
          update: product,
        }),
      ),
    );
  }
}
