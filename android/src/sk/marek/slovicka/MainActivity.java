package sk.marek.slovicka;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.Locale;

/** Slovíčka: zobrazí appku uloženú v telefóne (assets/index.html). Pokrok sa ukladá v telefóne. */
public class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech tts;
    private boolean ttsPripravene = false;

    /** Most pre JavaScript: window.AndroidHlas.povedz("text") prečíta text anglicky. */
    public class Hlas {
        @JavascriptInterface
        public void povedz(String text) {
            if (tts != null && ttsPripravene && text != null) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "slovicka");
            }
        }
    }

    @Override
    protected void onCreate(Bundle stav) {
        super.onCreate(stav);
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(Locale.UK);
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.US);
                tts.setSpeechRate(0.9f);
                ttsPripravene = true;
            }
        });

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Hlas(), "AndroidHlas");
        setContentView(web);
        if (stav != null) web.restoreState(stav);
        else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    /** Tlačidlo Späť: najprv zavrie obrazovku v appke, na úvode appku ukončí. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.androidSpat ? androidSpat() : 'koniec'", v -> {
            if (v == null || v.contains("koniec")) finish();
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
