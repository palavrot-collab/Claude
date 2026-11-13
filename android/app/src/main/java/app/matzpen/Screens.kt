package app.matzpen

import android.animation.ValueAnimator
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.CountDownTimer
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout

fun Context.field(hint: String, multiline: Boolean = false): EditText = EditText(this).apply {
    this.hint = hint
    setTextColor(C.FG)
    setHintTextColor(C.MUTED)
    textSize = 17f
    textAlignment = View.TEXT_ALIGNMENT_VIEW_START
    inputType = if (multiline) {
        InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
    } else InputType.TYPE_CLASS_TEXT
}

/** All apps as a text list with search. Distracting apps only appear once you type their name. */
class AppsActivity : Base() {
    private lateinit var list: LinearLayout
    private var query = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = vbox(24)
        val search = field("חיפוש אפליקציה")
        search.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                query = s?.toString()?.trim().orEmpty()
                fill()
            }
        })
        root.add(search)
        list = vbox()
        root.add(list, top = 12)
        show(root)
        search.requestFocus()
    }

    override fun onResume() {
        super.onResume()
        fill()
    }

    private fun fill() {
        list.removeAllViews()
        val distracting = Store.distracting()
        val apps = Apps.all(this).filter {
            if (query.length >= 2) it.label.contains(query, ignoreCase = true)
            else it.pkg !in distracting && (query.isEmpty() || it.label.contains(query, true))
        }
        apps.forEach { app ->
            val mark = if (app.pkg in distracting) "  ·  עם השהיה" else ""
            list.add(label(app.label + mark, 18f, if (app.pkg in distracting) C.MUTED else C.FG).apply {
                setPadding(0, dp(11), 0, dp(11))
                setOnClickListener {
                    Apps.open(this@AppsActivity, app.pkg)
                    finish()
                }
                setOnLongClickListener {
                    options(app)
                    true
                }
            })
        }
        if (query.length < 2 && distracting.isNotEmpty()) {
            list.add(sub("אפליקציות מסיחות מוסתרות. הקלד את השם כדי למצוא אותן."), top = 16)
        }
    }

    private fun options(app: Apps.Info) {
        val isDistracting = Store.isDistracting(app.pkg)
        val isGood = app.pkg in Store.good()
        val items = arrayOf(
            if (isDistracting) "להסיר מהמסיחות" else "לסמן כמסיחה",
            if (isGood) "להסיר ממסך הבית" else "להצמיד למסך הבית",
            "פרטי האפליקציה",
        )
        dialog().setTitle(app.label).setItems(items) { _, which ->
            when (which) {
                0 -> {
                    val s = HashSet(Store.distracting())
                    if (isDistracting) s.remove(app.pkg) else s.add(app.pkg)
                    Store.setDistracting(s)
                }
                1 -> Store.setGood(
                    if (isGood) Store.good() - app.pkg else Store.good() + app.pkg
                )
                2 -> startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${app.pkg}"))
                )
            }
            fill()
        }.show()
    }
}

/** The whole weekly plan: what counts as success, then each day with its fixed slots and tasks. */
class WeekActivity : Base() {
    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val root = vbox(24)
        val week = Store.week()
        if (week == null) {
            root.add(heading("השבוע"))
            root.add(sub("עוד לא נטען לוח שבועי. אפשר להדביק אותו דרך ההגדרות."), top = 8)
            show(root)
            return
        }
        root.add(heading(week.title.ifEmpty { "השבוע" }))
        if (week.goals.isNotEmpty()) {
            root.add(sub("מה ייחשב הצלחה"), top = 18)
            week.goals.forEach { g ->
                val card = card()
                card.add(label(g.title, 16f, C.FG, true))
                if (g.note.isNotEmpty()) card.add(sub(g.note), top = 2)
                root.add(card, top = 8)
            }
        }
        val today = dayKey()
        week.days.forEach { d ->
            root.add(label(d.name, 21f, if (d.date == today) C.ACCENT else C.FG, true), top = 28)
            if (d.mode.isNotEmpty()) root.add(sub(d.mode))
            d.fixed.forEach { root.add(label("${it.time}  ${it.title}", 15f, C.MUTED), top = 4) }
            d.items.forEach { t -> root.add(taskRow(t) { render() }, top = 4) }
        }
        show(root)
    }
}

