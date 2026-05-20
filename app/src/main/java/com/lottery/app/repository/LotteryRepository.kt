package com.lottery.app.repository

import com.lottery.app.model.DoubleColorBallComplex
import com.lottery.app.model.LotteryNumber
import com.lottery.app.model.LotteryType
import com.lottery.app.model.SuperLottoComplex
import com.lottery.app.network.DrawDto
import com.lottery.app.network.EntitlementVerifyRequestDto
import com.lottery.app.network.EntitlementVerifyResponseDto
import com.lottery.app.network.GenerateRequestDto
import com.lottery.app.network.GenerateResponseDto
import com.lottery.app.network.LotteryApi
import com.lottery.app.network.LotteryApiClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class LotteryRepository(
    private val api: LotteryApi = LotteryApiClient.api
) {
    fun generateRemote(
        request: GenerateRequestDto,
        memberToken: String?,
        onSuccess: (List<LotteryNumber>, GenerateResponseDto) -> Unit,
        onError: (String) -> Unit
    ) {
        api.generate(request, memberToken).enqueue(object : Callback<GenerateResponseDto> {
            override fun onResponse(
                call: Call<GenerateResponseDto>,
                response: Response<GenerateResponseDto>
            ) {
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    onSuccess(mapGeneratedNumbers(body), body)
                } else {
                    onError("服务端返回 ${response.code()}")
                }
            }

            override fun onFailure(call: Call<GenerateResponseDto>, t: Throwable) {
                onError(t.message ?: "网络请求失败")
            }
        })
    }

    fun loadDraws(
        gameType: LotteryType,
        onSuccess: (List<DrawDto>) -> Unit,
        onError: (String) -> Unit
    ) {
        api.draws(gameType.toApiCode(), 20).enqueue(object : Callback<List<DrawDto>> {
            override fun onResponse(call: Call<List<DrawDto>>, response: Response<List<DrawDto>>) {
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    onSuccess(body)
                } else {
                    onError("开奖记录返回 ${response.code()}")
                }
            }

            override fun onFailure(call: Call<List<DrawDto>>, t: Throwable) {
                onError(t.message ?: "开奖记录请求失败")
            }
        })
    }

    fun verifyDemoEntitlement(
        productId: String = "lottery_premium_monthly",
        purchaseToken: String = "demo-member-token",
        onSuccess: (EntitlementVerifyResponseDto) -> Unit,
        onError: (String) -> Unit
    ) {
        api.verifyEntitlement(
            EntitlementVerifyRequestDto(
                productId = productId,
                purchaseToken = purchaseToken
            )
        ).enqueue(object : Callback<EntitlementVerifyResponseDto> {
            override fun onResponse(
                call: Call<EntitlementVerifyResponseDto>,
                response: Response<EntitlementVerifyResponseDto>
            ) {
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    onSuccess(body)
                } else {
                    onError("会员校验返回 ${response.code()}")
                }
            }

            override fun onFailure(call: Call<EntitlementVerifyResponseDto>, t: Throwable) {
                onError(t.message ?: "会员校验请求失败")
            }
        })
    }

    private fun mapGeneratedNumbers(response: GenerateResponseDto): List<LotteryNumber> {
        return response.candidates.map { candidate ->
            when (candidate.gameCode) {
                "ssq" -> DoubleColorBallComplex(
                    redBalls = candidate.primaryNumbers,
                    blueBalls = candidate.secondaryNumbers,
                    totalBets = candidate.totalBets,
                    stakeMultiplier = candidate.stakeMultiplier,
                    totalCost = candidate.totalCost,
                    maxPrize = candidate.maxPrize,
                    modelScore = candidate.modelScore,
                    dataVersion = response.dataVersion,
                    modelVersion = response.modelVersion,
                    riskTips = response.riskTips,
                    sourceLabel = "服务端 ${response.mode}"
                )
                "dlt" -> SuperLottoComplex(
                    frontZone = candidate.primaryNumbers,
                    backZone = candidate.secondaryNumbers,
                    totalBets = candidate.totalBets,
                    stakeMultiplier = candidate.stakeMultiplier,
                    totalCost = candidate.totalCost,
                    maxPrize = candidate.maxPrize,
                    modelScore = candidate.modelScore,
                    dataVersion = response.dataVersion,
                    modelVersion = response.modelVersion,
                    riskTips = response.riskTips,
                    sourceLabel = "服务端 ${response.mode}"
                )
                else -> error("Unsupported game code: ${candidate.gameCode}")
            }
        }
    }
}

fun LotteryType.toApiCode(): String {
    return when (this) {
        LotteryType.DoubleColorBall -> "ssq"
        LotteryType.SuperLotto -> "dlt"
    }
}
