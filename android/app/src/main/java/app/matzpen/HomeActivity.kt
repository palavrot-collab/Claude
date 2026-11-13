package app.matzpen

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.LinearLayout
import android.widget.TextClock
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** The home screen: time, an affirmation, today from the weekly plan, and a few good apps. No icons. */
class HomeActivity : Base() {

    private var affirmation = ""

    override fun onResume() {
        super.onResume()
        affirmation = Store.affirmation()
        Gray.update(this, false)
        render()
    }

    private fun render() {
        val root = vbox(24)

        val clock = TextClock(this).apply {
            format24Hour = "HH:mm"
            format12Hour = "HH:mm"
            textSize = 64f
            setTextColor(C.FG)
        }
        root.add(clock, top = 16)
        root.add(label(SimpleDateFormat("EEEE, d בMMMM", Locale("he")).format(Date()), 15f, C.MUTED))

        root.add(label(affirmation, 20f, C.ACCENT, true).apply {
            setOnClickListener {
                affirmation = Store.affirmation()
                render()
            }
        }, top = 22)

        if (!Apps.guardEnabled(this)) {
            root.add(label("שומר הקשב כבוי. הקש כדי להפעיל אותו בהגדרות הנגישות.", 14f, C.WARN).apply {
                setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
            }, top = 18)
        }

        root.add(today(), top = 24)

        val good = Store.good().filter { Apps.installed(this, it) }
        if (good.isNotEmpty()) {
            val box = vbox()
            good.forEach { pkg ->
                box.add(label(Apps.label(this, pkg), 19f).apply {
                    setPadding(0, dp(9), 0, dp(9))
                    setOnClickListener { Apps.open(this@HomeActivity, pkg) }
                })
            }
            root.add(box, top = 20)
        }

        // Pushes the navigation row to the bottom of the screen.
        root.add(View(this), h = 0, weight = 1f)
        root.add(pillRow(listOf(
            pill("Claude", primary = true) { Claude.open(this) },
            pill("אפליקציות") { go(AppsActivity::class.java) },
            pill("השבוע") { go(WeekActivity::class.java) },
            pill("ספרייה") { go(LibraryActivity::class.java) },
            pill("הגדרות") { go(SettingsActivity::class.java) },
        )), top = 24)
        show(root)
    }

    private fun today(): View {
        val card = card()
        val week = Store.week()
        val day = week?.today()
        if (week == null) {
            card.add(label("עוד אין לוח שבועי", 17f, C.FG, true))
            card.add(sub("פתח את הלוח השבועי ב-Claude ושלח אותו לכאן, או הדבק אותו דרך ההגדרות."), top = 4)
            return card
        }
        if (day == null) {
            card.add(label("הלוח השבועי לא מכסה את היום", 17f, C.FG, true))
            card.add(sub("הגיע הזמן לבריף חדש. הקש כדי לבקש אותו מ-Claude."), top = 4)
            card.setOnClickListener {
                Claude.open(this, "הלוח השבועי שלי נגמר. בוא נבנה את הלוח לשבוע הקרוב.")
            }
            return card
        }

        if (day.mode.isNotEmpty()) card.add(label(day.mode, 13f, C.MUTED))

        val cal = Calendar.getInstance()
        val nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val next = day.fixed.firstOrNull { (it.startMinute ?: -1) >= nowMin }
        day.fixed.forEach { f ->
            val start = f.startMinute
            val past = start != null && start < nowMin && f != next
            val color = when {
                f == next -> C.ACCENT
                past -> C.MUTED
                else -> C.FG
            }
            card.add(label("${f.time}  ${f.title}", 15f, color, f == next), top = 6)
        }

        val open = day.items.filter { !Store.isDone(it.id) }
        val closed = day.items.size - open.size
        if (day.items.isNotEmpty()) {
            card.add(sub("משימות · $closed מתוך ${day.items.size} נסגרו"), top = 14)
        }
        open.take(5).forEach { t -> card.add(taskRow(t) { render() }, top = 4) }
        if (open.size > 5) card.add(sub("ועוד ${open.size - 5} בלוח השבוע"), top = 6)
        if (day.items.isNotEmpty() && open.isEmpty()) {
            card.add(label("סגרת את כל המשימות של היום.", 15f, C.OK), top = 6)
        }
        return card
    }

    private fun go(cls: Class<*>) = startActivity(Intent(this, cls))

    // The home screen is the bottom of the stack: back does nothing.
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
    }
}

/** One task line: tap to mark it done, long-press for the note. Shared with the week screen. */
fun Base.taskRow(t: Task, onChange: () -> Unit): View {
    val done = Store.isDone(t.id)
    val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    row.addView(
        label(if (done) "✓" else "○", 18f, if (done) C.OK else C.MUTED),
        LinearLayout.LayoutParams(dp(28), WRAP),
    )
    val text = StringBuilder(t.title)
    if (t.estimate.isNotEmpty()) text.append("  ·  ").append(t.estimate)
    row.addView(
        label(text, 16f, if (done) C.MUTED else if (t.hot) C.WARN else C.FG),
        LinearLayout.LayoutParams(0, WRAP, 1f),
    )
    row.setPadding(0, dp(7), 0, dp(7))
    row.setOnClickListener {
        Store.toggleDone(t.id)
        onChange()
    }
    row.setOnLongClickListener {
        dialog()
            .setTitle(t.title)
            .setMessage(listOf(t.domain, t.note).filter { it.isNotEmpty() }.joinToString("\n\n"))
            .setPositiveButton("סגור", null)
            .setNeutralButton("לדבר על זה עם Claude") { _, _ ->
                Claude.open(this, "אני רוצה לעבוד עכשיו על: ${t.title}. ${t.note}\nעזור לי להתחיל.")
            }
            .show()
        true
    }
    return row
}
