package com.lottery.app.generator

import com.lottery.app.model.PrizeCalculator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LotteryGeneratorTest {

    @Test
    fun highPrizeDoubleColorBallMeetsTargetPrizeAndCostFormula() {
        repeat(50) {
            val result = LotteryGenerator.generateHighPrizeDoubleColorBall()

            assertTrue(result.redBalls.size in 8..12)
            assertTrue(result.blueBalls.size in 3..6)
            assertEquals(result.redBalls.size, result.redBalls.distinct().size)
            assertEquals(result.blueBalls.size, result.blueBalls.distinct().size)
            assertTrue(result.maxPrize >= PrizeCalculator.TARGET_FIRST_PRIZE)
            assertEquals(
                result.totalBets * PrizeCalculator.DOUBLE_COLOR_BALL_BET_COST * result.stakeMultiplier,
                result.totalCost
            )
        }
    }

    @Test
    fun highPrizeSuperLottoMeetsTargetPrizeAndCostFormula() {
        repeat(50) {
            val result = LotteryGenerator.generateHighPrizeSuperLotto()

            assertTrue(result.frontZone.size in 7..10)
            assertTrue(result.backZone.size in 3..6)
            assertEquals(result.frontZone.size, result.frontZone.distinct().size)
            assertEquals(result.backZone.size, result.backZone.distinct().size)
            assertTrue(result.maxPrize >= PrizeCalculator.TARGET_FIRST_PRIZE)
            assertEquals(
                result.totalBets * PrizeCalculator.SUPER_LOTTO_BET_COST * result.stakeMultiplier,
                result.totalCost
            )
        }
    }

    @Test
    fun standardPlansUseSingleStake() {
        val doubleColorBall = LotteryGenerator.generateDoubleColorBallComplex()
        val superLotto = LotteryGenerator.generateSuperLottoComplex()

        assertEquals(1, doubleColorBall.stakeMultiplier)
        assertEquals(1, superLotto.stakeMultiplier)
    }
}
