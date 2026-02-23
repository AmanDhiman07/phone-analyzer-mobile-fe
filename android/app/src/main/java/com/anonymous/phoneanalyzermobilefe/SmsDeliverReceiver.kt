package com.anonymous.phoneanalyzermobilefe

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SmsDeliverReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Needed for SMS role eligibility. Message processing can be added later.
  }
}