/** Things worth the attention: links the user saved, offered instead of a feed. */
class LibraryActivity : Base() {
    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val root = vbox(24)
        root.add(heading("הספרייה שלי"))
        root.add(sub("פודקאסטים, מאמרים, סרטונים וקורסים שבחרת מראש. שיתוף קישור מכל אפליקציה אל \"שלח למצפן\" מוסיף אותו לכאן."), top = 6)
        val items = Store.library()
        items.forEach { item ->
            val card = card()
            card.add(label(item.title, 17f, C.FG, true))
            card.add(sub(Uri.parse(item.url).host ?: item.url), top = 2)
            card.setOnClickListener { Apps.view(this, item.url) }
            card.setOnLongClickListener {
                dialog().setTitle(item.title)
                    .setPositiveButton("למחוק") { _, _ ->
                        Store.setLibrary(Store.library().filter { it.url != item.url })
                        render()
                    }
                    .setNegativeButton("ביטול", null).show()
                true
            }
            root.add(card, top = 10)
        }
        root.add(pill("להוסיף קישור", primary = true) { addDialog() }, top = 20)
        show(root)
    }

    private fun addDialog() {
        val box = vbox(20)
        val title = field("שם")
        val url = field("קישור (https://...)")
        box.add(title)
        box.add(url, top = 8)
        dialog().setTitle("פריט חדש").setView(box)
            .setPositiveButton("שמור") { _, _ ->
                var u = url.text.toString().trim()
                if (u.isEmpty()) return@setPositiveButton
                if (!u.contains("://")) u = "https://$u"
                Store.addLibrary(LibItem(title.text.toString().trim().ifEmpty { u }, u))
                render()
            }
            .setNegativeButton("ביטול", null).show()
    }
}

/** A one-minute thing to do instead of opening the feed. */
class ExerciseActivity : Base() {
    private var timer: CountDownTimer? = null
    private var pulse: ValueAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        when (intent.getStringExtra("kind")) {
            "thanks" -> thanks()
            "goals" -> goals()
            else -> breath()
        }
    }

    private fun breath() {
        val root = vbox(28).apply { gravity = Gravity.CENTER }
        val phase = label("שאיפה", 26f, C.FG, true).apply { textAlignment = View.TEXT_ALIGNMENT_CENTER }
        val circle = View(this).apply { background = rounded(C.ACCENT, dp(100).toFloat()) }
        val left = label("60", 16f, C.MUTED).apply { textAlignment = View.TEXT_ALIGNMENT_CENTER }
        root.add(phase)
        root.add(circle, top = 40, w = dp(200), h = dp(200))
        root.add(left, top = 40)
        show(root)
        // Ten-second cycle: four in, six out.
        pulse = ValueAnimator.ofFloat(0f, 10f).apply {
            duration = 10_000
            repeatCount = ValueAnimator.INFINITE
            interpolator = android.view.animation.LinearInterpolator()
            addUpdateListener {
                val t = it.animatedValue as Float
                val scale = if (t < 4f) 0.5f + 0.5f * (t / 4f) else 1f - 0.5f * ((t - 4f) / 6f)
                circle.scaleX = scale
                circle.scaleY = scale
                phase.text = if (t < 4f) "שאיפה" else "נשיפה"
            }
            start()
        }
        timer = object : CountDownTimer(60_000, 1000) {
            override fun onTick(ms: Long) {
                left.text = ((ms + 999) / 1000).toString()
            }

            override fun onFinish() {
                pulse?.cancel()
                finished("דקה שלמה שלך. מה הדבר הבא?")
            }
        }.start()
    }

    private fun thanks() {
        val root = vbox(24)
        root.add(heading("שלוש תודות"))
        root.add(sub("שלושה דברים מהיום שאתה מודה עליהם. נשמר רק אצלך. עד עכשיו כתבת ${Store.gratitudeCount()}."), top = 6)
        val fields = (1..3).map { field("$it.", multiline = true) }
        fields.forEach { root.add(it, top = 12) }
        root.add(pill("שמור", primary = true) {
            val text = fields.map { it.text.toString().trim() }.filter { it.isNotEmpty() }
            if (text.isNotEmpty()) Store.addGratitude(text.joinToString("\n"))
            finished("נשמר. מה הדבר הבא?")
        }, top = 20)
        show(root)
    }

    private fun goals() {
        val root = vbox(24)
        root.add(heading("מה חשוב השבוע"))
        val week = Store.week()
        if (week == null || week.goals.isEmpty()) {
            root.add(sub("אין יעדים בלוח השבועי שנטען."), top = 8)
        } else week.goals.forEach { g ->
            val card = card()
            card.add(label(g.title, 16f, C.FG, true))
            if (g.note.isNotEmpty()) card.add(sub(g.note), top = 2)
            root.add(card, top = 8)
        }
        week?.today()?.items?.filter { !Store.isDone(it.id) }?.let { open ->
            if (open.isNotEmpty()) root.add(sub("פתוח להיום"), top = 22)
            open.forEach { t -> root.add(taskRow(t) { goals() }, top = 4) }
        }
        root.add(pill("לתכנן את ההמשך עם Claude", primary = true) {
            Claude.open(this)
            finish()
        }, top = 24)
        root.add(pill("חזרה הביתה") { home() }, top = 10)
        show(root)
    }

    private fun finished(message: String) {
        val root = vbox(28).apply { gravity = Gravity.CENTER }
        root.add(label(message, 22f, C.FG, true).apply { textAlignment = View.TEXT_ALIGNMENT_CENTER })
        root.add(pill("חזרה הביתה", primary = true) { home() }, top = 28)
        show(root)
    }

    private fun home() {
        Apps.home(this)
        finish()
    }

    override fun onDestroy() {
        timer?.cancel()
        pulse?.cancel()
        super.onDestroy()
    }
}

