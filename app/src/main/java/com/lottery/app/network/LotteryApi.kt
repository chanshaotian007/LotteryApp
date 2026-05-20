package com.lottery.app.network

import com.google.gson.annotations.SerializedName
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

interface LotteryApi {
    @POST("v1/generate")
    fun generate(
        @Body request: GenerateRequestDto,
        @Header("X-Member-Token") memberToken: String? = null
    ): Call<GenerateResponseDto>

    @GET("v1/draws")
    fun draws(
        @Query("game_code") gameCode: String,
        @Query("limit") limit: Int = 20
    ): Call<List<DrawDto>>

    @POST("v1/entitlements/verify")
    fun verifyEntitlement(
        @Body request: EntitlementVerifyRequestDto
    ): Call<EntitlementVerifyResponseDto>
}

data class GenerateRequestDto(
    @SerializedName("game_code") val gameCode: String,
    @SerializedName("mode") val mode: String,
    @SerializedName("count") val count: Int = 1,
    @SerializedName("budget_min") val budgetMin: Int? = null,
    @SerializedName("budget_max") val budgetMax: Int? = null,
    @SerializedName("complex_preference") val complexPreference: String = "balanced",
    @SerializedName("exclude_high_prize_history") val excludeHighPrizeHistory: Boolean = false,
    @SerializedName("target_prize_mode") val targetPrizeMode: Boolean = false,
    @SerializedName("random_seed") val randomSeed: Int? = null
)

data class GenerateResponseDto(
    @SerializedName("mode") val mode: String,
    @SerializedName("candidates") val candidates: List<GeneratedCandidateDto>,
    @SerializedName("data_version") val dataVersion: String?,
    @SerializedName("model_version") val modelVersion: String?,
    @SerializedName("member_feature") val memberFeature: Boolean,
    @SerializedName("risk_tips") val riskTips: List<String> = emptyList(),
    @SerializedName("model_report") val modelReport: Map<String, Any>? = null
)

data class GeneratedCandidateDto(
    @SerializedName("game_code") val gameCode: String,
    @SerializedName("primary_numbers") val primaryNumbers: List<Int>,
    @SerializedName("secondary_numbers") val secondaryNumbers: List<Int>,
    @SerializedName("total_bets") val totalBets: Long,
    @SerializedName("stake_multiplier") val stakeMultiplier: Int,
    @SerializedName("total_cost") val totalCost: Long,
    @SerializedName("max_prize") val maxPrize: Long,
    @SerializedName("model_score") val modelScore: Double?,
    @SerializedName("excluded_history_issue") val excludedHistoryIssue: String?
)

data class DrawDto(
    @SerializedName("game_code") val gameCode: String,
    @SerializedName("issue") val issue: String,
    @SerializedName("draw_date") val drawDate: String?,
    @SerializedName("primary_numbers") val primaryNumbers: List<Int>,
    @SerializedName("secondary_numbers") val secondaryNumbers: List<Int>,
    @SerializedName("source_url") val sourceUrl: String,
    @SerializedName("source_hash") val sourceHash: String,
    @SerializedName("prize_tiers") val prizeTiers: List<Map<String, Any>> = emptyList()
)

data class EntitlementVerifyRequestDto(
    @SerializedName("platform") val platform: String = "google_play",
    @SerializedName("package_name") val packageName: String? = null,
    @SerializedName("product_id") val productId: String,
    @SerializedName("purchase_token") val purchaseToken: String,
    @SerializedName("product_type") val productType: String = "subscription"
)

data class EntitlementVerifyResponseDto(
    @SerializedName("active") val active: Boolean,
    @SerializedName("platform") val platform: String,
    @SerializedName("product_id") val productId: String,
    @SerializedName("entitlement") val entitlement: String?,
    @SerializedName("entitlement_token") val entitlementToken: String?,
    @SerializedName("source") val source: String,
    @SerializedName("message") val message: String
)
