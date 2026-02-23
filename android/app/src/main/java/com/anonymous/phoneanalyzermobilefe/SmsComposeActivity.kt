package com.anonymous.phoneanalyzermobilefe

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class SmsComposeActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Minimal compose entrypoint so the app satisfies default SMS role requirements.
    val launchMain = Intent(this, MainActivity::class.java).apply {
      action = intent?.action
      data = intent?.data
      intent?.extras?.let { putExtras(it) }
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }

    startActivity(launchMain)
    finish()
  }
}
