package com.lottery.app.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.lottery.app.R
import com.lottery.app.databinding.ItemLotteryNumberBinding
import com.lottery.app.model.DoubleColorBallComplex
import com.lottery.app.model.LotteryNumber
import com.lottery.app.model.SuperLottoComplex
import java.text.DecimalFormat

class LotteryNumberAdapter : RecyclerView.Adapter<LotteryNumberAdapter.ViewHolder>() {

    private val numbers = mutableListOf<LotteryNumber>()

    fun updateNumbers(newNumbers: List<LotteryNumber>) {
        numbers.clear()
        numbers.addAll(newNumbers)
        notifyDataSetChanged()
    }

    fun clearNumbers() {
        val size = numbers.size
        numbers.clear()
        if (size > 0) {
            notifyItemRangeRemoved(0, size)
        }
    }

    fun getAllNumbersAsString(): String {
        return numbers.mapIndexed { index, number ->
            "${index + 1}. $number"
        }.joinToString("\n\n")
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemLotteryNumberBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        when (val number = numbers[position]) {
            is DoubleColorBallComplex -> holder.bindDoubleColorBallComplex(number)
            is SuperLottoComplex -> holder.bindSuperLottoComplex(number)
        }
    }

    override fun getItemCount(): Int = numbers.size

    class ViewHolder(
        private val binding: ItemLotteryNumberBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        private val formatter = DecimalFormat("#,###")

        fun bindDoubleColorBallComplex(complexBall: DoubleColorBallComplex) {
            binding.textComplexInfo.visibility = View.VISIBLE
            binding.layoutDoubleColorBallComplex.visibility = View.VISIBLE
            binding.layoutSuperLottoComplex.visibility = View.GONE

            binding.textComplexInfo.text = "双色球复式投注\n" +
                "复式注数：${formatter.format(complexBall.totalBets)}注\n" +
                "投注倍数：${formatter.format(complexBall.stakeMultiplier)}倍\n" +
                "投注金额：${formatter.format(complexBall.totalCost)}元\n" +
                "理论一等奖：${formatter.format(complexBall.maxPrize)}元" +
                buildMetadataText(complexBall)

            bindBalls(binding.layoutRedBallsComplex, complexBall.redBalls, R.drawable.ball_red)
            bindBalls(binding.layoutBlueBallsComplex, complexBall.blueBalls, R.drawable.ball_blue)
        }

        fun bindSuperLottoComplex(complexLotto: SuperLottoComplex) {
            binding.textComplexInfo.visibility = View.VISIBLE
            binding.layoutDoubleColorBallComplex.visibility = View.GONE
            binding.layoutSuperLottoComplex.visibility = View.VISIBLE

            binding.textComplexInfo.text = "大乐透复式投注\n" +
                "复式注数：${formatter.format(complexLotto.totalBets)}注\n" +
                "投注倍数：${formatter.format(complexLotto.stakeMultiplier)}倍\n" +
                "投注金额：${formatter.format(complexLotto.totalCost)}元\n" +
                "理论一等奖：${formatter.format(complexLotto.maxPrize)}元" +
                buildMetadataText(complexLotto)

            bindBalls(binding.layoutFrontZoneComplex, complexLotto.frontZone, R.drawable.ball_red)
            bindBalls(binding.layoutBackZoneComplex, complexLotto.backZone, R.drawable.ball_blue)
        }

        private fun bindBalls(container: LinearLayout, numbers: List<Int>, backgroundRes: Int) {
            container.removeAllViews()
            numbers.sorted().forEach { number ->
                container.addView(createBallTextView(number, backgroundRes))
            }
        }

        private fun createBallTextView(number: Int, backgroundRes: Int): TextView {
            val density = itemView.context.resources.displayMetrics.density
            val size = (32 * density).toInt()
            val horizontalMargin = (3 * density).toInt()

            return TextView(itemView.context).apply {
                text = number.toString().padStart(2, '0')
                background = ContextCompat.getDrawable(itemView.context, backgroundRes)
                textSize = 12f
                setTextColor(ContextCompat.getColor(itemView.context, android.R.color.white))
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(size, size).apply {
                    setMargins(horizontalMargin, 0, horizontalMargin, 0)
                }
            }
        }

        private fun buildMetadataText(number: LotteryNumber): String {
            val lines = mutableListOf("来源：${number.sourceLabel}")
            number.modelScore?.let { lines.add("模型评分：${"%.4f".format(it)}") }
            number.modelVersion?.let { lines.add("模型版本：$it") }
            number.dataVersion?.let { lines.add("数据版本：$it") }
            if (number.riskTips.isNotEmpty()) {
                lines.add("风险提示：${number.riskTips.first()}")
            }
            return lines.joinToString(separator = "\n", prefix = "\n")
        }
    }
}
