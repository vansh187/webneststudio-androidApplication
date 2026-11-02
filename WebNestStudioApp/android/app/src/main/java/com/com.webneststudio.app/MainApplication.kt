package com.webneststudio.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * Channels the backend targets by id (services/push_service.py). Created up
   * front so pushes that arrive while the app has never been opened since
   * install still land in the right channel, with its own user toggle.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    manager.createNotificationChannels(
      listOf(
        NotificationChannel("chat", "Chat messages", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "New messages in your project chats and direct messages"
        },
        NotificationChannel("blog", "New blog posts", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "When WebNest Studio publishes a new article"
        },
      ),
    )
  }
}
