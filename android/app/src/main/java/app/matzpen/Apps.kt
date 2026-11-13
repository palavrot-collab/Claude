package app.matzpen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

object Apps {
    data class Info(val pkg: String, val label: String)

    private var cache: List<Info> = emptyList()
    private var cachedAt = 0L

    fun all(c: Context): List<Info> {
        val now = System.currentTimeMillis()
        if (cache.isNotEmpty() && now - cachedAt < 60_000) return cache
        val pm = c.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        cache = pm.queryIntentActivities(intent, 0)
            .map { Info(it.activityInfo.packageName, it.loadLabel(pm).toString()) }
            .filter { it.pkg != c.packageName }
            .distinctBy { it.pkg }
            .sortedBy { it.label.lowercase() }
        cachedAt = now
        return cache
    }

    fun label(c: Context, pkg: String): String = try {
        val pm = c.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
        pkg
    }

    fun installed(c: Context, pkg: String) = c.packageManager.getLaunchIntentForPackage(pkg) != null

    /** Opens an app from the launcher. Distracting apps go through the pause screen first. */
    fun open(c: Context, pkg: String) {
        if (Store.isDistracting(pkg) && !Store.hasPass(pkg)) InterceptActivity.start(c, pkg, "open")
        else launch(c, pkg)
    }

    fun launch(c: Context, pkg: String) {
        val i = c.packageManager.getLaunchIntentForPackage(pkg)
        if (i == null) {
            c.toast("האפליקציה לא מותקנת")
            return
        }
        c.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun home(c: Context) {
        c.startActivity(
            Intent(c, HomeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    fun view(c: Context, url: String) {
        try {
            c.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (e: Exception) {
            c.toast("אין אפליקציה שפותחת את הקישור הזה")
        }
    }

    fun guardEnabled(c: Context): Boolean {
        val enabled = Settings.Secure.getString(
            c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabled.contains(c.packageName + "/")
    }
}

/** Hands the current state of the day to the Claude app, so the conversation starts with context. */
object Claude {
    private const val PKG = "com.anthropic.claude"

    fun open(c: Context, ask: String? = null) {
        val text = brief(ask)
        // Kept on the clipboard as a fallback in case the Claude app ignores the shared text.
        val clip = c.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clip.setPrimaryClip(ClipData.newPlainText("מצפן", text))
        val send = Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_TEXT, text)
            .setPackage(PKG)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            c.startActivity(send)
            return
        } catch (e: Exception) {
            // Falls through to opening the app, or the website when it is not installed.
        }
        val launch = c.packageManager.getLaunchIntentForPackage(PKG)
        if (launch != null) {
            c.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            c.toast("התקציר הועתק. הדבק אותו בשיחה")
        } else {
            Apps.view(c, "https://claude.ai/new")
        }
    }

    fun brief(ask: String?): String {
        val sb = StringBuilder()
        val now = Date()
        sb.append("אתה העוזר האישי שלי. זה המצב שלי כרגע, מתוך מסך הבית של הטלפון.\n\n")
        sb.append("עכשיו: ")
            .append(SimpleDateFormat("EEEE d.M.yyyy, HH:mm", Locale("he")).format(now))
            .append("\n")
        val week = Store.week()
        val day = week?.today()
        if (week == null) {
            sb.append("אין לי כרגע לוח שבועי טעון.\n")
        } else if (day == null) {
            sb.append("הלוח השבועי שטעון (").append(week.title).append(") לא מכסה את היום.\n")
        } else {
            if (day.mode.isNotEmpty()) sb.append("כותרת היום: ").append(day.mode).append("\n")
            if (day.fixed.isNotEmpty()) {
                sb.append("\nקבוע בלו\"ז היום:\n")
                day.fixed.forEach { sb.append("- ").append(it.time).append(" ").append(it.title).append("\n") }
            }
            val open = day.items.filter { !Store.isDone(it.id) }
            val closed = day.items.filter { Store.isDone(it.id) }
            if (open.isNotEmpty()) {
                sb.append("\nמשימות פתוחות להיום:\n")
                open.forEach {
                    sb.append("- ").append(it.title)
                    if (it.estimate.isNotEmpty()) sb.append(" (").append(it.estimate).append(")")
                    if (it.hot) sb.append(" [תלוי בזמן]")
                    sb.append("\n")
                }
            }
            if (closed.isNotEmpty()) {
                sb.append("\nכבר סגרתי היום:\n")
                closed.forEach { sb.append("- ").append(it.title).append("\n") }
            }
        }
        if (week != null && week.goals.isNotEmpty()) {
            sb.append("\nמה ייחשב הצלחה השבוע:\n")
            week.goals.forEach { sb.append("- ").append(it.title).append("\n") }
        }
        sb.append("\nהסחות היום: ניסיתי לפתוח אפליקציה מסיחה ")
            .append(Store.stat("attempts")).append(" פעמים, ויתרתי ")
            .append(Store.stat("walked")).append(" פעמים, והקצבתי לעצמי ")
            .append(Store.stat("minutes")).append(" דקות.\n\n")
        sb.append(ask ?: "עזור לי לבחור את הדבר הבא ולהתחיל אותו. שאל אותי שאלה אחת אם משהו חסר.")
        return sb.toString()
    }
}

/** Greyscale through the system colour-correction setting. Needs a one-time adb grant. */
object Gray {
    fun allowed(c: Context) =
        c.checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") ==
            PackageManager.PERMISSION_GRANTED

    fun update(c: Context, inDistracting: Boolean) {
        val on = when (Store.grayMode) {
            Store.GRAY_DISTRACTING -> inDistracting
            Store.GRAY_HOURS -> inHours()
            else -> false
        }
        set(c, on)
    }

    private fun inHours(): Boolean {
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val from = Store.grayFrom
        val to = Store.grayTo
        return if (from <= to) h in from until to else h >= from || h < to
    }

    fun set(c: Context, on: Boolean) {
        if (!allowed(c)) return
        try {
            val cr = c.contentResolver
            val current = Settings.Secure.getInt(cr, "accessibility_display_daltonizer_enabled", 0) == 1
            if (current == on) return
            if (on) Settings.Secure.putInt(cr, "accessibility_display_daltonizer", 0)
            Settings.Secure.putInt(cr, "accessibility_display_daltonizer_enabled", if (on) 1 else 0)
        } catch (e: Exception) {
            // The grant was removed; the setting simply stays as it is.
        }
    }
}
