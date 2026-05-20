package com.lottery.app.model

import org.junit.Assert.assertEquals
import org.junit.Test

class PrizeCalculatorTest {

    @Test
    fun combinationCalculatesExpectedValues() {
        assertEquals(1L, PrizeCalculator.combination(6, 0))
        assertEquals(6L, PrizeCalculator.combination(6, 1))
        assertEquals(15L, PrizeCalculator.combination(6, 2))
        assertEquals(1_107_568L, PrizeCalculator.combination(33, 6))
        assertEquals(0L, PrizeCalculator.combination(5, 6))
    }

    @Test
    fun doubleColorBallBetsUseRedCombinationTimesBlueCount() {
        assertEquals(14L, PrizeCalculator.calculateDoubleColorBallBets(7, 2))
        assertEquals(5_544L, PrizeCalculator.calculateDoubleColorBallBets(12, 6))
    }

    @Test
    fun superLottoBetsUseFrontAndBackCombinations() {
        assertEquals(18L, PrizeCalculator.calculateSuperLottoBets(6, 3))
        assertEquals(3_780L, PrizeCalculator.calculateSuperLottoBets(10, 6))
    }

    @Test
    fun targetPrizeCalculatesMinimumRequiredStakeMultiplier() {
        assertEquals(10, PrizeCalculator.calculateRequiredStakeMultiplier(5_000_000L))
        assertEquals(5, PrizeCalculator.calculateRequiredStakeMultiplier(10_000_000L))
        assertEquals(7, PrizeCalculator.calculateRequiredStakeMultiplier(8_000_000L))
    }

    @Test
    fun totalCostIncludesStakeMultiplier() {
        assertEquals(280L, PrizeCalculator.calculateTotalCost(14L, 2L, 10))
    }
}
