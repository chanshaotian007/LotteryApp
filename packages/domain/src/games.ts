import { ComplexPreference, GameCode, type GameDefinition } from "@lottery/contracts";

export const gameDefinitions: Record<GameCode, GameDefinition> = {
  [GameCode.DOUBLE_COLOR_BALL]: {
    code: GameCode.DOUBLE_COLOR_BALL,
    name: "双色球",
    primaryLabel: "redBalls",
    secondaryLabel: "blueBalls",
    primaryRange: [1, 33],
    secondaryRange: [1, 16],
    primaryPick: 6,
    secondaryPick: 1,
    ticketPrice: 2,
    baseFirstPrize: 5_000_000,
    ruleSourceUrl: "https://www.cwl.gov.cn/c/2018-10-12/417937.shtml",
    drawSourceUrl: "https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq",
  },
  [GameCode.SUPER_LOTTO]: {
    code: GameCode.SUPER_LOTTO,
    name: "大乐透",
    primaryLabel: "frontZone",
    secondaryLabel: "backZone",
    primaryRange: [1, 35],
    secondaryRange: [1, 12],
    primaryPick: 5,
    secondaryPick: 2,
    ticketPrice: 2,
    baseFirstPrize: 10_000_000,
    ruleSourceUrl: "https://m.lottery.gov.cn/ksjz/m/yxgz_dlt/",
    drawSourceUrl: "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85",
  },
};

export function getGameDefinition(gameCode: GameCode): GameDefinition {
  return gameDefinitions[gameCode];
}

export function listInclusiveRange([min, max]: [number, number]): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function countRanges(gameCode: GameCode, preference: ComplexPreference): [[number, number], [number, number]] {
  if (gameCode === GameCode.DOUBLE_COLOR_BALL) {
    const ranges: Record<ComplexPreference, [[number, number], [number, number]]> = {
      [ComplexPreference.SINGLE]: [[6, 6], [1, 1]],
      [ComplexPreference.CONSERVATIVE]: [[7, 8], [1, 2]],
      [ComplexPreference.BALANCED]: [[8, 10], [2, 4]],
      [ComplexPreference.AGGRESSIVE]: [[10, 12], [3, 6]],
    };
    return ranges[preference];
  }
  const ranges: Record<ComplexPreference, [[number, number], [number, number]]> = {
    [ComplexPreference.SINGLE]: [[5, 5], [2, 2]],
    [ComplexPreference.CONSERVATIVE]: [[6, 7], [2, 3]],
    [ComplexPreference.BALANCED]: [[7, 9], [3, 5]],
    [ComplexPreference.AGGRESSIVE]: [[9, 11], [4, 7]],
  };
  return ranges[preference];
}
