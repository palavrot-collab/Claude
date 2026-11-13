package app.matzpen

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

/**
 * Watches which app is in front and how long the user keeps scrolling in a distracting one.
 * It only looks at the package name and the event type, never at what is on the screen.
 */
class GuardService : AccessibilityService() {

    private val handler = Handler(Looper.getMainLooper())
    private var current = ""
    private var lastScroll = 0L
    private var scrolled = 0L
    private var expiryCheck: Runnable? = null

    override fun onServiceConnected() {
        Store.init(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return
        Store.init(this)
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> onWindow(pkg)
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> onScroll(pkg)
        }
    }

    private fun onWindow(pkg: String) {
        // Keyboards, the notification shade and system dialogs are not an app switch.
        val isApp = pkg == packageName || Apps.all(this).any { it.pkg == pkg }
        if (!isApp) return
        if (pkg != current) {
            current = pkg
            lastScroll = 0L
            scrolled = 0L
        }
        val distracting = pkg != packageName && Store.isDistracting(pkg)
        Gray.update(this, distracting)
        expiryCheck?.let { handler.removeCallbacks(it) }
        expiryCheck = null
        if (!distracting) return
        if (!Store.hasPass(pkg)) {
            InterceptActivity.start(this, pkg, "open")
            return
        }
        // The pass is still running: come back when it ends.
        val check = Runnable {
            if (current == pkg && !Store.hasPass(pkg)) InterceptActivity.start(this, pkg, "time")
        }
        expiryCheck = check
        handler.postDelayed(check, Store.passExpiry(pkg) - System.currentTimeMillis() + 500)
    }

    private fun onScroll(pkg: String) {
        val limit = Store.scrollMin
        if (limit <= 0 || pkg != current || !Store.isDistracting(pkg)) return
        val now = System.currentTimeMillis()
        // Scroll events less than 20 seconds apart count as one continuous stretch.
        if (lastScroll != 0L && now - lastScroll < 20_000) scrolled += now - lastScroll
        else if (lastScroll != 0L && now - lastScroll > 120_000) scrolled = 0L
        lastScroll = now
        if (scrolled >= limit * 60_000L) {
            scrolled = 0L
            lastScroll = 0L
            Store.revokePass(pkg)
            InterceptActivity.start(this, pkg, "scroll")
        }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        expiryCheck?.let { handler.removeCallbacks(it) }
        Gray.set(this, false)
        super.onDestroy()
    }
}
