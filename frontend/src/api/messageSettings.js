import api from "./client";

export const MESSAGE_CHANNELS = [
  { key: "sms", label: "پیامک" },
  { key: "messenger", label: "پیامرسان" },
  { key: "email", label: "ایمیل" },
];

export const MESSENGER_TYPES = [
  { key: "iranian", label: "ایرانی" },
  { key: "foreign", label: "خارجی" },
];

export const MESSENGER_OPTIONS = {
  iranian: ["بله", "ایتا", "روبیکا", "سروش", "گپ", "آی‌گپ", "سایر"],
  foreign: ["WhatsApp", "Telegram", "Instagram / Meta", "Facebook Messenger", "سایر"],
};

export const MESSAGE_VARIABLES = [
  "{نام_مشتری}",
  "{نام_محصول}",
  "{مبلغ}",
  "{تاریخ}",
  "{کد_سفارش}",
  "{شماره_تماس}",
  "{ایمیل}",
];

export const MESSAGE_TEMPLATE_CATEGORIES = [
  "خوش‌آمدگویی",
  "یادآوری سبد خرید",
  "تخفیف",
  "پیگیری فروش",
  "تبریک تولد",
  "اطلاع‌رسانی پرداخت",
  "پیگیری سفارش",
  "پیام دلخواه",
];

export const CHANNEL_LABELS = MESSAGE_CHANNELS.reduce((acc, channel) => {
  acc[channel.key] = channel.label;
  return acc;
}, {});

function normalizeLegacyChannel(value) {
  const channel = String(value || "").trim().toLowerCase();
  const map = {
    sms: "sms",
    "پیامک": "sms",
    email: "email",
    "ایمیل": "email",
    whatsapp: "messenger",
    "واتساپ": "messenger",
    telegram: "messenger",
    "تلگرام": "messenger",
    messenger: "messenger",
    "پیامرسان": "messenger",
    "پیام رسان": "messenger",
    "پیامرسان‌ها": "messenger",
  };
  return map[channel] || (MESSAGE_CHANNELS.some((item) => item.key === channel) ? channel : "sms");
}

function normalizeMessengerType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["iranian", "iran", "ایرانی", "داخلی"].includes(normalized)) return "iranian";
  if (["foreign", "external", "international", "خارجی"].includes(normalized)) return "foreign";
  return MESSENGER_OPTIONS[normalized] ? normalized : "iranian";
}

export function defaultChannelConfig(channelKey = "sms") {
  return {
    enabled: channelKey === "sms",
    provider_name: "",
    api_key: "",
    api_secret: "",
    sender_id: "",
    messenger_type: channelKey === "messenger" ? "iranian" : "",
    messenger_name: channelKey === "messenger" ? "بله" : "",
    test_status: "not_tested",
    test_message: "تست اتصال انجام نشده است.",
    tested_at: "",
  };
}

export function defaultMessageTemplates() {
  return [
    {
      id: "invoice-ready",
      title: "صورتحساب آماده شد",
      category: "اطلاع‌رسانی پرداخت",
      channel: "sms",
      body: "{نام_مشتری} عزیز، صورتحساب سفارش {کد_سفارش} آماده است. مبلغ کل: {مبلغ}.",
      is_active: true,
    },
    {
      id: "payment-followup",
      title: "پیگیری پرداخت",
      category: "پیگیری فروش",
      channel: "sms",
      body: "{نام_مشتری} عزیز، برای تکمیل سفارش {کد_سفارش} لطفاً وضعیت پرداخت را اعلام کنید.",
      is_active: true,
    },
    {
      id: "discount-offer",
      title: "اعلام تخفیف",
      category: "تخفیف",
      channel: "messenger",
      body: "{نام_مشتری} عزیز، برای محصول {نام_محصول} شرایط تخفیف ویژه فراهم شده است. جهت هماهنگی با واحد فروش در ارتباط باشید.",
      is_active: true,
    },
    {
      id: "birthday",
      title: "تبریک تولد",
      category: "تبریک تولد",
      channel: "sms",
      body: "{نام_مشتری} عزیز، تولدتان مبارک. برای شما آرزوی سلامتی و موفقیت داریم.",
      is_active: true,
    },
  ];
}

