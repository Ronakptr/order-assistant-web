import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNTING_PROVIDERS,
  allocateAccountingIds,
  defaultAccountingSettings,
  exportAccountingFile,
  fetchAccountingSettings,
  importAccountingFile,
  normalizeAccountingSettings,
  saveAccountingSettings,
} from "../../../../api/accounting";
import "./AccountingSettings.css";

const PROVIDER_CHOICES = [
  { key: "asan", label: "آسان" },
  { key: "soren", label: "سورن" },
  { key: "holoo", label: "هلو (به‌زودی)", disabled: true },
];

const STAGES = [
  "انتخاب نرم‌افزار",
  "قوانین شناسه",
  "انتقال داده",
  "خروجی",
];

const ENTITY_LABELS = {
  customers: "مشتری‌ها",
  products: "کالاها",
  orders: "سفارش‌ها",
};

function mergeAccountingSettings(settings) {
  return normalizeAccountingSettings(settings || defaultAccountingSettings());
}

function getInitialProvider(settings) {
  const normalized = mergeAccountingSettings(settings);
  const provider = String(normalized.provider || "").toLowerCase();

  if (provider === "asan" || provider === "soren") return provider;
  if (normalized.soren?.enabled) return "soren";
  if (normalized.asan?.enabled) return "asan";

  return "soren";
}

function getProviderLabel(provider) {
  return ACCOUNTING_PROVIDERS?.[provider] || PROVIDER_CHOICES.find((item) => item.key === provider)?.label || "حسابداری";
}

function getProviderFromLabel(label) {
  const item = PROVIDER_CHOICES.find((option) => option.label === label);
  return item?.key || "";
}

function normalizeNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return "";

  const normalized = String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/,/g, "")
    .replace(/،/g, "")
    .trim();

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getProviderConfig(settings, provider) {
  const defaults = defaultAccountingSettings();
  return {
    ...(defaults?.[provider] || {}),
    ...(settings?.[provider] || {}),
  };
}

function providerStatus(settings, provider) {
  const enabled = Boolean(settings?.provider === provider && settings?.[provider]?.enabled);
  return enabled ? "فعال" : "غیرفعال";
}

function providerHint(provider) {
  if (provider === "soren") return "قالب سورن برای خریدار، کالا و فاکتور فروش استفاده می‌شود.";
  if (provider === "asan") return "قالب آسان برای مشتری، کالا و فاکتور فروش استفاده می‌شود.";
  return "فعلاً اتصال فایل برای آسان و سورن آماده است.";
}

function fieldLabels(provider) {
  if (provider === "soren") {
    return {
      customerStart: "شروع کد خریدار سورن",
      productStart: "شروع کد کالا سورن",
      orderPrefix: "پیشوند شماره فاکتور سورن",
      customerGroup: "کد حساب پیش‌فرض خریدار",
      customerType: "نوع شخص",
      productGroup: "کد گروه پیش‌فرض کالا",
      productSubgroup: "کد واحد پیش‌فرض کالا",
      defaultTax: "کد مالیاتی پیش‌فرض",
    };
  }

  return {
    customerStart: "شروع شناسه شخص آسان",
    productStart: "شروع شناسه کالا آسان",
    orderPrefix: "پیشوند شماره فاکتور آسان",
    customerGroup: "گروه پیش‌فرض مشتری",
    customerType: "نوع شخص",
    productGroup: "گروه پیش‌فرض کالا",
    productSubgroup: "زیرگروه پیش‌فرض کالا",
    defaultTax: "درصد مالیات کالا",
  };
}

function asLineText(lines = []) {
  return Array.isArray(lines) ? lines : [lines];
}

function AlertCard({ kind = "info", title, lines }) {
  return (
    <div className={`accounting-alert-card accounting-alert-card--${kind}`}>
      <div className="accounting-alert-card__title">
        <b>{kind === "warn" ? "⚠" : kind === "danger" ? "!" : kind === "success" ? "✓" : "ⓘ"}</b>
        <span>{title}</span>
      </div>

      <div className="accounting-alert-card__lines">
        {asLineText(lines).map((line) => (
          <p key={line}>• {line}</p>
        ))}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label className="accounting-labeled-entry">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(type === "number" ? normalizeNumber(raw, value || 0) : raw);
        }}
      />
    </label>
  );
}

function OutlineButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      className={`accounting-outline-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      className={`accounting-primary-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function StageCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`accounting-stage-card ${className}`.trim()}>
      <h3>{title}</h3>
      {subtitle && <p className="accounting-stage-card__subtitle">{subtitle}</p>}
      <div className="accounting-stage-card__body">{children}</div>
    </section>
  );
}

function MiniCard({ title, children, className = "" }) {
  return (
    <div className={`accounting-mini-card ${className}`}>
      <h4>{title}</h4>
      <div className="accounting-mini-card__body">{children}</div>
    </div>
  );
}

function Progress({ currentStage }) {
  return (
    <div className="accounting-progress">
      {STAGES.map((label, index) => {
        const stageNumber = index + 1;
        const state = stageNumber < currentStage ? "done" : stageNumber === currentStage ? "active" : "idle";
        return (
          <div key={label} className={`accounting-progress__item accounting-progress__item--${state}`}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function AccountingSettings() {
  const [settings, setSettings] = useState(() => defaultAccountingSettings());
  const [selectedProvider, setSelectedProvider] = useState("soren");
  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState("");
  const [status, setStatus] = useState("");
  const [stage3Status, setStage3Status] = useState("");
  const fileInputsRef = useRef({});

  const providerLabelValue = useMemo(() => getProviderLabel(selectedProvider), [selectedProvider]);
  const config = useMemo(() => getProviderConfig(settings, selectedProvider), [settings, selectedProvider]);
  const labels = useMemo(() => fieldLabels(selectedProvider), [selectedProvider]);
  const isEnabled = Boolean(settings?.provider === selectedProvider && settings?.[selectedProvider]?.enabled);
  const statusText = providerStatus(settings, selectedProvider);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchAccountingSettings()
      .then((data) => {
        if (!alive) return;
        const normalized = mergeAccountingSettings(data);
        setSettings(normalized);
        setSelectedProvider(getInitialProvider(normalized));
      })
      .catch((error) => {
        console.error(error);
        if (alive) setStatus("خطا در دریافت تنظیمات حسابداری");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const setProviderField = (field, value) => {
    setSettings((previous) => ({
      ...previous,
      [selectedProvider]: {
        ...getProviderConfig(previous, selectedProvider),
        [field]: value,
      },
    }));
    setStatus("");
  };

  const changeProviderByLabel = (label) => {
    const nextProvider = getProviderFromLabel(label);

    if (!nextProvider || nextProvider === "holoo") {
      setStatus("هلو هنوز آماده نیست. لطفاً آسان یا سورن را انتخاب کنید.");
      return;
    }

    setSelectedProvider(nextProvider);
    setStatus("");
    setStage3Status("");

    if (currentStage > 1 && !settings?.[nextProvider]?.enabled) {
      setCurrentStage(1);
    }
  };

  const persistSettings = async (advance = false, nextSettings = null) => {
    try {
      setSaving(true);
      const payload = mergeAccountingSettings(nextSettings || settings);
      const saved = await saveAccountingSettings(payload);
      setSettings(saved);
      setStatus(`تنظیمات ${getProviderLabel(selectedProvider)} ذخیره شد.`);

      if (advance) {
        setCurrentStage(3);
      }

      return saved;
    } catch (error) {
      setStatus(error?.response?.data?.detail || error?.message || "ذخیره تنظیمات حسابداری ناموفق بود.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const startIntegration = async () => {
    if (!selectedProvider || selectedProvider === "holoo") {
      setStatus("فعلاً اتصال فایل فقط برای آسان و سورن آماده است. لطفاً یکی از این دو را انتخاب کنید.");
      return;
    }

    let nextSettings = mergeAccountingSettings(settings);

    if (!isEnabled) {
      const ok = window.confirm(
        "شناسه حسابداری در ستون جدا ذخیره می‌شود.\n" +
          "کد داخلی برنامه تغییر نمی‌کند.\n\n" +
          "ادامه می‌دهید؟"
      );

      if (!ok) return;

      nextSettings = mergeAccountingSettings({
        ...nextSettings,
        provider: selectedProvider,
        asan: {
          ...nextSettings.asan,
          enabled: selectedProvider === "asan",
        },
        soren: {
          ...nextSettings.soren,
          enabled: selectedProvider === "soren",
        },
      });

      setSettings(nextSettings);
      await persistSettings(false, nextSettings);
      setStatus(`هماهنگ‌سازی ${getProviderLabel(selectedProvider)} فعال شد.`);
    }

    setCurrentStage(2);
  };

  const collectSettings = () => {
    const currentConfig = getProviderConfig(settings, selectedProvider);
    const nextSettings = mergeAccountingSettings({
      ...settings,
      provider: selectedProvider,
      asan: {
        ...settings.asan,
        enabled: selectedProvider === "asan",
      },
      soren: {
        ...settings.soren,
        enabled: selectedProvider === "soren",
      },
    });

    if (selectedProvider === "soren") {
      nextSettings.soren = {
        ...nextSettings.soren,
        ...currentConfig,
        enabled: true,
        provider: "soren",
        customer_id_start: Math.max(1, normalizeNumber(currentConfig.customer_id_start, 1) || 1),
        product_id_start: Math.max(1, normalizeNumber(currentConfig.product_id_start, 1) || 1),
        order_prefix: String(currentConfig.order_prefix || "").trim(),
        default_customer_account_prefix: String(currentConfig.default_customer_account_prefix || "").trim() || "102001",
        default_product_group_code: String(currentConfig.default_product_group_code || "").trim() || "001",
        default_unit_code: String(currentConfig.default_unit_code || "").trim() || "01",
        default_tax_code: String(currentConfig.default_tax_code || "").trim(),
        mark_orders_after_export: Boolean(currentConfig.mark_orders_after_export),
      };
    } else {
      nextSettings.asan = {
        ...nextSettings.asan,
        ...currentConfig,
        enabled: true,
        provider: "asan",
        customer_id_start: Math.max(1, normalizeNumber(currentConfig.customer_id_start, 1001) || 1001),
        product_id_start: Math.max(1, normalizeNumber(currentConfig.product_id_start, 1001) || 1001),
        order_prefix: String(currentConfig.order_prefix || "").trim(),
        default_customer_group: String(currentConfig.default_customer_group || "").trim() || "مشتری ها",
        default_customer_type: String(currentConfig.default_customer_type || "").trim() || "حقیقی",
        default_product_group: String(currentConfig.default_product_group || "").trim() || "متفرقه",
        default_product_subgroup: String(currentConfig.default_product_subgroup || "").trim() || "متفرقه",
        default_product_tax_rate: Math.max(0, normalizeNumber(currentConfig.default_product_tax_rate, 0) || 0),
        default_invoice_discount: normalizeNumber(currentConfig.default_invoice_discount, 0) || 0,
        default_invoice_tax: normalizeNumber(currentConfig.default_invoice_tax, 0) || 0,
        default_item_discount: normalizeNumber(currentConfig.default_item_discount, 0) || 0,
        default_item_tax: normalizeNumber(currentConfig.default_item_tax, 0) || 0,
        mark_orders_after_export: Boolean(currentConfig.mark_orders_after_export),
      };
    }

    return nextSettings;
  };

  const confirmSettingsAndContinue = async () => {
    const saved = await persistSettings(false, collectSettings());

    if (saved) {
      setCurrentStage(3);
    }
  };

  const handleAllocateIds = async () => {
    try {
      setWorking("allocate");
      await persistSettings(false, collectSettings());

      const ok = window.confirm(
        "برای داده‌های فعلی برنامه شناسه حسابداری ساخته می‌شود.\n" +
          "کد داخلی مشتری، کالا و سفارش تغییر نمی‌کند.\n\n" +
          "ادامه می‌دهید؟"
      );

      if (!ok) return;

      const result = await allocateAccountingIds("all", selectedProvider);
      const counts = result?.counts || {};
      const message = `شناسه‌گذاری ${getProviderLabel(selectedProvider)} انجام شد. مشتریان: ${counts.customers || 0} | کالاها: ${counts.products || 0} | سفارش‌ها: ${counts.orders || 0}`;

      setStatus(message);
      setStage3Status("شناسه حسابداری برای داده‌های فعلی بررسی و تکمیل شد.");
    } catch (error) {
      setStatus(error?.response?.data?.detail || error?.message || "تخصیص شناسه ناموفق بود.");
    } finally {
      setWorking("");
    }
  };

  const handleImportClick = (entity) => {
    fileInputsRef.current?.[entity]?.click();
  };

  const handleImportFile = async (entity, file) => {
    if (!file) return;

    if (entity === "orders") {
      const ok = window.confirm(
        `سفارش‌های قبلی ${getProviderLabel(selectedProvider)} به عنوان واردشده ذخیره می‌شوند.\n` +
          "دوباره وارد خروجی حسابداری نمی‌شوند.\n\n" +
          "ادامه می‌دهید؟"
      );
      if (!ok) return;
    }

    try {
      setWorking(`import-${entity}`);
      await persistSettings(false, collectSettings());
      const result = await importAccountingFile(entity, file, collectSettings());
      const imported = result?.imported || 0;
      const updated = result?.updated || 0;
      const skipped = result?.skipped || 0;
      const itemRows = result?.item_rows;

      if (entity === "customers") {
        setStatus(`ورود مشتریان انجام شد: جدید ${imported} | به‌روزرسانی ${updated} | رد شده ${skipped}`);
        setStage3Status("ورود مشتریان انجام شد. در صورت نیاز، ورود کالاها را انجام دهید.");
      } else if (entity === "products") {
        setStatus(`ورود کالاها انجام شد: جدید ${imported} | به‌روزرسانی ${updated} | رد شده ${skipped}`);
        setStage3Status("ورود کالاها انجام شد. در صورت نیاز، سفارش‌های قبلی را وارد کنید.");
      } else {
        setStatus(`ورود سفارش‌ها انجام شد: جدید ${imported} | به‌روزرسانی ${updated} | ردیف کالا ${itemRows || 0} | رد شده ${skipped}`);
        setStage3Status("ورود سفارش‌های قبلی انجام شد. اکنون می‌توانید خروجی بسازید.");
      }
    } catch (error) {
      setStatus(error?.response?.data?.detail || error?.message || `ورود ${ENTITY_LABELS[entity]} ناموفق بود.`);
    } finally {
      setWorking("");
      if (fileInputsRef.current?.[entity]) fileInputsRef.current[entity].value = "";
    }
  };

  const markNoPreviousData = () => {
    setStage3Status("مرحله انتقال داده بدون ورود فایل قبلی ادامه داده شد.");
  };

  const buildOutput = async () => {
    try {
      if (config?.mark_orders_after_export) {
        const ok = window.confirm(
          "بعد از ساخت خروجی، سفارش‌های داخل خروجی علامت‌گذاری می‌شوند.\n" +
            "در خروجی بعدی دوباره نمی‌آیند.\n\n" +
            "ادامه می‌دهید؟"
        );

        if (!ok) return;
      }

      setWorking("export-package");
      const collected = collectSettings();
      await persistSettings(false, collected);

      const customers = await exportAccountingFile("customers", collected, false);
      const products = await exportAccountingFile("products", collected, false);
      const orders = await exportAccountingFile("orders", collected, false);
      const label = getProviderLabel(orders?.provider || products?.provider || customers?.provider || selectedProvider);

      setStatus(`خروجی ${label} ساخته شد. مشتری، کالا و ردیف سفارش آماده ورود به حسابداری هستند.`);
    } catch (error) {
      setStatus(error?.response?.data?.detail || error?.message || `ساخت خروجی ${getProviderLabel(selectedProvider)} ناموفق بود.`);
    } finally {
      setWorking("");
    }
  };

  const buildTemplates = async () => {
    try {
      setWorking("templates");
      const collected = collectSettings();
      await persistSettings(false, collected);
      await exportAccountingFile("customers", collected, true);
      await exportAccountingFile("products", collected, true);
      await exportAccountingFile("orders", collected, true);
      setStatus(`قالب‌های ${getProviderLabel(selectedProvider)} ساخته شدند.`);
    } catch (error) {
      setStatus(error?.response?.data?.detail || error?.message || "ساخت قالب‌ها ناموفق بود.");
    } finally {
      setWorking("");
    }
  };

  const renderStage1 = () => (
    <StageCard
      className="accounting-stage-card--software"
      title="انتخاب نرم‌افزار حسابداری"
      subtitle="ابتدا مشخص کنید خروجی و ورودی حسابداری باید با قالب کدام نرم‌افزار ساخته شود."
    >
      <AlertCard
        kind="warn"
        title="نکته مهم"
        lines={[
          "تا قبل از شروع هماهنگ‌سازی، شناسه حسابداری ساخته نمی‌شود.",
          "کد داخلی مشتری، کالا و سفارش تغییر نمی‌کند.",
          "شناسه حسابداری در ستون جدا ذخیره می‌شود.",
        ]}
      />

      <div className="accounting-stage-one-form">
        <label className="accounting-provider-select-wrap">
          <span>نرم‌افزار حسابداری شرکت</span>

          <div className="accounting-provider-select-box">
            <select value={providerLabelValue} onChange={(event) => changeProviderByLabel(event.target.value)}>
              {PROVIDER_CHOICES.map((option) => (
                <option key={option.key} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>

            <small className={`accounting-connection-status accounting-connection-status--${isEnabled ? "success" : "warn"}`}>
              {statusText}
            </small>
          </div>
        </label>
      </div>

      <p className="accounting-workflow-hint">{providerHint(selectedProvider)}</p>

      <div className="accounting-actions-row accounting-actions-row--single">
        <PrimaryButton onClick={startIntegration} disabled={saving} className="accounting-actions-row__primary-wide">
          {isEnabled ? "ادامه به مرحله تنظیم شناسه‌ها" : "شروع هماهنگ‌سازی"}
        </PrimaryButton>
      </div>
    </StageCard>
  );

  const renderStage2 = () => (
    <StageCard
      className="accounting-stage-card--rules"
      title="تنظیم شناسه‌ها و پیش‌فرض‌ها"
      subtitle="این بخش فقط قوانین فایل حسابداری را مشخص می‌کند."
    >
      <AlertCard
        kind="info"
        title="قبل از ادامه بررسی کنید"
        lines={[
          "شروع شناسه‌ها باید با قوانین نرم‌افزار حسابداری شرکت هماهنگ باشد.",
          "اگر عددها را مطمئن نیستید، از حسابدار یا پشتیبان نرم‌افزار بپرسید.",
          "این مرحله هیچ کد داخلی برنامه را عوض نمی‌کند.",
        ]}
      />

      <div className="accounting-two-column-grid">
        <MiniCard title="الف) قوانین شناسه حسابداری">
          <div className="accounting-entry-grid accounting-entry-grid--ids">
            <TextField label={labels.customerStart} type="number" value={config.customer_id_start} onChange={(value) => setProviderField("customer_id_start", value)} />
            <TextField label={labels.productStart} type="number" value={config.product_id_start} onChange={(value) => setProviderField("product_id_start", value)} />
            <TextField label={labels.orderPrefix} value={config.order_prefix} onChange={(value) => setProviderField("order_prefix", value)} />
          </div>
          <p className="accounting-mini-note">پیشوند شماره فاکتور اختیاری است. برای سورن معمولاً می‌تواند خالی بماند.</p>
        </MiniCard>

        <MiniCard title="ب) مقدارهای پیش‌فرض خروجی">
          {selectedProvider === "asan" ? (
            <div className="accounting-entry-grid accounting-entry-grid--defaults">
              <TextField label={labels.customerGroup} value={config.default_customer_group} onChange={(value) => setProviderField("default_customer_group", value)} />
              <TextField label={labels.customerType} value={config.default_customer_type} onChange={(value) => setProviderField("default_customer_type", value)} />
              <TextField label={labels.productGroup} value={config.default_product_group} onChange={(value) => setProviderField("default_product_group", value)} />
              <TextField label={labels.productSubgroup} value={config.default_product_subgroup} onChange={(value) => setProviderField("default_product_subgroup", value)} />
              <TextField label={labels.defaultTax} type="number" value={config.default_product_tax_rate} onChange={(value) => setProviderField("default_product_tax_rate", value)} />
            </div>
          ) : (
            <div className="accounting-entry-grid accounting-entry-grid--defaults">
              <TextField label={labels.customerGroup} value={config.default_customer_account_prefix} onChange={(value) => setProviderField("default_customer_account_prefix", value)} />
              <TextField label={labels.productGroup} value={config.default_product_group_code} onChange={(value) => setProviderField("default_product_group_code", value)} />
              <TextField label={labels.productSubgroup} value={config.default_unit_code} onChange={(value) => setProviderField("default_unit_code", value)} />
              <TextField label={labels.defaultTax} value={config.default_tax_code} onChange={(value) => setProviderField("default_tax_code", value)} />
            </div>
          )}

          <label className="accounting-checkline">
            <input
              type="checkbox"
              checked={Boolean(config.mark_orders_after_export)}
              onChange={(event) => setProviderField("mark_orders_after_export", event.target.checked)}
            />
            <span>بعد از ساخت خروجی، سفارش‌ها خروجی‌گرفته‌شده شوند</span>
          </label>
        </MiniCard>
      </div>

      <div className="accounting-actions-row accounting-actions-row--split">
        <div className="accounting-actions-row__right">
          <OutlineButton onClick={() => setCurrentStage(1)}>بازگشت</OutlineButton>
        </div>

        <div className="accounting-actions-row__left">
          <PrimaryButton onClick={confirmSettingsAndContinue} disabled={saving}>تأیید تنظیمات و ادامه</PrimaryButton>
        </div>
      </div>
    </StageCard>
  );

  const renderStage3 = () => {
    const label = getProviderLabel(selectedProvider);

    return (
      <StageCard
        className="accounting-stage-card--transfer"
        title="انتقال یا آماده‌سازی داده‌ها"
        subtitle="در این مرحله مشخص می‌کنید داده‌های قبلی از کجا وارد حسابداری شوند."
      >
        <AlertCard
          kind="warn"
          title="دو مسیر مجزا"
          lines={[
            "اگر شرکت قبلاً در نرم‌افزار حسابداری اطلاعات دارد، مسیر ورود اطلاعات را انجام دهید.",
            "اگر فقط در این برنامه اطلاعات دارید، شناسه حسابداری بسازید.",
            "برای ساخت خروجی، شناسه مشتری، کالا و فاکتور لازم است.",
          ]}
        />

        <div className="accounting-two-column-grid">
          <MiniCard title={`مسیر اول — ورود اطلاعات قبلی از ${label}`}>
            <p className="accounting-mini-note accounting-mini-note--top">ترتیب پیشنهادی را رعایت کنید:</p>
            <div className="accounting-import-buttons">
              <OutlineButton onClick={() => handleImportClick("customers")} disabled={Boolean(working)}>ورود مشتریان</OutlineButton>
              <OutlineButton onClick={() => handleImportClick("products")} disabled={Boolean(working)}>ورود کالاها</OutlineButton>
              <OutlineButton onClick={() => handleImportClick("orders")} disabled={Boolean(working)} className="accounting-import-buttons__wide">ورود سفارش‌های قبلی</OutlineButton>
            </div>

            <AlertCard
              kind="info"
              title="ترتیب ورود"
              lines={["اول مشتریان", "بعد کالاها", "در آخر سفارش‌ها یا فاکتورها"]}
            />
          </MiniCard>

          <MiniCard title="مسیر دوم — آماده‌سازی اطلاعات فعلی برنامه">
            <p className="accounting-mini-note accounting-mini-note--top">
              این مسیر برای زمانی است که سفارش‌ها، مشتریان یا کالاها از قبل داخل برنامه ثبت شده‌اند.
            </p>
            <OutlineButton onClick={handleAllocateIds} disabled={Boolean(working)} className="accounting-wide-button">
              {working === "allocate" ? "در حال ساخت شناسه..." : "ساخت شناسه حسابداری برای داده‌های فعلی"}
            </OutlineButton>

            <AlertCard kind="success" title="اطمینان خاطر" lines={["فقط ستون شناسه حسابداری پر می‌شود.", "کد داخلی برنامه تغییر نمی‌کند."]} />
          </MiniCard>
        </div>

        {stage3Status && <p className="accounting-stage-status">{stage3Status}</p>}

        <div className="accounting-actions-row accounting-actions-row--split accounting-actions-row--transfer">
          <div className="accounting-actions-row__right">
            <OutlineButton onClick={() => setCurrentStage(2)}>بازگشت</OutlineButton>
          </div>

          <div className="accounting-actions-row__left accounting-actions-row__left--attached">
            <OutlineButton onClick={markNoPreviousData}>فعلاً داده قبلی ندارم</OutlineButton>
            <PrimaryButton onClick={() => setCurrentStage(4)}>ادامه به ساخت خروجی</PrimaryButton>
          </div>
        </div>

        {Object.keys(ENTITY_LABELS).map((entity) => (
          <input
            key={entity}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            hidden
            ref={(element) => {
              fileInputsRef.current[entity] = element;
            }}
            onChange={(event) => handleImportFile(entity, event.target.files?.[0])}
          />
        ))}
      </StageCard>
    );
  };

  const renderStage4 = () => {
    const label = getProviderLabel(selectedProvider);

    return (
      <StageCard
        className="accounting-stage-card--output"
        title="ساخت خروجی برای حسابداری"
        subtitle={`در این مرحله فایل‌های آماده ورود به ${label} ساخته می‌شود.`}
      >
        <AlertCard
          kind="danger"
          title="قبل از ساخت خروجی"
          lines={[
            "خروجی فقط برای سفارش‌ها و اطلاعات جدید ساخته می‌شود.",
            "اگر گزینه علامت‌گذاری فعال باشد، سفارش‌ها دوباره خروجی نمی‌آیند.",
            "در نرم‌افزار حسابداری، اول مشتریان، بعد کالاها، بعد فروش را وارد کنید.",
          ]}
        />

        <div className="accounting-output-row">
          <p>ترتیب ورود فایل‌ها: مشتریان ← کالاها ← سفارش‌ها یا فروش</p>
          <PrimaryButton onClick={buildOutput} disabled={Boolean(working)}>
            {working === "export-package" ? "در حال ساخت خروجی..." : "ساخت خروجی"}
          </PrimaryButton>
        </div>

        <div className="accounting-template-row">
          <OutlineButton onClick={buildTemplates} disabled={Boolean(working)}>
            {working === "templates" ? "در حال ساخت قالب‌ها..." : "ساخت قالب‌های خالی"}
          </OutlineButton>
          <span>برای بررسی ساختار Excel قبل از خروجی واقعی استفاده می‌شود.</span>
        </div>

        <div className="accounting-actions-row accounting-actions-row--split">
          <div className="accounting-actions-row__right">
            <OutlineButton onClick={() => setCurrentStage(3)}>بازگشت</OutlineButton>
          </div>
        </div>
      </StageCard>
    );
  };

  if (loading) {
    return (
      <div className="accounting-settings">
        <div className="accounting-loading-card">در حال دریافت تنظیمات حسابداری...</div>
      </div>
    );
  }

  return (
    <div className="accounting-settings">
      <header className="accounting-page-header">
        <h2>هماهنگ‌سازی حسابداری</h2>
        <button type="button" className="accounting-save-top" onClick={() => persistSettings(false, collectSettings())} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
      </header>

      <Progress currentStage={currentStage} />

      <main className="accounting-stage-holder">
        {status && <div className="accounting-global-status">{status}</div>}
        {currentStage === 1 && renderStage1()}
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
        {currentStage === 4 && renderStage4()}
      </main>
    </div>
  );
}
