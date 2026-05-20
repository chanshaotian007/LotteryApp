package com.lottery.app.model

sealed interface LotteryNumber {
    val totalBets: Long
    val stakeMultiplier: Int
    val totalCost: Long
    val maxPrize: Long
    val modelScore: Double?
    val dataVersion: String?
    val modelVersion: String?
    val riskTips: List<String>
    val sourceLabel: String
}

data class DoubleColorBallComplex(
    val redBalls: List<Int>,
    val blueBalls: List<Int>,
    override val totalBets: Long,
    override val stakeMultiplier: Int,
    override val totalCost: Long,
    override val maxPrize: Long,
    override val modelScore: Double? = null,
    override val dataVersion: String? = null,
    override val modelVersion: String? = null,
    override val riskTips: List<String> = emptyList(),
    override val sourceLabel: String = "本地随机"
) : LotteryNumber {
    override fun toString(): String {
        val redStr = redBalls.sorted().joinToString(" ")
        val blueStr = blueBalls.sorted().joinToString(" ")
        return "红球: $redStr\n" +
            "蓝球: $blueStr\n" +
            "复式注数: ${totalBets}注\n" +
            "投注倍数: ${stakeMultiplier}倍\n" +
            "投注金额: ${totalCost}元\n" +
            "理论一等奖: ${maxPrize}元" +
            metadataString()
    }

    private fun metadataString(): String {
        val lines = mutableListOf("来源: $sourceLabel")
        modelScore?.let { lines.add("模型评分: ${"%.4f".format(it)}") }
        modelVersion?.let { lines.add("模型版本: $it") }
        dataVersion?.let { lines.add("数据版本: $it") }
        if (riskTips.isNotEmpty()) lines.add("风险提示: ${riskTips.joinToString("；")}")
        return lines.joinToString(separator = "\n", prefix = "\n")
    }
}

data class SuperLottoComplex(
    val frontZone: List<Int>,
    val backZone: List<Int>,
    override val totalBets: Long,
    override val stakeMultiplier: Int,
    override val totalCost: Long,
    override val maxPrize: Long,
    override val modelScore: Double? = null,
    override val dataVersion: String? = null,
    override val modelVersion: String? = null,
    override val riskTips: List<String> = emptyList(),
    override val sourceLabel: String = "本地随机"
) : LotteryNumber {
    override fun toString(): String {
        val frontStr = frontZone.sorted().joinToString(" ")
        val backStr = backZone.sorted().joinToString(" ")
        return "前区: $frontStr\n" +
            "后区: $backStr\n" +
            "复式注数: ${totalBets}注\n" +
            "投注倍数: ${stakeMultiplier}倍\n" +
            "投注金额: ${totalCost}元\n" +
            "理论一等奖: ${maxPrize}元" +
            metadataString()
    }

    private fun metadataString(): String {
        val lines = mutableListOf("来源: $sourceLabel")
        modelScore?.let { lines.add("模型评分: ${"%.4f".format(it)}") }
        modelVersion?.let { lines.add("模型版本: $it") }
        dataVersion?.let { lines.add("数据版本: $it") }
        if (riskTips.isNotEmpty()) lines.add("风险提示: ${riskTips.joinToString("；")}")
        return lines.joinToString(separator = "\n", prefix = "\n")
    }
}

sealed class LotteryType {
    object DoubleColorBall : LotteryType()
    object SuperLotto : LotteryType()
}

object PrizeCalculator {
    const val TARGET_FIRST_PRIZE = 50_000_000L

    const val DOUBLE_COLOR_BALL_FIRST_PRIZE = 5_000_000L
    const val DOUBLE_COLOR_BALL_BET_COST = 2L

    const val SUPER_LOTTO_FIRST_PRIZE = 10_000_000L
    const val SUPER_LOTTO_BET_COST = 2L

    fun combination(n: Int, r: Int): Long {
        if (r > n || r < 0) return 0
        if (r == 0 || r == n) return 1

        val selected = minOf(r, n - r)
        var result = 1L

        for (i in 1..selected) {
            result = result * (n - selected + i) / i
        }
        return result
    }

    fun calculateDoubleColorBallBets(redCount: Int, blueCount: Int): Long {
        require(redCount in 6..33) { "双色球红球数量需在6到33之间" }
        require(blueCount in 1..16) { "双色球蓝球数量需在1到16之间" }
        return combination(redCount, 6) * blueCount
    }

    fun calculateSuperLottoBets(frontCount: Int, backCount: Int): Long {
        require(frontCount in 5..35) { "大乐透前区数量需在5到35之间" }
        require(backCount in 2..12) { "大乐透后区数量需在2到12之间" }
        return combination(frontCount, 5) * combination(backCount, 2)
    }

    fun calculateTotalCost(totalBets: Long, betCost: Long, stakeMultiplier: Int): Long {
        require(totalBets > 0) { "投注注数必须大于0" }
        require(stakeMultiplier > 0) { "投注倍数必须大于0" }
        return totalBets * betCost * stakeMultiplier
    }

    fun calculateMaxPrize(baseFirstPrize: Long, stakeMultiplier: Int): Long {
        require(baseFirstPrize > 0) { "基础一等奖金额必须大于0" }
        require(stakeMultiplier > 0) { "投注倍数必须大于0" }
        return baseFirstPrize * stakeMultiplier
    }

    fun calculateRequiredStakeMultiplier(
        baseFirstPrize: Long,
        targetPrize: Long = TARGET_FIRST_PRIZE
    ): Int {
        require(baseFirstPrize > 0) { "基础一等奖金额必须大于0" }
        require(targetPrize > 0) { "目标奖金必须大于0" }
        return ((targetPrize + baseFirstPrize - 1) / baseFirstPrize).toInt()
    }
}
