export function toPersianDigits(value) {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const english = String(value)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/,/g, "")
    .trim();

  const number = Number(english);
  return Number.isFinite(number) ? number : 0;
}

export function formatMoney(value, currencyLabel = "تومان") {
  const number = normalizeNumber(value);
  const formatted = number.toLocaleString("en-US");

  return `${toPersianDigits(formatted)} ${currencyLabel}`;
}

export function getQuantityLabel(item) {
  const basis = item.pricingBasis || item.pricing_basis || "number";

  if (basis === "weight" || basis === "weight_kg") {
    const value =
      item.quantityWeight || item.quantity_weight || item.weight || 0;

    return `${toPersianDigits(value)} کیلوگرم`;
  }

  if (basis === "length_cm" || basis === "length") {
    const value =
      item.quantityLengthCm || item.quantity_length_cm || item.length || 0;

    return `${toPersianDigits(value)} سانتی‌متر`;
  }

  const value = item.quantityNumber || item.quantity_number || item.quantity || 1;

  return `${toPersianDigits(value)} عدد`;
}

export function getLineTotal(item) {
  const directTotal = item.lineTotal || item.line_total;

  if (directTotal) {
    return normalizeNumber(directTotal);
  }

  const unitPrice = normalizeNumber(item.unitPrice || item.unit_price || 0);
  const basis = item.pricingBasis || item.pricing_basis || "number";

  if (basis === "weight" || basis === "weight_kg") {
    return (
      unitPrice *
      normalizeNumber(item.quantityWeight || item.quantity_weight || item.weight || 0)
    );
  }

  if (basis === "length_cm" || basis === "length") {
    return (
      unitPrice *
      normalizeNumber(
        item.quantityLengthCm || item.quantity_length_cm || item.length || 0
      )
    );
  }

  return (
    unitPrice *
    normalizeNumber(item.quantityNumber || item.quantity_number || item.quantity || 1)
  );
}