package com.anonymous.phoneanalyzermobilefe

import android.Manifest
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.CallLog
import android.provider.Settings
import android.provider.Telephony
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject

class CallLogRestoreModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CallLogRestore"

  @ReactMethod
  fun isDefaultDialer(promise: Promise) {
    try {
      val telecomManager = reactContext.getSystemService(TelecomManager::class.java)
      val isDefault = telecomManager?.defaultDialerPackage == reactContext.packageName
      promise.resolve(isDefault)
    } catch (error: Exception) {
      promise.reject("ERR_DEFAULT_DIALER_CHECK", error)
    }
  }

  @ReactMethod
  fun openDefaultDialerSettings(promise: Promise) {
    try {
      val dialerIntent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
        putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactContext.packageName)
      }
      val fallbackIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)

      val activity = getCurrentActivity()
      when {
        dialerIntent.resolveActivity(reactContext.packageManager) != null -> {
          if (activity != null) {
            activity.startActivity(dialerIntent)
          } else {
            dialerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(dialerIntent)
          }
          promise.resolve(true)
        }
        fallbackIntent.resolveActivity(reactContext.packageManager) != null -> {
          if (activity != null) {
            activity.startActivity(fallbackIntent)
          } else {
            fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(fallbackIntent)
          }
          promise.resolve(true)
        }
        else -> {
          promise.reject("ERR_OPEN_DEFAULT_DIALER", "No settings activity found for default apps.")
        }
      }
    } catch (error: Exception) {
      promise.reject("ERR_OPEN_DEFAULT_DIALER", error)
    }
  }

  @ReactMethod
  fun isDefaultSmsApp(promise: Promise) {
    try {
      val currentDefault = Telephony.Sms.getDefaultSmsPackage(reactContext)
      promise.resolve(currentDefault == reactContext.packageName)
    } catch (error: Exception) {
      promise.reject("ERR_DEFAULT_SMS_CHECK", error)
    }
  }

  @ReactMethod
  fun requestDefaultSmsApp(promise: Promise) {
    try {
      val smsIntent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
        putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, reactContext.packageName)
      }
      val fallbackIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
      val activity = getCurrentActivity()

      when {
        smsIntent.resolveActivity(reactContext.packageManager) != null -> {
          if (activity != null) {
            activity.startActivity(smsIntent)
          } else {
            smsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(smsIntent)
          }
          promise.resolve(true)
        }
        fallbackIntent.resolveActivity(reactContext.packageManager) != null -> {
          if (activity != null) {
            activity.startActivity(fallbackIntent)
          } else {
            fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(fallbackIntent)
          }
          promise.resolve(true)
        }
        else -> {
          promise.reject("ERR_OPEN_DEFAULT_SMS", "No settings activity found for default SMS app.")
        }
      }
    } catch (error: Exception) {
      promise.reject("ERR_OPEN_DEFAULT_SMS", error)
    }
  }

  @ReactMethod
  fun restoreCallLogsFromJson(jsonString: String, promise: Promise) {
    try {
      val hasWritePermission = ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.WRITE_CALL_LOG,
      ) == PackageManager.PERMISSION_GRANTED

      if (!hasWritePermission) {
        promise.reject("ERR_PERMISSION", "WRITE_CALL_LOG permission is required.")
        return
      }

      val telecomManager = reactContext.getSystemService(TelecomManager::class.java)
      val isDefaultDialer = telecomManager?.defaultDialerPackage == reactContext.packageName
      if (!isDefaultDialer) {
        promise.reject("ERR_NOT_DEFAULT_DIALER", "App must be set as default Phone app.")
        return
      }

      val entries = JSONArray(jsonString)
      var restored = 0
      var failed = 0
      var skipped = 0

      for (i in 0 until entries.length()) {
        val item = entries.optJSONObject(i)
        if (item == null) {
          failed++
          continue
        }

        val values = buildContentValues(item)
        if (values == null) {
          skipped++
          continue
        }

        try {
          val result = reactContext.contentResolver.insert(CallLog.Calls.CONTENT_URI, values)
          if (result != null) {
            restored++
          } else {
            failed++
          }
        } catch (_: Exception) {
          failed++
        }
      }

      val result = JSONObject()
      result.put("restored", restored)
      result.put("failed", failed)
      result.put("skipped", skipped)
      result.put("total", entries.length())
      promise.resolve(result.toString())
    } catch (error: Exception) {
      promise.reject("ERR_RESTORE_CALL_LOGS", error)
    }
  }

  private fun buildContentValues(item: JSONObject): ContentValues? {
    val number = item.optString("phoneNumber", item.optString("number", "")).trim()
    if (number.isEmpty()) return null

    val timestampRaw = item.optString("timestamp", "").trim()
    val timestamp = timestampRaw.toLongOrNull() ?: System.currentTimeMillis()

    val duration = item.optLong("duration", 0L)

    val rawType = if (item.has("rawType")) item.optInt("rawType", 0) else 0
    val type = if (rawType > 0) {
      rawType
    } else {
      when (item.optString("type", "").uppercase()) {
        "INCOMING", "WIFI_INCOMING" -> CallLog.Calls.INCOMING_TYPE
        "OUTGOING", "WIFI_OUTGOING" -> CallLog.Calls.OUTGOING_TYPE
        "MISSED" -> CallLog.Calls.MISSED_TYPE
        "VOICEMAIL" -> CallLog.Calls.VOICEMAIL_TYPE
        "REJECTED" -> CallLog.Calls.REJECTED_TYPE
        "BLOCKED" -> CallLog.Calls.BLOCKED_TYPE
        "ANSWERED_EXTERNALLY" -> CallLog.Calls.ANSWERED_EXTERNALLY_TYPE
        else -> CallLog.Calls.INCOMING_TYPE
      }
    }

    val values = ContentValues().apply {
      put(CallLog.Calls.NUMBER, number)
      put(CallLog.Calls.DATE, timestamp)
      put(CallLog.Calls.DURATION, duration)
      put(CallLog.Calls.TYPE, type)
      put(CallLog.Calls.NEW, 0)
    }

    val name = item.optString("name", "").trim()
    if (name.isNotEmpty()) {
      values.put(CallLog.Calls.CACHED_NAME, name)
    }

    return values
  }
}