/**
 * Entry point for things sent to the app from outside: a weekly plan (deep link
 * `matzpen://week?d=<base64url JSON>`, shared text, or a shared file) or a link for the library.
 */
class ImportActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Store.init(this)
        try {
            handle()
        } catch (e: Exception) {
            toast("לא הצלחתי לקרוא את מה שנשלח")
        }
        finish()
    }

    private fun handle() {
        val i = intent
        var text: String? = null
        var subject: String? = null
        if (i.action == Intent.ACTION_VIEW) {
            val data = i.data
            if (data?.scheme == "matzpen") {
                val d = data.getQueryParameter("d")
                if (d != null) text = String(
                    android.util.Base64.decode(d, android.util.Base64.URL_SAFE), Charsets.UTF_8
                )
            } else if (data != null) text = read(data)
        } else if (i.action == Intent.ACTION_SEND) {
            subject = i.getStringExtra(Intent.EXTRA_SUBJECT)
            text = i.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
            if (text == null) {
                @Suppress("DEPRECATION")
                val stream = i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                if (stream != null) text = read(stream)
            }
        }
        toast(Importer.take(text, subject))
    }

    private fun read(uri: Uri): String? =
        contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) }
}

object Importer {
    /** Stores whatever [text] turns out to be and returns the message to show the user. */
    fun take(text: String?, subject: String? = null): String {
        if (text.isNullOrBlank()) return "לא התקבל תוכן"
        val week = WeekParser.parse(text)
        if (week != null) {
            Store.setWeek(week)
            val tasks = week.days.sumOf { it.items.size }
            return "הלוח השבועי נטען: ${week.days.size} ימים, $tasks משימות"
        }
        val url = Regex("https?://\\S+").find(text)?.value
        if (url != null) {
            val title = subject?.trim().orEmpty()
                .ifEmpty { text.replace(url, "").trim().lines().firstOrNull().orEmpty() }
                .ifEmpty { Uri.parse(url).host ?: url }
            Store.addLibrary(LibItem(title, url))
            return "נוסף לספרייה: $title"
        }
        return "לא זיהיתי לוח שבועי או קישור"
    }
}

class SettingsActivity : Base() {
    override fun onResume() {
        super.onResume()
        render()
    }

    private fun row(root: LinearLayout, title: String, value: String, onClick: () -> Unit) {
        val card = card()
        card.add(label(title, 16f, C.FG, true))
        if (value.isNotEmpty()) card.add(sub(value), top = 2)
        card.setOnClickListener { onClick() }
        root.add(card, top = 10)
    }

    private fun render() {
        val root = vbox(24)
        root.add(heading("הגדרות"))

        root.add(sub("הפעלה"), top = 18)
        row(root, "שומר הקשב (שירות נגישות)",
            if (Apps.guardEnabled(this)) "פעיל" else "כבוי. בלי זה ההשהיה פועלת רק כשפותחים אפליקציה מתוך מצפן") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        row(root, "מסך הבית של הטלפון", "לבחור את מצפן כאפליקציית הבית") {
            startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
        }

        root.add(sub("לוח שבועי"), top = 22)
        val week = Store.week()
        row(root, "להדביק לוח שבועי מהלוח",
            week?.let { "נטען: ${it.title.ifEmpty { "ללא שם" }}" } ?: "עוד לא נטען לוח") {
            val clip = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val text = clip.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)
            toast(Importer.take(text?.toString()))
            render()
        }

