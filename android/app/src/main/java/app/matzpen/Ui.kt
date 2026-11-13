package app.matzpen

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/** Palette shared by every screen. */
object C {
    const val BG = 0xFF101014.toInt()
    const val SURFACE = 0xFF1D1A28.toInt()
    const val LINE = 0xFF2F2B3E.toInt()
    const val FG = 0xFFEDEAF6.toInt()
    const val MUTED = 0xFFA39EB8.toInt()
    const val ACCENT = 0xFFA78BFA.toInt()
    const val WARN = 0xFFFB923C.toInt()
    const val OK = 0xFF34D399.toInt()
}

const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT

/** Common base: loads the store and forces a right-to-left layout whatever the phone language is. */
open class Base : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Store.init(this)
    }

    fun show(content: View, scroll: Boolean = true) {
        val frame = FrameLayout(this)
        frame.fitsSystemWindows = true
        frame.setBackgroundColor(C.BG)
        frame.layoutDirection = View.LAYOUT_DIRECTION_RTL
        val inner: View = if (scroll) {
            ScrollView(this).apply {
                isFillViewport = true
                addView(content, FrameLayout.LayoutParams(MATCH, WRAP))
            }
        } else content
        frame.addView(inner, FrameLayout.LayoutParams(MATCH, MATCH))
        setContentView(frame)
    }
}

fun Context.dp(v: Int): Int = (v * resources.displayMetrics.density + 0.5f).toInt()

fun Context.toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()

fun rounded(color: Int, radius: Float, stroke: Int? = null) = GradientDrawable().apply {
    setColor(color)
    cornerRadius = radius
    if (stroke != null) setStroke(2, stroke)
}

fun Context.label(
    text: CharSequence,
    size: Float = 16f,
    color: Int = C.FG,
    bold: Boolean = false,
): TextView = TextView(this).apply {
    this.text = text
    textSize = size
    setTextColor(color)
    if (bold) typeface = Typeface.DEFAULT_BOLD
    setLineSpacing(0f, 1.15f)
    textAlignment = View.TEXT_ALIGNMENT_VIEW_START
}

fun Context.pill(text: CharSequence, primary: Boolean = false, onClick: () -> Unit): TextView =
    label(text, 15f, if (primary) C.BG else C.FG, primary).apply {
        background = rounded(
            if (primary) C.ACCENT else C.SURFACE,
            dp(22).toFloat(),
            if (primary) null else C.LINE,
        )
        setPadding(dp(16), dp(11), dp(16), dp(11))
        gravity = Gravity.CENTER
        textAlignment = View.TEXT_ALIGNMENT_CENTER
        maxLines = 1
        setOnClickListener { onClick() }
    }

fun Context.vbox(pad: Int = 0): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(pad), dp(pad), dp(pad), dp(pad))
}

fun Context.hbox(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
}

fun Context.card(): LinearLayout = vbox(14).apply {
    background = rounded(C.SURFACE, dp(14).toFloat(), C.LINE)
}

/** A single line of pills that scrolls sideways when it does not fit. */
fun Context.pillRow(pills: List<View>): View {
    val row = hbox()
    pills.forEachIndexed { i, v ->
        row.addView(v, LinearLayout.LayoutParams(WRAP, WRAP).apply { if (i > 0) marginStart = dp(8) })
    }
    return HorizontalScrollView(this).apply {
        isHorizontalScrollBarEnabled = false
        addView(row)
    }
}

fun LinearLayout.add(
    v: View,
    top: Int = 0,
    w: Int = MATCH,
    h: Int = WRAP,
    weight: Float = 0f,
): View {
    addView(v, LinearLayout.LayoutParams(w, h, weight).apply { topMargin = context.dp(top) })
    return v
}

fun Context.dialog(): AlertDialog.Builder =
    AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)

/** Section title used on the inner screens. */
fun Context.heading(text: String): TextView = label(text, 26f, C.FG, true)

fun Context.sub(text: String): TextView = label(text, 13f, C.MUTED)
