package app.matzpen

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class Fixed(val time: String, val title: String) {
    /** Minutes since midnight when the label starts with HH:mm, otherwise null ("בוקר", "מוצע"). */
    val startMinute: Int?
        get() {
            val m = Regex("^(\\d{1,2}):(\\d{2})").find(time.trim()) ?: return null
            return m.groupValues[1].toInt() * 60 + m.groupValues[2].toInt()
        }
}

data class Task(
    val id: String,
    val domain: String,
    val title: String,
    val note: String,
    val estimate: String,
    val hot: Boolean,
)

data class Day(
    val name: String,
    val date: String,
    val mode: String,
    val fixed: List<Fixed>,
    val items: List<Task>,
)

data class Goal(val title: String, val note: String)

data class Week(val title: String, val goals: List<Goal>, val days: List<Day>) {
    fun today(): Day? = days.firstOrNull { it.date == dayKey() }

    fun toJson(): String {
        val root = JSONObject()
        root.put("v", 1)
        root.put("title", title)
        root.put("goals", JSONArray().apply {
            goals.forEach { put(JSONObject().put("t", it.title).put("p", it.note)) }
        })
        root.put("days", JSONArray().apply {
            days.forEach { d ->
                put(JSONObject().apply {
                    put("name", d.name)
                    put("date", d.date)
                    put("mode", d.mode)
                    put("fixed", JSONArray().apply {
                        d.fixed.forEach { put(JSONArray().put(it.time).put(it.title)) }
                    })
                    put("items", JSONArray().apply {
                        d.items.forEach {
                            put(JSONObject().apply {
                                put("id", it.id)
                                put("d", it.domain)
                                put("t", it.title)
                                put("p", it.note)
                                put("m", it.estimate)
                                put("hot", if (it.hot) 1 else 0)
                            })
                        }
                    })
                })
            }
        })
        return root.toString()
    }
}

fun dayKey(date: Date = Date()): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

/**
 * Reads a weekly plan from any of the shapes it can arrive in:
 *  1. JSON object `{title, goals:[{t,p}], days:[...]}` (the format this app stores),
 *  2. a bare JSON array of days,
 *  3. the HTML source of the weekly board artifact, where the days live in `const D=[...]`
 *     as a JavaScript literal with unquoted keys.
 * A day is `{name, date?, mode, fixed:[[time,title]], items:[{id,d,t,p,m,hot}]}`.
 */
object WeekParser {
    private const val NONE = '\u0000'

    fun parse(raw: String): Week? {
        val text = raw.trim()
        return try {
            when {
                text.startsWith("{") -> fromObject(JSONObject(JSONTokener(text)))
                text.startsWith("[") -> build("", emptyList(), JSONArray(JSONTokener(text)))
                else -> fromHtml(text)
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun fromObject(o: JSONObject): Week? {
        val days = o.optJSONArray("days") ?: return null
        val goals = ArrayList<Goal>()
        val g = o.optJSONArray("goals")
        if (g != null) for (i in 0 until g.length()) {
            val item = g.opt(i)
            if (item is JSONObject) goals.add(Goal(item.optString("t"), item.optString("p")))
            else if (item != null) goals.add(Goal(item.toString(), ""))
        }
        return build(o.optString("title"), goals, days)
    }

    private fun fromHtml(html: String): Week? {
        val start = Regex("(?:const|let|var)\\s+D\\s*=\\s*\\[").find(html) ?: return null
        val literal = balanced(html, start.range.last) ?: return null
        val title = Regex("<title>(.*?)</title>", RegexOption.DOT_MATCHES_ALL)
            .find(html)?.groupValues?.get(1)?.trim().orEmpty()
        val goals = Regex(
            "class=\"gl\">\\s*<b>(.*?)</b>\\s*<span>(.*?)</span>",
            RegexOption.DOT_MATCHES_ALL,
        ).findAll(html).map { Goal(plain(it.groupValues[1]), plain(it.groupValues[2])) }.toList()
        return build(title, goals, JSONArray(JSONTokener(literal)))
    }

    /** Returns the `[...]` that opens at [open], skipping brackets that sit inside strings. */
    private fun balanced(s: String, open: Int): String? {
        var depth = 0
        var quote = NONE
        var i = open
        while (i < s.length) {
            val ch = s[i]
            if (quote != NONE) {
                if (ch == '\\') i++ else if (ch == quote) quote = NONE
            } else when (ch) {
                '"', '\'', '`' -> quote = ch
                '[' -> depth++
                ']' -> {
                    depth--
                    if (depth == 0) return s.substring(open, i + 1)
                }
            }
            i++
        }
        return null
    }

    private fun plain(html: String): String =
        html.replace(Regex("<[^>]+>"), "").replace("&quot;", "\"").replace("&amp;", "&").trim()

    private fun build(title: String, goals: List<Goal>, arr: JSONArray): Week? {
        val days = ArrayList<Day>()
        for (i in 0 until arr.length()) {
            val d = arr.optJSONObject(i) ?: continue
            val name = d.optString("name")
            val fixed = ArrayList<Fixed>()
            val f = d.optJSONArray("fixed")
            if (f != null) for (j in 0 until f.length()) {
                val pair = f.optJSONArray(j) ?: continue
                fixed.add(Fixed(pair.optString(0), pair.optString(1)))
            }
            val items = ArrayList<Task>()
            val it = d.optJSONArray("items")
            if (it != null) for (j in 0 until it.length()) {
                val x = it.optJSONObject(j) ?: continue
                val t = x.optString("t")
                if (t.isEmpty()) continue
                items.add(
                    Task(
                        id = x.optString("id").ifEmpty { "t$i-$j" },
                        domain = x.optString("d"),
                        title = t,
                        note = x.optString("p"),
                        estimate = x.optString("m"),
                        hot = x.optInt("hot", 0) == 1 || x.optBoolean("hot", false),
                    )
                )
            }
            val date = d.optString("date").ifEmpty { dateFromName(name) }
            days.add(Day(name, date, d.optString("mode"), fixed, items))
        }
        if (days.isEmpty()) return null
        return Week(title, goals, days)
    }

    /** "שני 9.11" -> "2026-11-09", choosing the year that puts the date closest to today. */
    private fun dateFromName(name: String): String {
        val m = Regex("(\\d{1,2})\\.(\\d{1,2})").find(name) ?: return ""
        val day = m.groupValues[1].toInt()
        val month = m.groupValues[2].toInt()
        val now = Calendar.getInstance()
        var best = ""
        var bestGap = Long.MAX_VALUE
        for (year in now.get(Calendar.YEAR) - 1..now.get(Calendar.YEAR) + 1) {
            val c = Calendar.getInstance()
            c.clear()
            c.set(year, month - 1, day)
            val gap = Math.abs(c.timeInMillis - now.timeInMillis)
            if (gap < bestGap) {
                bestGap = gap
                best = dayKey(c.time)
            }
        }
        return best
    }
}
