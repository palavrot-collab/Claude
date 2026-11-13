package app.matzpen

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout

/**
 * The pause between the impulse and the app: a breath, an affirmation, what is next on the plan,
 * better things to do, and only then the choice to continue for a limited time.
 */
class InterceptActivity : Base() {

    private var pkg = ""
    private var reason = "open"
    private var timer: CountDownTimer? = null
    private var pulse: ValueAnimator? = null
    private var leaving = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        begin(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        begin(intent)
    }

    private fun begin(i: Intent) {
        pkg = i.getStringExtra("pkg") ?: ""
        reason = i.getStringExtra("reason") ?: "open"
        leaving = false
        showing = pkg
        if (reason == "open") Store.bump("attempts")
        breathe()
    }

    private fun appName() = Apps.label(this, pkg)

    private fun breathe() {
        stopTimers()
        val attempts = Store.stat("attempts")
        // Every extra attempt today makes the wait a little longer.
        val seconds = (Store.delaySec + 5 * (attempts - 1).coerceAtLeast(0)).coerceAtMost(60)

        val root = vbox(28).apply { gravity = Gravity.CENTER }
        val why = when (reason) {
            "time" -> "הזמן שהקצבת ל-${appName()} נגמר."
            "scroll" -> "אתה גולל ב-${appName()} כבר ${Store.scrollMin} דקות ברצף."
            else -> "פתחת את ${appName()}. זו הפעם ה-$attempts היום."
        }
        root.add(label(why, 15f, C.MUTED).apply { textAlignment = View.TEXT_ALIGNMENT_CENTER })

        val circle = View(this).apply { background = rounded(C.ACCENT, dp(90).toFloat()) }
        root.add(circle, top = 36, w = dp(180), h = dp(180))
        pulse = ValueAnimator.ofFloat(0.55f, 1f).apply {
            duration = 4000
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener {
                val v = it.animatedValue as Float
                circle.scaleX = v
                circle.scaleY = v
                circle.alpha = 0.35f + 0.5f * v
            }
            start()
        }

        root.add(label("שאיפה איטית. נשיפה איטית.", 14f, C.MUTED).apply {
            textAlignment = View.TEXT_ALIGNMENT_CENTER
        }, top = 28)
        root.add(label(Store.affirmation(), 24f, C.FG, true).apply {
            textAlignment = View.TEXT_ALIGNMENT_CENTER
        }, top = 20)
        val count = label(seconds.toString(), 18f, C.ACCENT).apply {
            textAlignment = View.TEXT_ALIGNMENT_CENTER
        }
        root.add(count, top = 28)
        show(root)

        timer = object : CountDownTimer(seconds * 1000L, 1000L) {
            override fun onTick(left: Long) {
                count.text = ((left + 999) / 1000).toString()
            }

            override fun onFinish() = choose()
        }.start()
    }

    private fun choose() {
        stopTimers()
        val root = vbox(24)
        root.add(label(Store.affirmation(), 24f, C.FG, true), top = 24)

        nextUp()?.let { (kicker, text) ->
            val card = card()
            card.add(label(kicker, 12f, C.ACCENT, true))
            card.add(label(text, 17f), top = 4)
            root.add(card, top = 24)
        }

        root.add(sub("במקום זה"), top = 28)
        val lib = Store.library().randomOrNull()
        if (lib != null) {
            root.add(pill("מהספרייה שלך: ${lib.title}") {
                leaving = true
                Store.bump("walked")
                Apps.view(this, lib.url)
                finish()
            }, top = 10)
        }
        val good = Store.good().filter { Apps.installed(this, it) }.take(4)
        if (good.isNotEmpty()) {
            root.add(pillRow(good.map { g ->
                pill(Apps.label(this, g)) {
                    leaving = true
                    Store.bump("walked")
                    Apps.launch(this, g)
                    finish()
                }
            }), top = 10)
        }
        root.add(pillRow(listOf(
            pill("דקה של נשימה") { exercise("breath") },
            pill("שלוש תודות") { exercise("thanks") },
            pill("מבט על היעדים") { exercise("goals") },
        )), top = 10)

        root.add(pill("ויתרתי, חוזר למסלול", primary = true) {
            Store.bump("walked")
            goHome()
        }, top = 32)

        root.add(sub("ובכל זאת להמשיך ל-${appName()}"), top = 32)
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf(5, 10, 20).forEachIndexed { i, minutes ->
            row.addView(
                pill("$minutes דק'") {
                    leaving = true
                    Store.grantPass(pkg, minutes)
                    Store.bump("minutes", minutes)
                    Apps.launch(this, pkg)
                    finish()
                },
                LinearLayout.LayoutParams(0, WRAP, 1f).apply { if (i > 0) marginStart = dp(8) },
            )
        }
        root.add(row, top = 10)
        show(root)
    }

    /** What the plan says should be happening now: the next fixed slot, else the first open task. */
    private fun nextUp(): Pair<String, String>? {
        val day = Store.week()?.today() ?: return null
        val cal = java.util.Calendar.getInstance()
        val nowMin = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
        val slot = day.fixed.firstOrNull { (it.startMinute ?: -1) >= nowMin }
        if (slot != null && slot.startMinute!! - nowMin <= 60) {
            return "בעוד ${slot.startMinute!! - nowMin} דקות" to "${slot.time} ${slot.title}"
        }
        val task = day.items.firstOrNull { !Store.isDone(it.id) } ?: return null
        val est = if (task.estimate.isNotEmpty()) " · ${task.estimate}" else ""
        return "המשימה הבאה שלך$est" to task.title
    }

    private fun exercise(kind: String) {
        leaving = true
        Store.bump("walked")
        startActivity(Intent(this, ExerciseActivity::class.java).putExtra("kind", kind))
        finish()
    }

    private fun goHome() {
        leaving = true
        Apps.home(this)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = goHome()

    override fun onStop() {
        super.onStop()
        showing = ""
        stopTimers()
        // Leaving this screen any other way (home button, recents) must not reveal the app behind it.
        if (!leaving && !isFinishing) finish()
    }

    private fun stopTimers() {
        timer?.cancel()
        timer = null
        pulse?.cancel()
        pulse = null
    }

    companion object {
        /** Package the pause screen is currently up for, so repeated window events do not restart it. */
        @Volatile
        private var showing = ""
        private var lastPkg = ""
        private var lastAt = 0L

        fun start(c: Context, pkg: String, reason: String) {
            val now = System.currentTimeMillis()
            if (showing == pkg || (lastPkg == pkg && now - lastAt < 1500)) return
            lastPkg = pkg
            lastAt = now
            c.startActivity(
                Intent(c, InterceptActivity::class.java)
                    .putExtra("pkg", pkg)
                    .putExtra("reason", reason)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            )
        }
    }
}
