import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./InvoiceSettings.css";

import {
  DEFAULT_INVOICE_SETTINGS,
  INVOICE_PALETTES,
  loadInvoiceSettings,
  resetInvoiceSettings,
  saveInvoiceSettings,
} from "../../../../utils/invoiceSettings";

const COLOR_FIELDS = [
  { key: "primary", label: "رنگ اصلی" },
  { key: "accent", label: "رنگ تاکید" },
  { key: "surface", label: "رنگ کارت‌ها" },
  { key: "tableHead", label: "رنگ ردیف‌های جدول" },
  { key: "border", label: "رنگ خطوط" },
  { key: "text", label: "رنگ متن" },
  { key: "muted", label: "رنگ متن کم‌رنگ" },
  { key: "danger", label: "رنگ هشدار / مانده" },
];

const VISIBILITY_FIELDS = [
  { key: "showLogo", label: "نمایش لوگو" },
  { key: "showCompanyName", label: "نمایش نام شرکت" },
  { key: "showTagline", label: "نمایش شعار شرکت" },
  { key: "showAddress", label: "نمایش آدرس" },
  { key: "showPhones", label: "نمایش تلفن‌ها" },
  { key: "showWebsite", label: "نمایش وب‌سایت" },
  { key: "showEmail", label: "نمایش ایمیل" },
  { key: "showEconomicCode", label: "نمایش کد اقتصادی" },
  { key: "showBuyerSignature", label: "نمایش امضای خریدار" },
  { key: "showSellerSignature", label: "نمایش امضای فروشنده" },
  { key: "showFooter", label: "نمایش پاورقی" },
];

const SAMPLE_ORDER = {
  code: "ORD-0027",
  date: "۱۴۰۳/۰۳/۰۵",
  customerName: "علی رضایی",
  customerPhone: "09120000000",
  items: [
    {
      title: "ورق سیاه ST37",
      desc: "ضخامت: ۲ میل",
      quantity: "۱ عدد",
      unitPrice: 12000000,
      total: 12000000,
    },
    {
      title: "تسمه قالب بندی",
      desc: "طول: ۱۲۰ سانت",
      quantity: "سانتی متر ۱۲۰ × ۴",
      unitPrice: 12000,
      total: 6000000,
    },
    {
      title: "ناودانی سبک",
      desc: "",
      quantity: "۱ عدد",
      unitPrice: 8000000,
      total: 8000000,
    },
  ],
};

function toPersianDigits(value) {
  const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const english = String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/,/g, "");

  const number = Number(english);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `${toPersianDigits(
    normalizeNumber(value).toLocaleString("en-US")
  )} تومان`;
}

function isHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value || "").trim());
}

function safeColor(value, fallback) {
  return isHex(value) ? value : fallback;
}

