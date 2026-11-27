package com.slashpromo.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.text.InputFilter;
import android.text.InputType;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;

final class MessageCentre {
    private static final String API = "/v1/messages";
    private static final String[] SUBJECTS = {"Complaint", "Suggestion", "Feedback", "Renewal", "Other"};
    private final Activity activity;
    private final LinearLayout panel;
    private final TextView status;
    private final AccountClient client;
    private final ExecutorService worker;
    private boolean owner;
    private boolean sent;
    private boolean loading;

    MessageCentre(Activity activity, LinearLayout parent, TextView status,
                  AccountClient client, ExecutorService worker) {
        this.activity = activity;
        this.status = status;
        this.client = client;
        this.worker = worker;
        panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        parent.addView(panel);
    }

    void open() {
        if (panel.getChildCount() == 0) button("Retry loading inbox", () -> inbox(0));
        inbox(0);
    }

    private void inbox(long before) {
        String suffix = cursor(before);
        if (sent) suffix += before == 0 ? "?sent=1" : "&sent=1";
        request(API + suffix, null, data -> {
            owner = data.optBoolean("owner");
            panel.removeAllViews();
            text(sent ? "Sent" : "Inbox");
            button("Refresh", this::open);
            button(sent ? "View inbox" : "View sent", () -> {
                sent = !sent;
                open();
            });
            button(owner ? "Message a member" : "New message", () -> {
                if (owner) findMember("");
                else compose("", "", "", "", false);
            });
            if (owner) button("Broadcast to members", () -> compose("", "", "Broadcast to all approved members", "", true));
            JSONArray threads = data.optJSONArray("threads");
            if (threads.length() == 0) text("No conversations on this page.");
            for (int i = 0; i < threads.length(); i++) {
                JSONObject thread = threads.optJSONObject(i);
                String member = thread.optString("member_name");
                int unread = thread.optInt("unread");
                String title = thread.optString("subject") + (owner ? " · " + member : "");
                button(title + (unread > 0 ? " · " + unread + " unread" : ""),
                        () -> conversation(thread.optString("id"), 0));
            }
            long next = data.optLong("next");
            if (next > 0) button("Older conversations", () -> inbox(next));
        });
    }

    private void findMember(String query) {
        panel.removeAllViews();
        button("Back to inbox", this::open);
        EditText search = field("Member name or email", false, 100);
        search.setText(query);
        LinearLayout results = new LinearLayout(activity);
        results.setOrientation(LinearLayout.VERTICAL);
        button("Find member", () -> {
            String input = search.getText().toString().trim();
            if (input.length() < 2) {
                status.setText("Enter at least two characters.");
                return;
            }
            String encoded;
            try {
                encoded = URLEncoder.encode(input, "UTF-8");
            } catch (java.io.UnsupportedEncodingException e) {
                throw new IllegalStateException(e);
            }
            request(API + "/members?q=" + encoded, null, data -> {
                results.removeAllViews();
                JSONArray members = data.optJSONArray("members");
                if (members.length() == 0) status.setText("No matching members.");
                for (int i = 0; i < members.length(); i++) {
                    JSONObject member = members.optJSONObject(i);
                    String name = member.optString("name") + " · " + member.optString("email");
                    Button choice = new Button(activity);
                    choice.setAllCaps(false);
                    choice.setText(name);
                    choice.setOnClickListener(view -> {
                        if (!loading) compose("", member.optString("id"), name, input, false);
                    });
                    results.addView(choice);
                }
            });
        });
        panel.addView(results);
    }

    private void conversation(String id, long before) {
        request(API + "/" + id + cursor(before), null, data -> {
            panel.removeAllViews();
            button("Back to inbox", this::open);
            String subject = data.optJSONObject("thread").optString("subject");
            text(subject);
            button("Refresh conversation", () -> conversation(id, 0));
            long next = data.optLong("next");
            if (next > 0) button("Older messages", () -> conversation(id, next));
            JSONArray messages = data.optJSONArray("messages");
            long readThrough = 0;
            for (int i = 0; i < messages.length(); i++) {
                JSONObject message = messages.optJSONObject(i);
                String author = message.optString("author").equals("admin") ? "Admin" : "Member";
                String date = message.optString("created_at");
                if (date.length() >= 16) date = date.substring(0, 16).replace('T', ' ') + " UTC";
                text(author + " · " + date + "\n" + message.optString("body"));
                readThrough = message.optLong("sequence");
            }
            button("Reply", () -> compose(id, "", subject, "", false));
            if (before == 0 && readThrough > 0) {
                final JSONObject receipt = payload("readThrough", readThrough);
                final String token = client.session();
                worker.execute(() -> {
                    try {
                        if (!token.isEmpty()) client.request(API + "/" + id, receipt, token);
                    } catch (Exception ignored) {
                        // The next visit retries the read receipt.
                    }
                });
            }
        });
    }

