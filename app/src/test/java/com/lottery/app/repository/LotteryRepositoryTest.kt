package com.lottery.app.repository

import com.lottery.app.model.LotteryType
import org.junit.Assert.assertEquals
import org.junit.Test

class LotteryRepositoryTest {
    @Test
    fun lotteryTypeMapsToApiCode() {
        assertEquals("ssq", LotteryType.DoubleColorBall.toApiCode())
        assertEquals("dlt", LotteryType.SuperLotto.toApiCode())
    }
}

