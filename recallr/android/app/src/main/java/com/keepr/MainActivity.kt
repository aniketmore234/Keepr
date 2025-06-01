package com.keepr

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Keepr"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleIntent(intent)
  }

  private fun handleIntent(intent: Intent?) {
    if (intent == null) {
      Log.d("MainActivity", "Intent is null")
      return
    }

    val action = intent.action
    val type = intent.type

    Log.d("MainActivity", "Handling intent - Action: $action, Type: $type")

    when (action) {
      Intent.ACTION_SEND -> {
        if (type != null && type.startsWith("text/")) {
          handleTextShare(intent)
        }
      }
      Intent.ACTION_SEND_MULTIPLE -> {
        if (type != null && type.startsWith("text/")) {
          handleMultipleTextShare(intent)
        }
      }
      Intent.ACTION_VIEW -> {
        handleViewIntent(intent)
      }
    }
  }

  private fun handleTextShare(intent: Intent) {
    val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
    val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
    
    Log.d("MainActivity", "Shared text: $sharedText")
    Log.d("MainActivity", "Subject: $subject")

    if (sharedText != null) {
      val params = Arguments.createMap().apply {
        putString("text", sharedText)
        putString("subject", subject ?: "")
        putString("type", "text")
        putString("source", "intent_share")
      }
      
      sendEventToJS("onReceiveShare", params)
    }
  }

  private fun handleMultipleTextShare(intent: Intent) {
    val sharedTexts = intent.getStringArrayListExtra(Intent.EXTRA_TEXT)
    val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
    
    Log.d("MainActivity", "Multiple shared texts: $sharedTexts")

    if (sharedTexts != null && sharedTexts.isNotEmpty()) {
      val params = Arguments.createMap().apply {
        putString("text", sharedTexts.joinToString("\n"))
        putString("subject", subject ?: "")
        putString("type", "multiple_text")
        putString("source", "intent_share")
      }
      
      sendEventToJS("onReceiveShare", params)
    }
  }

  private fun handleViewIntent(intent: Intent) {
    val data = intent.data
    
    Log.d("MainActivity", "View intent data: $data")

    if (data != null) {
      val params = Arguments.createMap().apply {
        putString("url", data.toString())
        putString("type", "url")
        putString("source", "deep_link")
      }
      
      sendEventToJS("onReceiveShare", params)
    }
  }

  private fun sendEventToJS(eventName: String, params: WritableMap) {
    try {
      reactInstanceManager?.currentReactContext?.let { context ->
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit(eventName, params)
        Log.d("MainActivity", "Sent event to JS: $eventName")
      } ?: run {
        Log.w("MainActivity", "React context not available, queuing event")
        // Store the event to send later when React context is ready
      }
    } catch (e: Exception) {
      Log.e("MainActivity", "Error sending event to JS", e)
    }
  }
}
