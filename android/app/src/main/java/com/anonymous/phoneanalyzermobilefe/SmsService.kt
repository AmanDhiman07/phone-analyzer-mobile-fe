package com.anonymous.phoneanalyzermobilefe

import android.app.Service
import android.content.Intent
import android.os.IBinder

class SmsService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null
}