export function defaultMessageSettings() {
  return {
    selected_channels: ["sms"],
    channel_labels: CHANNEL_LABELS,
    messenger_type_labels: MESSENGER_TYPES.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {}),
    messenger_options: MESSENGER_OPTIONS,
    channels: MESSAGE_CHANNELS.reduce((acc, channel) => {
      acc[channel.key] = defaultChannelConfig(channel.key);
      return acc;
    }, {}),
    template_categories: [...MESSAGE_TEMPLATE_CATEGORIES],
    template_variables: [...MESSAGE_VARIABLES],
    templates: defaultMessageTemplates(),
  };
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function cleanChannelConfig(raw, channelKey) {
  const defaults = defaultChannelConfig(channelKey);
  const source = raw && typeof raw === "object" ? raw : {};
  const messengerType = channelKey === "messenger" ? normalizeMessengerType(source.messenger_type) : "";
  const messengerName =
    channelKey === "messenger"
      ? String(source.messenger_name || MESSENGER_OPTIONS[messengerType]?.[0] || "بله")
      : "";

  return {
    ...defaults,
    ...source,
    enabled: Boolean(source.enabled),
    provider_name: String(source.provider_name || ""),
    api_key: String(source.api_key || ""),
    api_secret: String(source.api_secret || ""),
    sender_id: String(source.sender_id || ""),
    messenger_type: messengerType,
    messenger_name: messengerName,
    test_status: ["not_tested", "success", "failed"].includes(source.test_status)
      ? source.test_status
      : defaults.test_status,
    test_message: String(source.test_message || defaults.test_message),
    tested_at: String(source.tested_at || ""),
  };
}

