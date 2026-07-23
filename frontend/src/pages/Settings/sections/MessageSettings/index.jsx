import { useEffect, useMemo, useState } from "react";
import {
  CHANNEL_LABELS,
  MESSAGE_CHANNELS,
  MESSAGE_VARIABLES,
  MESSENGER_OPTIONS,
  MESSENGER_TYPES,
  applyMessageVariables,
  defaultMessageSettings,
  fetchMessageSettings,
  getSmsStats,
  normalizeMessageSettings,
  saveMessageSettings,
  testMessageConnection,
} from "../../../../api/messageSettings";
import "./MessageSettings.css";

const SAMPLE_PREVIEW_DATA = {
  customer: "رضا احمدی",
  product: "والپست",
  amount: "۱۲,۵۰۰,۰۰۰ تومان",
  date: "۱۴۰۴/۰۸/۰۱",
  orderCode: "ORD-0001",
  phone: "۰۹۱۲۱۲۳۴۵۶۷",
  email: "customer@example.com",
};

const TABS = [
  { key: "api", label: "API و کانال‌ها" },
  { key: "templates", label: "قالب‌ها" },
];

const CHANNEL_HINTS = {
  sms: "برای سرویس‌هایی مثل کاوه‌نگار، ملی‌پیامک، ایده‌پردازان و سایر پنل‌های پیامکی.",
  messenger: "برای پیامرسان‌های ایرانی یا خارجی؛ ابتدا نوع پیامرسان را انتخاب کنید، سپس سرویس و API را وارد کنید.",
  email: "برای SMTP، Mailgun، SendGrid یا هر سرویس ایمیل سازمانی.",
};

const PROVIDER_PLACEHOLDERS = {
  sms: "مثلاً کاوه‌نگار، ملی‌پیامک، ایده‌پردازان",
  messenger: "مثلاً سرویس واسط، Bot API، WhatsApp Business API",
  email: "مثلاً SMTP، Mailgun، SendGrid",
};

