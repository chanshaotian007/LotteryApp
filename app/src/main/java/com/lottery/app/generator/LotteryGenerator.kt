package com.lottery.app.generator

import com.lottery.app.model.DoubleColorBallComplex
import com.lottery.app.model.PrizeCalculator
import com.lottery.app.model.SuperLottoComplex
import kotlin.random.Random

object LotteryGenerator {

    fun generateDoubleColorBallComplex(): DoubleColorBallComplex {
        return generateDoubleColorBall(
            redCountRange = 7..10,
            blueCountRange = 2..5,
            stakeMultiplier = 1
        )
    }

    fun generateSuperLottoComplex(): SuperLottoComplex {
        return generateSuperLotto(
            frontCountRange = 6..9,
            backCountRange = 3..5,
            stakeMultiplier = 1
        )
    }

    fun generateHighPrizeDoubleColorBall(): DoubleColorBallComplex {
        return generateDoubleColorBall(
            redCountRange = 8..12,
            blueCountRange = 3..6,
            stakeMultiplier = PrizeCalculator.calculateRequiredStakeMultiplier(
                PrizeCalculator.DOUBLE_COLOR_BALL_FIRST_PRIZE
            )
        )
    }

    fun generateHighPrizeSuperLotto(): SuperLottoComplex {
        return generateSuperLotto(
            frontCountRange = 7..10,
            backCountRange = 3..6,
            stakeMultiplier = PrizeCalculator.calculateRequiredStakeMultiplier(
                PrizeCalculator.SUPER_LOTTO_FIRST_PRIZE
            )
        )
    }

    private fun generateDoubleColorBall(
        redCountRange: IntRange,
        blueCountRange: IntRange,
        stakeMultiplier: Int
    ): DoubleColorBallComplex {
        val redCount = redCountRange.random(Random.Default)
        val blueCount = blueCountRange.random(Random.Default)
        val totalBets = PrizeCalculator.calculateDoubleColorBallBets(redCount, blueCount)

        return DoubleColorBallComplex(
            redBalls = randomNumbers(1..33, redCount),
            blueBalls = randomNumbers(1..16, blueCount),
            totalBets = totalBets,
            stakeMultiplier = stakeMultiplier,
            totalCost = PrizeCalculator.calculateTotalCost(
                totalBets,
                PrizeCalculator.DOUBLE_COLOR_BALL_BET_COST,
                stakeMultiplier
            ),
            maxPrize = PrizeCalculator.calculateMaxPrize(
                PrizeCalculator.DOUBLE_COLOR_BALL_FIRST_PRIZE,
                stakeMultiplier
            )
        )
    }

    private fun generateSuperLotto(
        frontCountRange: IntRange,
        backCountRange: IntRange,
        stakeMultiplier: Int
    ): SuperLottoComplex {
        val frontCount = frontCountRange.random(Random.Default)
        val backCount = backCountRange.random(Random.Default)
        val totalBets = PrizeCalculator.calculateSuperLottoBets(frontCount, backCount)

        return SuperLottoComplex(
            frontZone = randomNumbers(1..35, frontCount),
            backZone = randomNumbers(1..12, backCount),
            totalBets = totalBets,
            stakeMultiplier = stakeMultiplier,
            totalCost = PrizeCalculator.calculateTotalCost(
                totalBets,
                PrizeCalculator.SUPER_LOTTO_BET_COST,
                stakeMultiplier
            ),
            maxPrize = PrizeCalculator.calculateMaxPrize(
                PrizeCalculator.SUPER_LOTTO_FIRST_PRIZE,
                stakeMultiplier
            )
        )
    }

    private fun randomNumbers(range: IntRange, count: Int): List<Int> {
        require(count <= range.count()) { "选号数量不能超过可选号码范围" }
        return range.shuffled(Random.Default).take(count).sorted()
    }
}