    private void compose(String thread, String recipient, String title, String query, boolean broadcast) {
        panel.removeAllViews();
        boolean reply = !thread.isEmpty();
        button("Cancel", () -> {
            if (reply) conversation(thread, 0);
            else if (owner && !broadcast) findMember(query);
            else open();
        });
        if (!title.isEmpty()) text(title);
        text("Messages are stored by Slashview for support. Avoid sharing passwords, payment details or patient information.");
        Spinner subject = new Spinner(activity);
        if (!reply) {
            ArrayAdapter<String> adapter = new ArrayAdapter<>(activity,
                    android.R.layout.simple_spinner_item, SUBJECTS);
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            subject.setAdapter(adapter);
            subject.setContentDescription("Message subject");
            panel.addView(subject);
        }
        EditText draft = field("Message (up to 2,000 characters)", true, 2000);
        String[] lastPayload = {"", ""};
        button("Send", () -> {
            String body = draft.getText().toString().trim();
            if (body.isEmpty()) {
                status.setText("Enter a message.");
                return;
            }
            JSONObject message = reply ? payload("body", body)
                    : payload("body", body, "subject", subject.getSelectedItem().toString(), "recipient", recipient);
            String snapshot = message.toString();
            if (!snapshot.equals(lastPayload[0])) {
                lastPayload[0] = snapshot;
                lastPayload[1] = UUID.randomUUID().toString();
            }
            put(message, "id", lastPayload[1]);
            if (broadcast) {
                put(message, "confirmed", true);
                new AlertDialog.Builder(activity).setTitle("Send broadcast?")
                        .setMessage("Each approved member will receive a private copy.")
                        .setNegativeButton("Cancel", null)
                        .setPositiveButton("Send broadcast", (dialog, which) ->
                                request(API + "/broadcast", message, response -> {
                                    panel.removeAllViews();
                                    text("Sent to " + response.optInt("recipient_count") + " members.");
                                    button("Back to inbox", this::open);
                                }))
                        .show();
            } else {
                request(reply ? API + "/" + thread : API, message,
                        response -> conversation(response.optString("id"), 0));
            }
        });
    }

    private void request(String path, JSONObject body, Consumer<JSONObject> success) {
        if (loading) return;
        loading = true;
        status.setText("Connecting…");
        worker.execute(() -> {
            JSONObject result = null;
            String error = "";
            try {
                String token = client.session();
                if (token.isEmpty()) {
                    error = "Sign in to use the Message Centre.";
                } else {
                    AccountClient.Result response = client.request(path, body, token);
                    if (response.ok()) result = response.body;
                    else if (response.status == 401) error = "Your session ended. Sign in again.";
                    else error = response.body.optString("error", "Request failed.");
                }
            } catch (Exception e) {
                error = "Messaging is unavailable. Try again.";
            }
            final JSONObject data = result;
            final String message = error;
            activity.runOnUiThread(() -> {
                loading = false;
                if (activity.isDestroyed() || activity.isFinishing() || !panel.isAttachedToWindow()) return;
                status.setText(message);
                if (data != null) success.accept(data);
            });
        });
    }

    private Button button(String label, Runnable action) {
        Button button = new Button(activity);
        button.setText(label);
        button.setAllCaps(false);
        button.setOnClickListener(view -> {
            if (!loading) action.run();
        });
        panel.addView(button);
        return button;
    }

    private void text(String value) {
        TextView view = new TextView(activity);
        view.setText(value);
        view.setTextSize(16);
        view.setPadding(0, 8, 0, 8);
        panel.addView(view);
    }

    private EditText field(String hint, boolean multiline, int maximum) {
        EditText input = new EditText(activity);
        input.setHint(hint);
        input.setSaveEnabled(false);
        input.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO);
        input.setInputType(InputType.TYPE_CLASS_TEXT | (multiline ? InputType.TYPE_TEXT_FLAG_MULTI_LINE : 0));
        input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(maximum)});
        if (multiline) input.setMinLines(3);
        panel.addView(input);
        return input;
    }

    private static String cursor(long before) {
        return before > 0 ? "?before=" + before : "";
    }

    private static JSONObject payload(Object... fields) {
        JSONObject result = new JSONObject();
        for (int i = 0; i < fields.length; i += 2) put(result, (String) fields[i], fields[i + 1]);
        return result;
    }

    private static void put(JSONObject object, String key, Object value) {
        try {
            object.put(key, value);
        } catch (JSONException e) {
            throw new IllegalArgumentException(e);
        }
    }
}
