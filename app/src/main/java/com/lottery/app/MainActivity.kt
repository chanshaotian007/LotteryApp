package com.lottery.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.recyclerview.widget.LinearLayoutManager
import com.lottery.app.adapter.LotteryNumberAdapter
import com.lottery.app.databinding.ActivityMainBinding
import com.lottery.app.generator.LotteryGenerator
import com.lottery.app.model.DoubleColorBallComplex
import com.lottery.app.model.LotteryNumber
import com.lottery.app.model.LotteryType
import com.lottery.app.model.SuperLottoComplex
import com.lottery.app.network.GenerateRequestDto
import com.lottery.app.network.GenerateResponseDto
import com.lottery.app.repository.LotteryRepository
import com.lottery.app.repository.toApiCode

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: LotteryNumberAdapter
    private val repository = LotteryRepository()

    private var selectedLotteryType: LotteryType = LotteryType.DoubleColorBall
    private var lastModelReportText: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupListeners()
        updateResultState()
    }

    private fun setupRecyclerView() {
        adapter = LotteryNumberAdapter()
        binding.recyclerViewNumbers.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewNumbers.adapter = adapter
    }

    private fun setupListeners() {
        binding.radioGroupLotteryType.setOnCheckedChangeListener { _, checkedId ->
            selectedLotteryType = when (checkedId) {
                R.id.radioDoubleColorBall -> LotteryType.DoubleColorBall
                R.id.radioSuperLotto -> LotteryType.SuperLotto
                else -> LotteryType.DoubleColorBall
            }
        }

        binding.buttonGenerate.setOnClickListener {
            generateNumbers()
        }

        binding.buttonClear.setOnClickListener {
            adapter.clearNumbers()
            updateResultState()
            Toast.makeText(this, "已清除所有号码", Toast.LENGTH_SHORT).show()
        }

        binding.buttonCopy.setOnClickListener {
            copyNumbersToClipboard()
        }

        binding.buttonHistory.setOnClickListener {
            loadHistory()
        }

        binding.buttonReport.setOnClickListener {
            val report = lastModelReportText ?: "暂无模型报告，请先使用AI模型预测生成。"
            binding.textModelReport.text = report
            binding.textModelReport.isVisible = true
        }

        binding.switchMember.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                binding.textServiceStatus.text = "当前：正在校验会员权益..."
                repository.verifyDemoEntitlement(
                    onSuccess = { entitlement ->
                        if (entitlement.active) {
                            binding.textServiceStatus.text = "当前：会员权益已启用（${entitlement.source}）"
                        } else {
                            binding.switchMember.isChecked = false
                            binding.textServiceStatus.text = "当前：会员权益无效（${entitlement.message}）"
                        }
                    },
                    onError = { message ->
                        binding.switchMember.isChecked = false
                        binding.textServiceStatus.text = "当前：会员校验失败（$message）"
                    }
                )
            }
        }
    }

    private fun generateNumbers() {
        try {
            val mode = selectedGenerateMode()
            val budgetMin = binding.editBudgetMin.text.toString().trim().toIntOrNull()
            val budgetMax = binding.editBudgetMax.text.toString().trim().toIntOrNull()
            if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
                Toast.makeText(this, "最低预算不能大于最高预算", Toast.LENGTH_SHORT).show()
                return
            }

            val usesMemberFeature = mode != "random" ||
                binding.checkBoxExcludeHistory.isChecked ||
                budgetMin != null ||
                budgetMax != null
            if (usesMemberFeature && !binding.switchMember.isChecked) {
                Toast.makeText(this, "会员功能未开启，已使用本地随机兜底", Toast.LENGTH_LONG).show()
                generateLocalNumbers("未登录会员")
                return
            }

            binding.buttonGenerate.isEnabled = false
            binding.textServiceStatus.text = "当前：正在请求服务端..."
            val request = GenerateRequestDto(
                gameCode = selectedLotteryType.toApiCode(),
                mode = mode,
                count = 1,
                budgetMin = budgetMin,
                budgetMax = budgetMax,
                complexPreference = if (binding.checkBoxComplex.isChecked) "aggressive" else "balanced",
                excludeHighPrizeHistory = binding.checkBoxExcludeHistory.isChecked,
                targetPrizeMode = binding.checkBoxComplex.isChecked,
                randomSeed = null
            )
            val memberToken = if (binding.switchMember.isChecked) "demo-member-token" else null
            repository.generateRemote(
                request = request,
                memberToken = memberToken,
                onSuccess = { numbers, response ->
                    binding.buttonGenerate.isEnabled = true
                    adapter.updateNumbers(numbers)
                    updateResultState()
                    lastModelReportText = formatModelReport(response)
                    binding.textServiceStatus.text = "当前：服务端生成成功，数据版本 ${response.dataVersion ?: "unknown"}"
                    binding.textModelReport.isVisible = response.modelReport != null
                    binding.textModelReport.text = lastModelReportText
                    Toast.makeText(this, "已生成服务端投注方案", Toast.LENGTH_LONG).show()
                },
                onError = { message ->
                    binding.buttonGenerate.isEnabled = true
                    generateLocalNumbers(message)
                }
            )
        } catch (e: Exception) {
            binding.buttonGenerate.isEnabled = true
            Toast.makeText(this, "生成号码时出错: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun generateLocalNumbers(reason: String) {
        try {
            val useTargetPrize = binding.checkBoxComplex.isChecked

            val numbers: List<LotteryNumber> = when (selectedLotteryType) {
                LotteryType.DoubleColorBall -> {
                    if (useTargetPrize) {
                        listOf(LotteryGenerator.generateHighPrizeDoubleColorBall())
                    } else {
                        listOf(LotteryGenerator.generateDoubleColorBallComplex())
                    }
                }
                LotteryType.SuperLotto -> {
                    if (useTargetPrize) {
                        listOf(LotteryGenerator.generateHighPrizeSuperLotto())
                    } else {
                        listOf(LotteryGenerator.generateSuperLottoComplex())
                    }
                }
            }

            adapter.updateNumbers(numbers)
            updateResultState()
            binding.textServiceStatus.text = "当前：本地随机兜底（$reason）"
            lastModelReportText = null
            binding.textModelReport.isVisible = false

            val prizeText = when (val number = numbers.first()) {
                is DoubleColorBallComplex -> {
                    "已生成双色球投注方案\n理论一等奖：${number.maxPrize / 10_000}万元"
                }
                is SuperLottoComplex -> {
                    "已生成大乐透投注方案\n理论一等奖：${number.maxPrize / 10_000}万元"
                }
            }

            Toast.makeText(this, prizeText, Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "生成号码时出错: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun selectedGenerateMode(): String {
        return when (binding.radioGroupGenerateMode.checkedRadioButtonId) {
            R.id.radioModeExcludeHistory -> "exclude_history"
            R.id.radioModePrediction -> "model_prediction"
            else -> "random"
        }
    }

    private fun loadHistory() {
        binding.textServiceStatus.text = "当前：正在加载开奖历史..."
        repository.loadDraws(
            gameType = selectedLotteryType,
            onSuccess = { draws ->
                val text = if (draws.isEmpty()) {
                    "暂无开奖记录，请先在服务端同步数据。"
                } else {
                    draws.take(5).joinToString("\n") { draw ->
                        "${draw.issue} ${draw.primaryNumbers.joinToString(" ")} + ${draw.secondaryNumbers.joinToString(" ")}"
                    }
                }
                binding.textHistory.text = text
                binding.textHistory.isVisible = true
                binding.textServiceStatus.text = "当前：开奖历史加载完成"
            },
            onError = { message ->
                binding.textServiceStatus.text = "当前：开奖历史加载失败（$message）"
                binding.textHistory.isVisible = false
            }
        )
    }

    private fun formatModelReport(response: GenerateResponseDto): String {
        val report = response.modelReport
        val header = "模型版本：${response.modelVersion ?: "未训练"}"
        if (report.isNullOrEmpty()) {
            return "$header\n本次未返回模型报告。"
        }
        val detail = report.entries.joinToString("\n") { (key, value) ->
            "$key：$value"
        }
        return "$header\n$detail\n风险提示：${response.riskTips.firstOrNull() ?: "不保证中奖"}"
    }

    private fun updateResultState() {
        val hasNumbers = adapter.itemCount > 0
        binding.textEmptyState.isVisible = !hasNumbers
        binding.recyclerViewNumbers.isVisible = hasNumbers
        binding.buttonCopy.isEnabled = hasNumbers
    }

    private fun copyNumbersToClipboard() {
        val numbersText = adapter.getAllNumbersAsString()
        if (numbersText.isNotEmpty()) {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("彩票投注号码", numbersText)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "投注号码已复制到剪贴板", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "暂无号码可复制", Toast.LENGTH_SHORT).show()
        }
    }
}
