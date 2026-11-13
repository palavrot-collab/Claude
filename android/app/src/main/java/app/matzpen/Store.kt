package app.matzpen

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class LibItem(val title: String, val url: String)

/** Everything the app remembers. Stored on the device only. */
object Store {
    private lateinit var p: SharedPreferences
    private var weekCache: Week? = null
    private var weekLoaded = false

    const val GRAY_OFF = 0
    const val GRAY_DISTRACTING = 1
    const val GRAY_HOURS = 2

    fun init(c: Context) {
        if (::p.isInitialized) return
        p = c.applicationContext.getSharedPreferences("matzpen", Context.MODE_PRIVATE)
        if (!p.contains("seeded")) seed(c)
    }

    private fun seed(c: Context) {
        val installed = Apps.all(c).map { it.pkg }.toSet()
        p.edit()
            .putBoolean("seeded", true)
            .putStringSet("distracting", DEFAULT_DISTRACTING.filter { it in installed }.toSet())
            .putString("good", JSONArray(DEFAULT_GOOD.filter { it in installed }).toString())
            .putString("affirmations", JSONArray(DEFAULT_AFFIRMATIONS).toString())
            .apply()
    }

    // ---- settings ----
    var delaySec: Int
        get() = p.getInt("delay", 10)
        set(v) = p.edit().putInt("delay", v).apply()

    /** Minutes of continuous scrolling before the stop screen; 0 turns it off. */
    var scrollMin: Int
        get() = p.getInt("scroll", 5)
        set(v) = p.edit().putInt("scroll", v).apply()

    var grayMode: Int
        get() = p.getInt("gray", GRAY_OFF)
        set(v) = p.edit().putInt("gray", v).apply()

    var grayFrom: Int
        get() = p.getInt("grayFrom", 21)
        set(v) = p.edit().putInt("grayFrom", v).apply()

    var grayTo: Int
        get() = p.getInt("grayTo", 7)
        set(v) = p.edit().putInt("grayTo", v).apply()

    // ---- app lists ----
    fun distracting(): Set<String> = HashSet(p.getStringSet("distracting", emptySet()) ?: emptySet())

    fun setDistracting(s: Set<String>) = p.edit().putStringSet("distracting", HashSet(s)).apply()

    fun isDistracting(pkg: String) = pkg in distracting()

    fun good(): List<String> = strings("good")

    fun setGood(list: List<String>) = p.edit().putString("good", JSONArray(list).toString()).apply()

    // ---- affirmations ----
    fun affirmations(): List<String> = strings("affirmations")

    fun setAffirmations(list: List<String>) =
        p.edit().putString("affirmations", JSONArray(list).toString()).apply()

    fun affirmation(): String = affirmations().randomOrNull() ?: "אני בוחר לאן הקשב שלי הולך."

    // ---- library ----
    fun library(): List<LibItem> {
        val arr = JSONArray(p.getString("library", "[]"))
        return (0 until arr.length()).map {
            val o = arr.getJSONObject(it)
            LibItem(o.optString("title"), o.optString("url"))
        }
    }

    fun setLibrary(list: List<LibItem>) {
        val arr = JSONArray()
        list.forEach { arr.put(JSONObject().put("title", it.title).put("url", it.url)) }
        p.edit().putString("library", arr.toString()).apply()
    }

    fun addLibrary(item: LibItem) = setLibrary(library().filter { it.url != item.url } + item)

    // ---- weekly plan ----
    fun week(): Week? {
        if (!weekLoaded) {
            weekCache = p.getString("week", null)?.let { WeekParser.parse(it) }
            weekLoaded = true
        }
        return weekCache
    }

    fun setWeek(w: Week) {
        p.edit().putString("week", w.toJson()).apply()
        weekCache = w
        weekLoaded = true
    }

    fun done(): Set<String> = HashSet(p.getStringSet("done", emptySet()) ?: emptySet())

    fun isDone(id: String) = id in done()

    fun toggleDone(id: String) {
        val s = HashSet(done())
        if (!s.add(id)) s.remove(id)
        p.edit().putStringSet("done", s).apply()
    }

    // ---- passes: a time-limited permission to use a distracting app ----
    fun passExpiry(pkg: String): Long = p.getLong("pass_$pkg", 0L)

    fun hasPass(pkg: String) = passExpiry(pkg) > System.currentTimeMillis()

    fun grantPass(pkg: String, minutes: Int) =
        p.edit().putLong("pass_$pkg", System.currentTimeMillis() + minutes * 60_000L).apply()

    fun revokePass(pkg: String) = p.edit().remove("pass_$pkg").apply()

    // ---- daily counters: attempts, walked (chose not to open), minutes (granted) ----
    fun stat(key: String): Int = p.getInt("stat_${dayKey()}_$key", 0)

    fun bump(key: String, by: Int = 1) =
        p.edit().putInt("stat_${dayKey()}_$key", stat(key) + by).apply()

    // ---- gratitude journal ----
    fun addGratitude(text: String) {
        val arr = JSONArray(p.getString("gratitude", "[]"))
        arr.put(JSONObject().put("date", dayKey()).put("text", text))
        p.edit().putString("gratitude", arr.toString()).apply()
    }

    fun gratitudeCount(): Int = JSONArray(p.getString("gratitude", "[]")).length()

    private fun strings(key: String): List<String> {
        val arr = JSONArray(p.getString(key, "[]"))
        return (0 until arr.length()).map { arr.getString(it) }
    }

    private val DEFAULT_DISTRACTING = listOf(
        "com.instagram.android",
        "com.instagram.barcelona",
        "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill",
        "com.facebook.katana",
        "com.google.android.youtube",
        "com.twitter.android",
        "com.snapchat.android",
        "com.reddit.frontpage",
        "com.pinterest",
        "com.linkedin.android",
    )

    private val DEFAULT_GOOD = listOf(
        "com.anthropic.claude",
        "com.amazon.kindle",
        "com.audible.application",
        "com.spotify.music",
        "com.google.android.apps.podcasts",
        "com.duolingo",
        "com.getsomeheadspace.android",
        "com.calm.android",
    )

    private val DEFAULT_AFFIRMATIONS = listOf(
        "אני בוחר לאן הקשב שלי הולך.",
        "הדבר הבא שלי כבר כתוב. אני פשוט עושה אותו.",
        "עשר דקות של עשייה שוות יותר משעה של גלילה.",
        "אני בונה משהו. הפיד יכול לחכות.",
        "מה שחשוב לי היום כבר מחכה לי בלו\"ז.",
        "אני נוכח במה שאני עושה עכשיו.",
        "כל פעם שאני עוצר, אני מתחזק.",
        "האנרגיה שלי הולכת למה שמקדם אותי.",
    )
}