function InvoicePreview({ settings, previewRef }) {
  const company = settings.company;
  const visibility = settings.visibility;
  const palette = settings.palette;
  const invoice = settings.invoice;
  const tax = settings.tax;

  const subtotal = SAMPLE_ORDER.items.reduce((sum, item) => sum + item.total, 0);

  const taxAmount = tax.enabledByDefault
    ? subtotal * (normalizeNumber(tax.defaultRate) / 100)
    : 0;

  const total = subtotal + taxAmount;

  const vars = {
    "--invoice-primary": safeColor(palette.primary, "#182641"),
    "--invoice-accent": safeColor(palette.accent, "#CBB135"),
    "--invoice-surface": safeColor(palette.surface, "#F8FAFC"),
    "--invoice-table-head": safeColor(palette.tableHead, "#EEF2F7"),
    "--invoice-border": safeColor(palette.border, "#D7DCE5"),
    "--invoice-text": safeColor(palette.text, "#111827"),
    "--invoice-muted": safeColor(palette.muted, "#64748B"),
    "--invoice-danger": safeColor(palette.danger, "#B91C1C"),
  };

  return (
    <div className="invoice-preview-shell">
      <div className="invoice-preview-card" style={vars}>
        <div className="invoice-preview-paper" ref={previewRef}>
          <header className="invoice-preview-header">
            <div className="invoice-preview-brand">
              {visibility.showCompanyName && <strong>{company.name}</strong>}

              {visibility.showTagline && company.tagline && (
                <span>{company.tagline}</span>
              )}
            </div>

            {visibility.showLogo && (
              <div className="invoice-preview-logo">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="لوگو" />
                ) : (
                  <span>لوگو</span>
                )}
              </div>
            )}

            <div className="invoice-preview-title-box">
              <p>
                تاریخ: <b>{SAMPLE_ORDER.date}</b>
              </p>

              <p>
                شماره: <b>{SAMPLE_ORDER.code}</b>
              </p>
            </div>
          </header>

          {(visibility.showAddress ||
            visibility.showPhones ||
            visibility.showWebsite ||
            visibility.showEmail ||
            visibility.showEconomicCode) && (
            <section className="invoice-preview-contact">
              {visibility.showAddress && company.address && (
                <span>{company.address}</span>
              )}

              {visibility.showPhones && company.phones && (
                <span>{company.phones}</span>
              )}

              {visibility.showWebsite && company.website && (
                <span>{company.website}</span>
              )}

              {visibility.showEmail && company.email && (
                <span>{company.email}</span>
              )}

              {visibility.showEconomicCode && company.economicCode && (
                <span>کد اقتصادی: {company.economicCode}</span>
              )}
            </section>
          )}

          <section className="invoice-preview-buyer">
            <h4>مشخصات خریدار</h4>

            <div>
              <span>نام مشتری: {SAMPLE_ORDER.customerName}</span>

              <span>
                موبایل / تلفن: {toPersianDigits(SAMPLE_ORDER.customerPhone)}
              </span>
            </div>
          </section>

          <table className="invoice-preview-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>شرح کالا و مشخصات</th>
                <th>مقدار</th>
                <th>فی</th>
                <th>مبلغ</th>
              </tr>
            </thead>

            <tbody>
              {SAMPLE_ORDER.items.map((item, index) => (
                <tr key={`${item.title}-${index}`}>
                  <td>{toPersianDigits(index + 1)}</td>

                  <td className="invoice-preview-desc">
                    <strong>{item.title}</strong>

                    {item.desc && <small>{item.desc}</small>}
                  </td>

                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="invoice-preview-bottom">
            <div className="invoice-preview-note">
              <strong>توضیحات</strong>
              <span>{invoice.note}</span>
            </div>

            <div className="invoice-preview-summary">
              <div>
                <span>جمع اقلام</span>
                <b>{formatMoney(subtotal)}</b>
              </div>

              {tax.enabledByDefault && (
                <div>
                  <span>مالیات ({toPersianDigits(tax.defaultRate)}٪)</span>
                  <b>{formatMoney(taxAmount)}</b>
                </div>
              )}

              <div className="invoice-preview-total">
                <span>جمع نهایی</span>
                <b>{formatMoney(total)}</b>
              </div>
            </div>
          </section>

          {invoice.validityText && (
            <div className="invoice-preview-validity">
              {invoice.validityText}
            </div>
          )}

          {(visibility.showBuyerSignature || visibility.showSellerSignature) && (
            <div className="invoice-preview-signatures">
              {visibility.showBuyerSignature && <div>امضای خریدار</div>}
              {visibility.showSellerSignature && <div>امضای فروشنده</div>}
            </div>
          )}

          {visibility.showFooter && invoice.footerText && (
            <footer className="invoice-preview-footer">
              {invoice.footerText}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

function AccordionSection({ title, children, defaultOpen = false }) {
  return (
    <details className="invoice-accordion" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <b>⌄</b>
      </summary>

      <div className="invoice-accordion__body">{children}</div>
    </details>
  );
}

export default function InvoiceSettings() {
  const [settings, setSettings] = useState(DEFAULT_INVOICE_SETTINGS);
  const [message, setMessage] = useState("");
  const logoInputRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    setSettings(loadInvoiceSettings());
  }, []);

  const logoText = useMemo(() => {
    return settings.company.logoUrl
      ? "لوگو انتخاب شده است"
      : "لوگویی انتخاب نشده";
  }, [settings.company.logoUrl]);

  const showMessage = (text) => {
    setMessage(text);

    window.clearTimeout(window.__invoiceMessageTimer);

    window.__invoiceMessageTimer = window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  const updateCompany = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [key]: value,
      },
    }));
  };

  const updateInvoice = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        [key]: value,
      },
    }));
  };

  const updateTax = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      tax: {
        ...prev.tax,
        [key]: value,
      },
    }));
  };

  const updateVisibility = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [key]: value,
      },
    }));
  };

  const updatePalette = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      palette: {
        ...prev.palette,
        [key]: value,
      },
    }));
  };

  const applyPalette = (key) => {
    setSettings((prev) => ({
      ...prev,
      palette: {
        ...INVOICE_PALETTES[key],
      },
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

    if (!allowed.includes(file.type)) {
      showMessage("فرمت لوگو باید PNG، JPG، WEBP یا SVG باشد.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateCompany("logoUrl", reader.result);
      showMessage("لوگو انتخاب شد.");
    };

    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const saved = saveInvoiceSettings(settings);
    setSettings(saved);
    showMessage("تنظیمات ذخیره شد.");
  };

  const handleReset = () => {
    const reset = resetInvoiceSettings();
    setSettings(reset);
    showMessage("تنظیمات به حالت پیش‌فرض برگشت.");
  };

  const handleSamplePdf = async () => {
    if (!previewRef.current) return;

    let wrapper = null;
    let style = null;

    try {
      showMessage("در حال آماده‌سازی PDF...");

      const source = previewRef.current;
      const invoiceCard = source.closest(".invoice-preview-card");

      wrapper = document.createElement("div");
      wrapper.className = "invoice-pdf-wrapper";

      const clonedCard = invoiceCard
        ? invoiceCard.cloneNode(true)
        : source.cloneNode(true);

      clonedCard.classList.add("invoice-pdf-card");

      const clonedPaper = clonedCard.querySelector(".invoice-preview-paper");

      if (clonedPaper) {
        clonedPaper.classList.add("invoice-pdf-paper");
      }

      style = document.createElement("style");
      style.setAttribute("data-invoice-pdf-style", "true");

      style.innerHTML = `
        .invoice-pdf-wrapper {
          position: fixed;
          left: -100000px;
          top: 0;
          width: 148mm;
          height: 210mm;
          background: #ffffff;
          padding: 0;
          margin: 0;
          overflow: hidden;
          z-index: -1;
          direction: rtl;
          font-family: Vazirmatn, sans-serif;
        }

        .invoice-pdf-wrapper * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .invoice-pdf-card {
          width: 148mm !important;
          height: 210mm !important;
          max-width: none !important;
          min-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
          display: block !important;
          overflow: hidden !important;
        }

        .invoice-pdf-paper {
          width: 148mm !important;
          height: 210mm !important;
          max-width: none !important;
          min-height: 0 !important;
          padding: 7mm !important;
          margin: 0 !important;
          background: #ffffff !important;
          border: none !important;
          box-shadow: none !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .invoice-pdf-paper .invoice-preview-header {
          height: 39mm !important;
          min-height: 39mm !important;
          padding: 8mm !important;
          display: grid !important;
          grid-template-columns: 1fr 18mm 1fr !important;
          align-items: center !important;
          gap: 5mm !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-brand strong {
          font-size: 16pt !important;
          line-height: 1.35 !important;
        }

        .invoice-pdf-paper .invoice-preview-brand span {
          font-size: 7.8pt !important;
          line-height: 1.5 !important;
          margin-top: 1.8mm !important;
        }

        .invoice-pdf-paper .invoice-preview-logo {
          width: 17mm !important;
          height: 17mm !important;
          font-size: 7pt !important;
        }

        .invoice-pdf-paper .invoice-preview-title-box h3 {
          display: none !important;
        }

        .invoice-pdf-paper .invoice-preview-title-box p {
          font-size: 7.5pt !important;
          line-height: 1.5 !important;
          margin: 0.9mm 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-contact {
          min-height: 12mm !important;
          margin-top: 5mm !important;
          padding: 3mm 3.5mm !important;
          gap: 2mm 5mm !important;
          font-size: 7.2pt !important;
          line-height: 1.55 !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-buyer {
          min-height: 18mm !important;
          margin-top: 5mm !important;
          padding: 3.5mm !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-buyer h4 {
          margin: 0 0 2.5mm !important;
          font-size: 9.2pt !important;
        }

        .invoice-pdf-paper .invoice-preview-buyer div {
          gap: 2.5mm 7mm !important;
          font-size: 7.5pt !important;
          line-height: 1.55 !important;
        }

        .invoice-pdf-paper .invoice-preview-table {
          margin-top: 5mm !important;
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-table th {
          padding: 3mm 1mm !important;
          font-size: 7.3pt !important;
        }

        .invoice-pdf-paper .invoice-preview-table td {
          padding: 3.2mm 1mm !important;
          font-size: 7.3pt !important;
          line-height: 1.55 !important;
        }

        .invoice-pdf-paper .invoice-preview-desc strong {
          font-size: 7.5pt !important;
        }

        .invoice-pdf-paper .invoice-preview-desc small {
          margin-top: 0.8mm !important;
          font-size: 6.5pt !important;
        }

        .invoice-pdf-paper .invoice-preview-bottom {
          margin-top: 5mm !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 47mm !important;
          gap: 5mm !important;
          align-items: start !important;
          direction: rtl !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-note {
          grid-column: 1 !important;
          font-size: 7.2pt !important;
          line-height: 1.65 !important;
          min-height: 20mm !important;
        }

        .invoice-pdf-paper .invoice-preview-note strong {
          margin-bottom: 1.8mm !important;
          font-size: 7.7pt !important;
        }

        .invoice-pdf-paper .invoice-preview-summary {
          grid-column: 2 !important;
        }

        .invoice-pdf-paper .invoice-preview-summary div {
          gap: 3mm !important;
          padding: 2.8mm !important;
          font-size: 7.2pt !important;
          line-height: 1.45 !important;
        }

        .invoice-pdf-paper .invoice-preview-validity {
          margin-top: 5mm !important;
          font-size: 7.5pt !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-signatures {
          margin-top: auto !important;
          padding-top: 8mm !important;
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 9mm !important;
          flex-shrink: 0 !important;
        }

        .invoice-pdf-paper .invoice-preview-signatures div {
          padding-top: 2.5mm !important;
          font-size: 7.2pt !important;
          min-height: 13mm !important;
        }

        .invoice-pdf-paper .invoice-preview-footer {
          margin-top: 5mm !important;
          padding-top: 3.5mm !important;
          font-size: 6.7pt !important;
          line-height: 1.65 !important;
          flex-shrink: 0 !important;
        }
      `;

      document.head.appendChild(style);
      wrapper.appendChild(clonedCard);
      document.body.appendChild(wrapper);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(wrapper, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
        windowWidth: wrapper.offsetWidth,
        windowHeight: wrapper.offsetHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
        compress: true,
      });

      pdf.addImage(imageData, "PNG", 0, 0, 148, 210);
      pdf.save("invoice-sample.pdf");

      showMessage("PDF فاکتور آماده شد.");
    } catch (error) {
      console.error(error);
      showMessage("خطا در ساخت PDF فاکتور.");
    } finally {
      if (wrapper && document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }

      if (style && document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }
  };

  return (
    <div className="invoice-settings">
      <div className="invoice-settings__header">
        <div>
          <h2>تنظیمات فاکتور</h2>

          <p>
            شخصی‌سازی نام شرکت، لوگو، رنگ‌ها، اطلاعات قابل نمایش و مالیات
            پیش‌فرض فاکتور
          </p>
        </div>
      </div>

      {message && <div className="invoice-settings__message">{message}</div>}

      <div className="invoice-settings__layout">
        <div className="invoice-settings__preview">
          <div className="invoice-preview-title">پیش‌نمایش زنده</div>

          <InvoicePreview settings={settings} previewRef={previewRef} />
        </div>

        <aside className="invoice-settings__options">
          <div className="invoice-options-scroll">
            <AccordionSection title="اطلاعات شرکت" defaultOpen>
              <label className="invoice-field">
                <span>نام شرکت / فروشگاه</span>

                <input
                  value={settings.company.name}
                  onChange={(e) => updateCompany("name", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>شعار یا توضیح کوتاه</span>

                <input
                  value={settings.company.tagline}
                  onChange={(e) => updateCompany("tagline", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>آدرس</span>

                <textarea
                  rows={3}
                  value={settings.company.address}
                  onChange={(e) => updateCompany("address", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>شماره تماس‌ها</span>

                <input
                  value={settings.company.phones}
                  onChange={(e) => updateCompany("phones", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>وب‌سایت</span>

                <input
                  value={settings.company.website}
                  onChange={(e) => updateCompany("website", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>ایمیل</span>

                <input
                  value={settings.company.email}
                  onChange={(e) => updateCompany("email", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>کد اقتصادی</span>

                <input
                  value={settings.company.economicCode}
                  onChange={(e) =>
                    updateCompany("economicCode", e.target.value)
                  }
                />
              </label>
            </AccordionSection>

            <AccordionSection title="لوگو">
              <div className="invoice-logo-tools">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                >
                  انتخاب لوگو
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() => updateCompany("logoUrl", "")}
                >
                  حذف لوگو
                </button>

                <input
                  ref={logoInputRef}
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                />
              </div>

              <p className="invoice-help-text">
                {logoText} — پیشنهاد: PNG شفاف، حداقل ۲۰۰×۲۰۰ پیکسل.
              </p>
            </AccordionSection>

            <AccordionSection title="پالت رنگی">
              <div className="invoice-palette-presets">
                {Object.entries(INVOICE_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPalette(key)}
                  >
                    <span
                      style={{
                        background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
                      }}
                    />

                    {palette.name}
                  </button>
                ))}
              </div>

              <div className="invoice-color-list">
                {COLOR_FIELDS.map((field) => {
                  const value = settings.palette[field.key] || "#000000";

                  return (
                    <label key={field.key} className="invoice-color-row">
                      <span>{field.label}</span>

                      <div>
                        <input
                          type="color"
                          value={safeColor(value, "#000000")}
                          onChange={(e) =>
                            updatePalette(field.key, e.target.value)
                          }
                        />

                        <input
                          value={value}
                          dir="ltr"
                          onChange={(e) =>
                            updatePalette(field.key, e.target.value)
                          }
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </AccordionSection>

            <AccordionSection title="اطلاعات قابل نمایش">
              <div className="invoice-check-list">
                {VISIBILITY_FIELDS.map((field) => (
                  <label key={field.key}>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.visibility[field.key])}
                      onChange={(e) =>
                        updateVisibility(field.key, e.target.checked)
                      }
                    />

                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="مالیات">
              <label className="invoice-check-line">
                <input
                  type="checkbox"
                  checked={Boolean(settings.tax.enabledByDefault)}
                  onChange={(e) =>
                    updateTax("enabledByDefault", e.target.checked)
                  }
                />

                <span>فعال بودن مالیات به‌صورت پیش‌فرض</span>
              </label>

              <label className="invoice-field">
                <span>نرخ مالیات (%)</span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.tax.defaultRate}
                  onChange={(e) => updateTax("defaultRate", e.target.value)}
                />
              </label>
            </AccordionSection>

            <AccordionSection title="تنظیمات فاکتور">
              <label className="invoice-field">
                <span>عنوان فاکتور</span>

                <input
                  value={settings.invoice.title}
                  onChange={(e) => updateInvoice("title", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>متن توضیحات</span>

                <textarea
                  rows={4}
                  value={settings.invoice.note}
                  onChange={(e) => updateInvoice("note", e.target.value)}
                />
              </label>

              <label className="invoice-field">
                <span>متن اعتبار فاکتور</span>

                <input
                  value={settings.invoice.validityText}
                  onChange={(e) =>
                    updateInvoice("validityText", e.target.value)
                  }
                />
              </label>

              <label className="invoice-field">
                <span>متن پاورقی</span>

                <textarea
                  rows={5}
                  value={settings.invoice.footerText}
                  onChange={(e) =>
                    updateInvoice("footerText", e.target.value)
                  }
                />
              </label>
            </AccordionSection>

            <AccordionSection title="عملیات" defaultOpen>
              <div className="invoice-actions-final">
                <button type="button" className="primary" onClick={handleSave}>
                  ذخیره تنظیمات
                </button>

                <button type="button" onClick={handleSamplePdf}>
                  نمونه PDF خروجی
                </button>

                <button type="button" onClick={handleReset}>
                  بازنشانی
                </button>
              </div>
            </AccordionSection>
          </div>
        </aside>
      </div>
    </div>
  );
}