        root.add(sub("חיכוך"), top = 22)
        row(root, "אפליקציות מסיחות", "${Store.distracting().size} מסומנות") {
            pickApps("אפליקציות מסיחות", Store.distracting()) { Store.setDistracting(it) }
        }
        row(root, "השהיה לפני פתיחה", "${Store.delaySec} שניות, ועוד 5 על כל ניסיון נוסף באותו יום") {
            choose("השהיה לפני פתיחה", listOf(5, 10, 15, 20, 30), "שניות") { Store.delaySec = it }
        }
        row(root, "עצירה אחרי גלילה רצופה",
            if (Store.scrollMin == 0) "כבוי" else "אחרי ${Store.scrollMin} דקות") {
            choose("עצירה אחרי גלילה רצופה", listOf(0, 2, 3, 5, 10, 15), "דקות") { Store.scrollMin = it }
        }
        val grayNames = arrayOf("כבוי", "בתוך אפליקציות מסיחות", "לפי שעות")
        val grayValue = grayNames[Store.grayMode] +
            (if (Store.grayMode == Store.GRAY_HOURS) " (${Store.grayFrom}:00 עד ${Store.grayTo}:00)" else "") +
            (if (!Gray.allowed(this)) ". דורש הרשאה חד-פעמית דרך מחשב, ראה README" else "")
        row(root, "גווני אפור", grayValue) {
            dialog().setTitle("גווני אפור")
                .setSingleChoiceItems(grayNames, Store.grayMode) { d, which ->
                    Store.grayMode = which
                    Gray.update(this, false)
                    d.dismiss()
                    if (which == Store.GRAY_HOURS) hours() else render()
                }.show()
        }

        root.add(sub("תוכן"), top = 22)
        row(root, "אפליקציות במסך הבית", "${Store.good().size} מוצמדות") {
            pickApps("אפליקציות במסך הבית", Store.good().toSet()) { picked ->
                // Keeps the existing order and appends what is new.
                Store.setGood(Store.good().filter { it in picked } + (picked - Store.good().toSet()))
            }
        }
        row(root, "אפירמציות", "${Store.affirmations().size} משפטים, אחד בכל שורה") { editAffirmations() }
        row(root, "הספרייה שלי", "${Store.library().size} פריטים") {
            startActivity(Intent(this, LibraryActivity::class.java))
        }

        root.add(sub("היום: ${Store.stat("attempts")} ניסיונות, ${Store.stat("walked")} ויתורים, ${Store.stat("minutes")} דקות שהוקצבו"), top = 26)
        show(root)
    }

    private fun choose(title: String, values: List<Int>, unit: String, set: (Int) -> Unit) {
        val names = values.map { if (it == 0) "כבוי" else "$it $unit" }.toTypedArray()
        dialog().setTitle(title).setItems(names) { _, which ->
            set(values[which])
            render()
        }.show()
    }

    private fun hours() {
        val names = (0..23).map { "$it:00" }.toTypedArray()
        dialog().setTitle("אפור החל מ-").setItems(names) { _, from ->
            Store.grayFrom = from
            dialog().setTitle("ועד").setItems(names) { _, to ->
                Store.grayTo = to
                Gray.update(this, false)
                render()
            }.show()
        }.show()
    }

    private fun pickApps(title: String, selected: Set<String>, save: (Set<String>) -> Unit) {
        val apps = Apps.all(this)
        val checked = BooleanArray(apps.size) { apps[it].pkg in selected }
        dialog().setTitle(title)
            .setMultiChoiceItems(apps.map { it.label }.toTypedArray(), checked) { _, which, on ->
                checked[which] = on
            }
            .setPositiveButton("שמור") { _, _ ->
                save(apps.filterIndexed { i, _ -> checked[i] }.map { it.pkg }.toSet())
                render()
            }
            .setNegativeButton("ביטול", null).show()
    }

    private fun editAffirmations() {
        val box = vbox(20)
        val edit = field("משפט בכל שורה", multiline = true)
        edit.setText(Store.affirmations().joinToString("\n"))
        box.add(edit)
        dialog().setTitle("אפירמציות").setView(box)
            .setPositiveButton("שמור") { _, _ ->
                Store.setAffirmations(edit.text.toString().lines().map { it.trim() }.filter { it.isNotEmpty() })
                render()
            }
            .setNegativeButton("ביטול", null).show()
    }
}
