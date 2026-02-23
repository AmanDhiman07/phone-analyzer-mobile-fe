package com.anonymous.phoneanalyzermobilefe

import android.Manifest
import android.app.Activity
import android.app.role.RoleManager
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.provider.Telephony
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject

class CallLogRestoreModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private companion object {
    const val REQUEST_CODE_DEFAULT_SMS = 9401
    const val REQUEST_CODE_DEFAULT_DIALER = 9402
  }

  private var pendingDefaultSmsPromise: Promise? = null
  private var pendingDefaultDialerPromise: Promise? = null

  private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?,
    ) {
      when (requestCode) {
        REQUEST_CODE_DEFAULT_SMS -> {
          val promise = pendingDefaultSmsPromise ?: return
          pendingDefaultSmsPromise = null
          if (resultCode == Activity.RESULT_OK) {
            promise.resolve(true)
          } else {
            promise.resolve(isDefaultSmsAppInternal())
          }
        }
        REQUEST_CODE_DEFAULT_DIALER -> {
          val promise = pendingDefaultDialerPromise ?: return
          pendingDefaultDialerPromise = null
          if (resultCode == Activity.RESULT_OK) {
            promise.resolve(true)
          } else {
            promise.resolve(isDefaultDialerInternal())
          }
        }
      }
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "CallLogRestore"

  override fun invalidate() {
    pendingDefaultSmsPromise?.reject(
      "ERR_SMS_REQUEST_CANCELLED",
      "Default SMS app request was interrupted.",
    )
    pendingDefaultSmsPromise = null
    pendingDefaultDialerPromise?.reject(
      "ERR_DIALER_REQUEST_CANCELLED",
      "Default Phone app request was interrupted.",
    )
    pendingDefaultDialerPromise = null
    reactContext.removeActivityEventListener(activityEventListener)
    super.invalidate()
  }

  @ReactMethod
  fun isDefaultDialer(promise: Promise) {
    try {
      promise.resolve(isDefaultDialerInternal())
    } catch (error: Exception) {
      promise.reject("ERR_DEFAULT_DIALER_CHECK", error)
    }
  }

  private fun isDefaultDialerInternal(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = reactContext.getSystemService(RoleManager::class.java)
      if (
        roleManager != null &&
        roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)
      ) {
        return roleManager.isRoleHeld(RoleManager.ROLE_DIALER)
      }
    }
    val telecomManager = reactContext.getSystemService(TelecomManager::class.java)
    return telecomManager?.defaultDialerPackage == reactContext.packageName
  }

  @ReactMethod
  fun openDefaultDialerSettings(promise: Promise) {
    try {
      val activity = reactContext.currentActivity

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = reactContext.getSystemService(RoleManager::class.java)
        if (
          roleManager != null &&
          roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)
        ) {
          if (roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
            promise.resolve(true)
            return
          }

          val roleIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
          launchIntent(roleIntent, activity)
          promise.resolve(true)
          return
        }
      }

      val dialerIntent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
        putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactContext.packageName)
      }
      val fallbackIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
      when {
        dialerIntent.resolveActivity(reactContext.packageManager) != null -> {
          launchIntent(dialerIntent, activity)
          promise.resolve(true)
        }
        fallbackIntent.resolveActivity(reactContext.packageManager) != null -> {
          launchIntent(fallbackIntent, activity)
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

  /** Requests to become the default Phone app. Shows system picker; promise resolves with true/false when user returns. */
  @ReactMethod
  fun requestDefaultPhoneApp(promise: Promise) {
    try {
      if (isDefaultDialerInternal()) {
        promise.resolve(true)
        return
      }

      if (pendingDefaultDialerPromise != null) {
        promise.reject(
          "ERR_DIALER_REQUEST_IN_PROGRESS",
          "A default Phone app request is already in progress.",
        )
        return
      }

      val activity = reactContext.currentActivity
      if (activity == null) {
        promise.reject(
          "ERR_ACTIVITY_REQUIRED",
          "Current activity is required to request default Phone app.",
        )
        return
      }

      val requestIntent = createDefaultDialerRequestIntent()
      if (requestIntent == null) {
        promise.reject("ERR_OPEN_DEFAULT_DIALER", "No settings activity found for default Phone app.")
        return
      }

      pendingDefaultDialerPromise = promise
      activity.startActivityForResult(requestIntent, REQUEST_CODE_DEFAULT_DIALER)
    } catch (error: Exception) {
      pendingDefaultDialerPromise = null
      promise.reject("ERR_OPEN_DEFAULT_DIALER", error)
    }
  }

  private fun createDefaultDialerRequestIntent(): Intent? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = reactContext.getSystemService(RoleManager::class.java)
      if (
        roleManager != null &&
        roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)
      ) {
        return roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
      }
    }
    val dialerIntent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
      putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactContext.packageName)
    }
    return if (dialerIntent.resolveActivity(reactContext.packageManager) != null) {
      dialerIntent
    } else {
      Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS).takeIf {
        it.resolveActivity(reactContext.packageManager) != null
      }
    }
  }

  @ReactMethod
  fun isDefaultSmsApp(promise: Promise) {
    try {
      promise.resolve(isDefaultSmsAppInternal())
    } catch (error: Exception) {
      promise.reject("ERR_DEFAULT_SMS_CHECK", error)
    }
  }

  @ReactMethod
  fun requestDefaultSmsApp(promise: Promise) {
    try {
      if (isDefaultSmsAppInternal()) {
        promise.resolve(true)
        return
      }

      if (pendingDefaultSmsPromise != null) {
        promise.reject(
          "ERR_SMS_REQUEST_IN_PROGRESS",
          "A default SMS app request is already in progress.",
        )
        return
      }

      val activity = reactContext.currentActivity
      if (activity == null) {
        promise.reject(
          "ERR_ACTIVITY_REQUIRED",
          "Current activity is required to request default SMS app.",
        )
        return
      }

      val requestIntent = createDefaultSmsRequestIntent()
      if (requestIntent == null) {
        promise.reject("ERR_OPEN_DEFAULT_SMS", "No settings activity found for default SMS app.")
        return
      }

      pendingDefaultSmsPromise = promise
      activity.startActivityForResult(requestIntent, REQUEST_CODE_DEFAULT_SMS)
    } catch (error: Exception) {
      pendingDefaultSmsPromise = null
      promise.reject("ERR_OPEN_DEFAULT_SMS", error)
    }
  }

  @ReactMethod
  fun getDefaultSmsPackage(promise: Promise) {
    try {
      promise.resolve(Telephony.Sms.getDefaultSmsPackage(reactContext))
    } catch (error: Exception) {
      promise.reject("ERR_DEFAULT_SMS_PACKAGE", error)
    }
  }

  @ReactMethod
  fun requestDefaultSmsPackage(packageName: String, promise: Promise) {
    try {
      if (packageName.isBlank()) {
        promise.reject("ERR_INVALID_SMS_PACKAGE", "Package name is required.")
        return
      }

      val smsIntent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
        putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, packageName)
      }
      val fallbackIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
      val activity = reactContext.currentActivity

      when {
        smsIntent.resolveActivity(reactContext.packageManager) != null -> {
          launchIntent(smsIntent, activity)
          promise.resolve(true)
        }
        fallbackIntent.resolveActivity(reactContext.packageManager) != null -> {
          launchIntent(fallbackIntent, activity)
          promise.resolve(true)
        }
        else -> {
          promise.reject(
            "ERR_OPEN_DEFAULT_SMS_PACKAGE",
            "No settings activity found for switching default SMS app.",
          )
        }
      }
    } catch (error: Exception) {
      promise.reject("ERR_OPEN_DEFAULT_SMS_PACKAGE", error)
    }
  }

  @ReactMethod
  fun restoreSmsFromJson(jsonString: String, promise: Promise) {
    try {
      if (!isDefaultSmsAppInternal()) {
        promise.reject("ERR_NOT_DEFAULT_SMS", "App must be set as default SMS app.")
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

        val payload = buildSmsInsertPayload(item)
        if (payload == null) {
          skipped++
          continue
        }

        try {
          val result = reactContext.contentResolver.insert(payload.uri, payload.values)
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
      promise.reject("ERR_RESTORE_SMS", error)
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

      if (!isDefaultDialerInternal()) {
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

  private fun buildSmsInsertPayload(item: JSONObject): SmsInsertPayload? {
    val address = item.optString("address", "").trim()
    val body = item.optString("body", "")
    val fallbackNumber = item.optString("phoneNumber", "").trim()
    val resolvedAddress = if (address.isNotEmpty()) address else fallbackNumber

    if (resolvedAddress.isEmpty() && body.isBlank()) {
      return null
    }

    val date = item.optString("date", "").trim().toLongOrNull()
      ?: item.optString("timestamp", "").trim().toLongOrNull()
      ?: System.currentTimeMillis()
    val dateSent = item.optString("date_sent", "").trim().toLongOrNull()
      ?: item.optString("dateSent", "").trim().toLongOrNull()
    val type = item.optString("type", "").trim().toIntOrNull()
      ?: item.optInt("rawType", Telephony.Sms.MESSAGE_TYPE_INBOX)
    val read = resolveBinaryFlag(item, "read", defaultValue = if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) 0 else 1)
    val seen = resolveBinaryFlag(item, "seen", defaultValue = read)
    val threadId = item.optString("thread_id", "").trim().toLongOrNull()
      ?: item.optString("threadId", "").trim().toLongOrNull()

    val values = ContentValues().apply {
      if (resolvedAddress.isNotEmpty()) {
        put(Telephony.Sms.ADDRESS, resolvedAddress)
      }
      put(Telephony.Sms.BODY, body)
      put(Telephony.Sms.DATE, date)
      put(Telephony.Sms.TYPE, type)
      put(Telephony.Sms.READ, read)
      put(Telephony.Sms.SEEN, seen)
      if (dateSent != null && dateSent > 0L) {
        put(Telephony.Sms.DATE_SENT, dateSent)
      }
      if (threadId != null && threadId > 0L) {
        put(Telephony.Sms.THREAD_ID, threadId)
      }

      val subject = item.optString("subject", "").trim()
      if (subject.isNotEmpty()) {
        put(Telephony.Sms.SUBJECT, subject)
      }
    }

    val uri = when (type) {
      Telephony.Sms.MESSAGE_TYPE_SENT -> Telephony.Sms.Sent.CONTENT_URI
      Telephony.Sms.MESSAGE_TYPE_DRAFT -> Telephony.Sms.Draft.CONTENT_URI
      Telephony.Sms.MESSAGE_TYPE_OUTBOX -> Telephony.Sms.Outbox.CONTENT_URI
      else -> Telephony.Sms.Inbox.CONTENT_URI
    }

    return SmsInsertPayload(uri, values)
  }

  private fun resolveBinaryFlag(item: JSONObject, key: String, defaultValue: Int): Int {
    val raw = item.opt(key)
    return when (raw) {
      is Boolean -> if (raw) 1 else 0
      is Number -> if (raw.toInt() != 0) 1 else 0
      is String -> {
        val normalized = raw.trim()
        if (
          normalized.equals("true", ignoreCase = true) ||
          normalized == "1"
        ) {
          1
        } else if (
          normalized.equals("false", ignoreCase = true) ||
          normalized == "0"
        ) {
          0
        } else {
          defaultValue
        }
      }
      else -> defaultValue
    }
  }

  private fun isDefaultSmsAppInternal(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = reactContext.getSystemService(RoleManager::class.java)
      if (
        roleManager != null &&
        roleManager.isRoleAvailable(RoleManager.ROLE_SMS)
      ) {
        return roleManager.isRoleHeld(RoleManager.ROLE_SMS)
      }
    }

    val currentDefault = Telephony.Sms.getDefaultSmsPackage(reactContext)
    return currentDefault == reactContext.packageName
  }

  private fun createDefaultSmsRequestIntent(): Intent? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = reactContext.getSystemService(RoleManager::class.java)
      if (
        roleManager != null &&
        roleManager.isRoleAvailable(RoleManager.ROLE_SMS)
      ) {
        return roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
      }
    }

    val smsIntent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT).apply {
      putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, reactContext.packageName)
    }
    if (smsIntent.resolveActivity(reactContext.packageManager) != null) {
      return smsIntent
    }

    val fallbackIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
    return if (fallbackIntent.resolveActivity(reactContext.packageManager) != null) {
      fallbackIntent
    } else {
      null
    }
  }

  private fun launchIntent(intent: Intent, activity: Activity?) {
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    }
  }

  private data class SmsInsertPayload(
    val uri: Uri,
    val values: ContentValues,
  )
}
