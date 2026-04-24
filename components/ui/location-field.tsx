"use client";

import { useMemo, useState } from "react";
import {
  formatLocationString,
  LOCATION_DATA,
  parseLocationString,
} from "@/lib/location-data";
import { pickText } from "@/lib/i18n";
import type { UILanguage } from "@/lib/types";

function normalizeCountryName(country: string) {
  const trimmed = country.trim();
  if (!trimmed) return "";
  const match = LOCATION_DATA.find(
    (item) =>
      item.name.toLowerCase() === trimmed.toLowerCase() ||
      item.code.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.name ?? trimmed;
}

export function LocationField({
  name,
  label,
  defaultValue,
  uiLanguage,
  helperText,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  uiLanguage: UILanguage;
  helperText?: string;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const initial = useMemo(() => parseLocationString(defaultValue ?? ""), [defaultValue]);
  const [country, setCountry] = useState(normalizeCountryName(initial.country));
  const [region, setRegion] = useState(initial.region);
  const [city, setCity] = useState(initial.city);

  const countryConfig = useMemo(
    () => LOCATION_DATA.find((item) => item.name === country || item.code === country),
    [country],
  );

  const regionOptions = countryConfig?.regions ?? [];
  const citySuggestions =
    regionOptions.find((item) => item.name === region || item.code === region)?.cities ?? [];
  const hiddenLocation = formatLocationString({ country, region, city });

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-200">{label}</span>
      <input name={name} type="hidden" value={hiddenLocation} />
      <div className="grid gap-2 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">{t("Country", "国家/地区")}</span>
          <select
            className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            onChange={(event) => {
              setCountry(event.target.value);
              setRegion("");
              setCity("");
            }}
            value={country}
          >
            <option value="">{t("Select country", "选择国家/地区")}</option>
            {country && !LOCATION_DATA.some((item) => item.name === country) ? (
              <option value={country}>{country}</option>
            ) : null}
            {LOCATION_DATA.map((item) => (
              <option key={item.code} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {regionOptions.length > 0 ? (
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">
              {country === "China" ? t("Province", "省份") : t("State / Region", "州 / 省 / 区域")}
            </span>
            <select
              className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              onChange={(event) => {
                setRegion(event.target.value);
                setCity("");
              }}
              value={region}
            >
              <option value="">{t("Select region", "选择区域")}</option>
              {regionOptions.map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
              {region && !regionOptions.some((item) => item.name === region) ? (
                <option value={region}>{region}</option>
              ) : null}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">
              {country === "China" ? t("Province", "省份") : t("State / Region", "州 / 省 / 区域")}
            </span>
            <input
              className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              onChange={(event) => setRegion(event.target.value)}
              placeholder={t("Type region", "输入区域")}
              type="text"
              value={region}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">{t("City", "城市")}</span>
          <input
            className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            list={`${name}_city_options`}
            onChange={(event) => setCity(event.target.value)}
            placeholder={t("Type city", "输入城市")}
            type="text"
            value={city}
          />
          <datalist id={`${name}_city_options`}>
            {citySuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
      </div>
      {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : null}
    </div>
  );
}