function cleanTemplate(template, index) {
  const title = String(template?.title || "").trim() || `قالب پیام ${index + 1}`;
  const channel = normalizeLegacyChannel(template?.channel);

  return {
    id:
      String(template?.id || "").trim() ||
      `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    title,
    category:
      String(template?.category || "").trim() ||
      MESSAGE_TEMPLATE_CATEGORIES[MESSAGE_TEMPLATE_CATEGORIES.length - 1],
    channel,
    body: String(template?.body || ""),
    is_active: template?.is_active !== false,
  };
}

export function normalizeMessageSettings(payload) {
  const defaults = defaultMessageSettings();
  const source = payload && typeof payload === "object" ? payload : {};
  const rawChannels = source.channels || {};
  const channels = {};

  let legacyMessenger = null;
  [
    ["whatsapp", "foreign", "WhatsApp"],
    ["telegram", "foreign", "Telegram"],
  ].forEach(([legacyKey, messengerType, messengerName]) => {
    if (!legacyMessenger && rawChannels?.[legacyKey]?.enabled) {
      legacyMessenger = {
        ...rawChannels[legacyKey],
        messenger_type: messengerType,
        messenger_name: messengerName,
      };
    }
  });

  MESSAGE_CHANNELS.forEach((channel) => {
    const rawConfig = channel.key === "messenger" && !rawChannels[channel.key]
      ? legacyMessenger
      : rawChannels[channel.key];
    channels[channel.key] = cleanChannelConfig(rawConfig, channel.key);
  });

  const selectedChannels = ensureArray(source.selected_channels, defaults.selected_channels)
    .map(normalizeLegacyChannel)
    .filter((channel, index, arr) => MESSAGE_CHANNELS.some((item) => item.key === channel) && arr.indexOf(channel) === index)
    .filter((channel) => channels[channel]?.enabled);

  const categories = ensureArray(source.template_categories, defaults.template_categories)
    .map((category) => String(category || "").trim())
    .filter(Boolean);

  const templates = ensureArray(source.templates, defaults.templates)
    .filter((template) => template && typeof template === "object")
    .map(cleanTemplate);

  return {
    selected_channels: selectedChannels.length ? selectedChannels : ["sms"],
    channel_labels: CHANNEL_LABELS,
    messenger_type_labels: defaults.messenger_type_labels,
    messenger_options: MESSENGER_OPTIONS,
    channels,
    template_categories: categories.length ? [...new Set(categories)] : defaults.template_categories,
    template_variables: ensureArray(source.template_variables, defaults.template_variables),
    templates: templates.length ? templates : defaults.templates,
  };
}

export function getSmsStats(text) {
  const value = String(text || "");
  const hasUnicode = /[^\x00-\x7F]/.test(value);
  const singleLimit = hasUnicode ? 70 : 160;
  const multipartLimit = hasUnicode ? 67 : 153;

  if (!value.length) {
    return {
      length: 0,
      segments: 0,
      limit: singleLimit,
      remaining: singleLimit,
      isUnicode: hasUnicode,
    };
  }

  const segments =
    value.length <= singleLimit
      ? 1
      : Math.ceil(value.length / multipartLimit);

  const segmentLimit = segments <= 1 ? singleLimit : multipartLimit;
  const remaining = segments * segmentLimit - value.length;

  return {
    length: value.length,
    segments,
    limit: segmentLimit,
    remaining,
    isUnicode: hasUnicode,
  };
}

export function applyMessageVariables(body, data = {}) {
  const values = {
    "{نام_مشتری}": data.customer || data.customerName || "مشتری گرامی",
    "{نام_محصول}": data.product || data.productName || "محصول",
    "{مبلغ}": data.amount || data.total || "۰ تومان",
    "{تاریخ}": data.date || "امروز",
    "{کد_سفارش}": data.orderCode || data.order_code || "-",
    "{شماره_تماس}": data.phone || "",
    "{ایمیل}": data.email || "",
  };

  return String(body || "").replace(/\{[^}]+\}/g, (match) => values[match] ?? match);
}

export async function fetchMessageSettings() {
  const response = await api.get("/settings/messages");
  return normalizeMessageSettings(response.data);
}

export async function saveMessageSettings(settings) {
  const response = await api.put("/settings/messages", normalizeMessageSettings(settings));
  const normalized = normalizeMessageSettings(response.data);
  window.dispatchEvent(new CustomEvent("order-assistant-message-settings-updated"));
  return normalized;
}

export async function testMessageConnection(channel, settings) {
  const response = await api.post("/settings/messages/test-connection", {
    channel: normalizeLegacyChannel(channel),
    settings: normalizeMessageSettings(settings),
  });

  const result = response.data || {};
  if (result.settings) {
    result.settings = normalizeMessageSettings(result.settings);
  }

  window.dispatchEvent(new CustomEvent("order-assistant-message-settings-updated"));
  return result;
}

export function templatesToRuntimeMap(templates = []) {
  return normalizeMessageSettings({ templates }).templates.reduce((acc, template) => {
    if (!template.is_active) return acc;

    acc[template.title] = {
      channel: CHANNEL_LABELS[template.channel] || template.channel || "پیامک",
      category: template.category || "",
      body: template.body || "",
      buildText: ({ order, form, items }) => {
        const firstItem = Array.isArray(items) && items.length ? items[0] : {};
        return applyMessageVariables(template.body, {
          customer: order?.customer || form?.customer,
          product: firstItem?.name || firstItem?.productName || firstItem?.title,
          amount: order?.total || form?.total,
          date: order?.date || form?.date,
          orderCode: order?.code || form?.orderCode,
          phone: order?.phone || form?.phone,
          email: order?.email || form?.email,
        });
      },
    };

    return acc;
  }, {});
}