function makeTemplateId() {
  return `template-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function channelStatusLabel(status) {
  if (status === "success") return "تست موفق";
  if (status === "failed") return "تست ناموفق";
  return "تست نشده";
}

function channelStatusClass(status) {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  return "idle";
}

function normalizeFieldValue(value) {
  return String(value ?? "");
}

function TemplatePreview({ template }) {
  const text = applyMessageVariables(template?.body || "", SAMPLE_PREVIEW_DATA);
  const stats = getSmsStats(text);
  const isSms = template?.channel === "sms";

  return (
    <div className="message-template-preview">
      <div className="message-template-preview__head">
        <strong>پیش‌نمایش قالب</strong>
        {isSms ? (
          <span>
            {stats.length} کاراکتر / {stats.segments || 1} پیامک
          </span>
        ) : null}
      </div>

      <div className="message-template-preview__box">
        {text || "متن قالب را بنویسید تا پیش‌نمایش اینجا نمایش داده شود."}
      </div>

      {isSms ? (
        <div className="message-template-preview__stats">
          محدودیت هر بخش پیامک: {stats.limit} کاراکتر · باقی‌مانده در بخش فعلی: {stats.remaining}
        </div>
      ) : null}
    </div>
  );
}

export default function MessageSettings() {
  const [settings, setSettings] = useState(() => defaultMessageSettings());
  const [activeTab, setActiveTab] = useState("api");
  const [activeChannel, setActiveChannel] = useState("sms");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");

  useEffect(() => {
    let alive = true;

    fetchMessageSettings()
      .then((data) => {
        if (!alive) return;
        const normalized = normalizeMessageSettings(data);
        setSettings(normalized);
        setActiveChannel(normalized.selected_channels?.[0] || "sms");
        setSelectedTemplateId(normalized.templates?.[0]?.id || "");
      })
      .catch((error) => {
        console.error(error);
        if (alive) {
          setStatus({
            type: "danger",
            text: "خطا در دریافت تنظیمات پیام‌ها. مقادیر پیش‌فرض نمایش داده شد.",
          });
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const activeConfig = settings.channels?.[activeChannel] || {};
  const activeTemplate = useMemo(() => {
    return (
      settings.templates.find((template) => template.id === selectedTemplateId) ||
      settings.templates[0] ||
      null
    );
  }, [settings.templates, selectedTemplateId]);

  const updateChannel = (channelKey, changes) => {
    setSettings((previous) => {
      const next = normalizeMessageSettings(previous);
      const patch = typeof changes === "function" ? changes(next.channels[channelKey]) : changes;

      next.channels[channelKey] = {
        ...next.channels[channelKey],
        ...patch,
        test_status: patch?.test_status || "not_tested",
        test_message: patch?.test_message || "تست اتصال انجام نشده است.",
      };

      if (Object.prototype.hasOwnProperty.call(patch || {}, "enabled")) {
        next.selected_channels = MESSAGE_CHANNELS
          .map((channel) => channel.key)
          .filter((key) => next.channels[key]?.enabled);
      }

      return normalizeMessageSettings(next);
    });
    setStatus({ type: "", text: "" });
  };

  const updateTemplate = (field, value) => {
    if (!activeTemplate) return;

    setSettings((previous) => ({
      ...previous,
      templates: previous.templates.map((template) =>
        template.id === activeTemplate.id ? { ...template, [field]: value } : template
      ),
    }));
    setStatus({ type: "", text: "" });
  };

  const addTemplate = () => {
    const nextTemplate = {
      id: makeTemplateId(),
      title: "قالب جدید",
      category: settings.template_categories?.[0] || "پیام دلخواه",
      channel: activeChannel,
      body: "{نام_مشتری} عزیز، متن پیام خود را اینجا بنویسید.",
      is_active: true,
    };

    setSettings((previous) => ({
      ...previous,
      templates: [nextTemplate, ...previous.templates],
    }));
    setSelectedTemplateId(nextTemplate.id);
    setActiveTab("templates");
  };

  const deleteTemplate = () => {
    if (!activeTemplate) return;

    const ok = window.confirm(`قالب «${activeTemplate.title}» حذف شود؟`);
    if (!ok) return;

    setSettings((previous) => {
      const templates = previous.templates.filter((template) => template.id !== activeTemplate.id);
      setSelectedTemplateId(templates[0]?.id || "");
      return { ...previous, templates };
    });
  };

  const duplicateTemplate = () => {
    if (!activeTemplate) return;

    const nextTemplate = {
      ...activeTemplate,
      id: makeTemplateId(),
      title: `${activeTemplate.title} - کپی`,
    };

    setSettings((previous) => ({
      ...previous,
      templates: [nextTemplate, ...previous.templates],
    }));
    setSelectedTemplateId(nextTemplate.id);
  };

  const insertVariable = (variable) => {
    updateTemplate("body", `${activeTemplate?.body || ""}${activeTemplate?.body ? " " : ""}${variable}`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await saveMessageSettings(settings);
      setSettings(saved);
      setStatus({ type: "success", text: "تنظیمات پیام‌ها ذخیره شد." });
    } catch (error) {
      setStatus({
        type: "danger",
        text: error?.response?.data?.detail || error?.message || "خطا در ذخیره تنظیمات پیام‌ها",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(activeChannel);
      const result = await testMessageConnection(activeChannel, settings);
      if (result?.settings) {
        setSettings(result.settings);
      }
      setStatus({
        type: result?.ok ? "success" : "danger",
        text: result?.message || (result?.ok ? "تست اتصال موفق بود." : "تست اتصال ناموفق بود."),
      });
    } catch (error) {
      setStatus({
        type: "danger",
        text: error?.response?.data?.detail || error?.message || "خطا در تست اتصال",
      });
    } finally {
      setTesting("");
    }
  };

  const changeMessengerType = (value) => {
    const firstOption = MESSENGER_OPTIONS[value]?.[0] || "";
    updateChannel("messenger", {
      messenger_type: value,
      messenger_name: firstOption,
    });
  };

  const currentSmsStats = getSmsStats(activeTemplate?.body || "");
  const activeMessengerType = activeConfig.messenger_type || "iranian";
  const messengerNames = MESSENGER_OPTIONS[activeMessengerType] || [];

  const renderApiTab = () => (
    <div className="message-tab-panel">
      <section className="message-settings-section">
        <div className="message-settings-section__title">
          <h3>کانال ارسال</h3>
          <span>کانال موردنظر را فعال کنید و تنظیمات همان سرویس را وارد کنید.</span>
        </div>

        <div className="message-channel-grid">
          {MESSAGE_CHANNELS.map((channel) => {
            const config = settings.channels?.[channel.key] || {};
            const isActive = activeChannel === channel.key;
            const statusClass = channelStatusClass(config.test_status);

            return (
              <div
                key={channel.key}
                role="button"
                tabIndex={0}
                className={`message-channel-card ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveChannel(channel.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setActiveChannel(channel.key);
                  }
                }}
              >
                <div className="message-channel-card__top">
                  <span className="message-channel-card__title">{channel.label}</span>
                  <span className={`message-channel-card__status is-${statusClass}`}>
                    {channelStatusLabel(config.test_status)}
                  </span>
                </div>

                <p>{CHANNEL_HINTS[channel.key]}</p>

                <label className="message-channel-card__switch" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.enabled)}
                    onChange={(event) => updateChannel(channel.key, { enabled: event.target.checked })}
                  />
                  فعال باشد
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="message-settings-section message-settings-section--api">
        <div className="message-settings-section__title">
          <h3>تنظیمات API {CHANNEL_LABELS[activeChannel]}</h3>
          <span>{CHANNEL_HINTS[activeChannel]}</span>
        </div>

        {activeChannel === "messenger" ? (
          <div className="message-messenger-row">
            <label className="message-field">
              <span>نوع پیامرسان</span>
              <select
                value={activeMessengerType}
                onChange={(event) => changeMessengerType(event.target.value)}
              >
                {MESSENGER_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="message-field">
              <span>نام پیامرسان</span>
              <select
                value={activeConfig.messenger_name || messengerNames[0] || ""}
                onChange={(event) => updateChannel("messenger", { messenger_name: event.target.value })}
              >
                {messengerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="message-api-grid">
          <label className="message-field">
            <span>نام سرویس‌دهنده</span>
            <input
              value={normalizeFieldValue(activeConfig.provider_name)}
              onChange={(event) => updateChannel(activeChannel, { provider_name: event.target.value })}
              placeholder={PROVIDER_PLACEHOLDERS[activeChannel]}
            />
          </label>

          <label className="message-field">
            <span>API Key</span>
            <input
              value={normalizeFieldValue(activeConfig.api_key)}
              onChange={(event) => updateChannel(activeChannel, { api_key: event.target.value })}
              placeholder="کلید API"
            />
          </label>

          <label className="message-field">
            <span>API Secret</span>
            <input
              value={normalizeFieldValue(activeConfig.api_secret)}
              onChange={(event) => updateChannel(activeChannel, { api_secret: event.target.value })}
              placeholder="رمز / Secret"
            />
          </label>

          <label className="message-field">
            <span>{activeChannel === "email" ? "ایمیل فرستنده" : "شماره خط ارسال / Sender ID"}</span>
            <input
              value={normalizeFieldValue(activeConfig.sender_id)}
              onChange={(event) => updateChannel(activeChannel, { sender_id: event.target.value })}
              placeholder={activeChannel === "email" ? "sales@example.com" : "مثلاً 1000xxxx یا شناسه ارسال"}
            />
          </label>
        </div>

        <div className="message-api-footer">
          <div className={`message-api-test is-${channelStatusClass(activeConfig.test_status)}`}>
            <strong>{channelStatusLabel(activeConfig.test_status)}</strong>
            <span>{activeConfig.test_message || "تست اتصال انجام نشده است."}</span>
          </div>

          <button
            type="button"
            className="message-test-btn"
            onClick={handleTestConnection}
            disabled={testing === activeChannel}
          >
            {testing === activeChannel ? "در حال تست..." : "تست اتصال"}
          </button>
        </div>
      </section>
    </div>
  );

  const renderTemplatesTab = () => (
    <section className="message-settings-section message-settings-section--templates message-tab-panel">
      <div className="message-settings-section__title">
        <h3>قالب‌های پیام</h3>
        <span>این قالب‌ها در صفحه «ارسال پیام جدید» قابل انتخاب هستند.</span>
      </div>

      <div className="message-template-layout">
        <aside className="message-template-list">
          <button type="button" className="message-template-add" onClick={addTemplate}>
            + ایجاد قالب جدید
          </button>

          {settings.templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`message-template-item ${template.id === activeTemplate?.id ? "is-active" : ""}`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <strong>{template.title}</strong>
              <span>
                {template.category} · {CHANNEL_LABELS[template.channel] || template.channel}
              </span>
            </button>
          ))}
        </aside>

        <div className="message-template-editor">
          {activeTemplate ? (
            <>
              <div className="message-template-editor__grid">
                <label className="message-field">
                  <span>عنوان قالب</span>
                  <input
                    value={activeTemplate.title}
                    onChange={(event) => updateTemplate("title", event.target.value)}
                    placeholder="عنوان قالب"
                  />
                </label>

                <label className="message-field">
                  <span>دسته‌بندی</span>
                  <select
                    value={activeTemplate.category}
                    onChange={(event) => updateTemplate("category", event.target.value)}
                  >
                    {settings.template_categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="message-field">
                  <span>کانال پیش‌فرض قالب</span>
                  <select
                    value={activeTemplate.channel}
                    onChange={(event) => updateTemplate("channel", event.target.value)}
                  >
                    {MESSAGE_CHANNELS.map((channel) => (
                      <option key={channel.key} value={channel.key}>
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="message-template-active">
                  <input
                    type="checkbox"
                    checked={activeTemplate.is_active !== false}
                    onChange={(event) => updateTemplate("is_active", event.target.checked)}
                  />
                  قالب فعال باشد
                </label>
              </div>

              <div className="message-variable-row">
                {MESSAGE_VARIABLES.map((variable) => (
                  <button key={variable} type="button" onClick={() => insertVariable(variable)}>
                    {variable}
                  </button>
                ))}
              </div>

              <label className="message-field message-field--textarea">
                <span>متن قالب</span>
                <textarea
                  value={activeTemplate.body}
                  onChange={(event) => updateTemplate("body", event.target.value)}
                  placeholder="متن قالب را با متغیرهای پویا بنویسید..."
                />
              </label>

              {activeTemplate.channel === "sms" ? (
                <div className="message-sms-limit">
                  <strong>محدودیت پیامک</strong>
                  <span>
                    {currentSmsStats.length} کاراکتر · {currentSmsStats.segments || 1} پیامک · باقی‌مانده {currentSmsStats.remaining}
                  </span>
                </div>
              ) : null}

              <TemplatePreview template={activeTemplate} />

              <div className="message-template-actions">
                <button type="button" className="message-secondary-btn" onClick={duplicateTemplate}>
                  کپی قالب
                </button>
                <button type="button" className="message-danger-btn" onClick={deleteTemplate}>
                  حذف قالب
                </button>
              </div>
            </>
          ) : (
            <div className="message-template-empty">برای شروع یک قالب جدید بسازید.</div>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className="message-settings">
      <div className="message-settings__card">
        <header className="message-settings__header">
          <div>
            <h2>تنظیمات پیام‌ها</h2>
            <p>API سرویس‌های ارسال و قالب‌های قابل استفاده در صفحه ارسال پیام جدید را مدیریت کنید.</p>
          </div>

          <button type="button" className="message-settings__save" onClick={handleSave} disabled={saving}>
            {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
          </button>
        </header>

        <div className="message-settings-tabs" role="tablist" aria-label="بخش‌های تنظیمات پیام‌ها">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`message-settings-tabs__item ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {status.text ? (
          <div className={`message-settings__status message-settings__status--${status.type || "info"}`}>
            {status.text}
          </div>
        ) : null}

        {activeTab === "api" ? renderApiTab() : renderTemplatesTab()}
      </div>
    </div>
  );
}
