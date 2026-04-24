"use client";

import { City, Country, State } from "country-state-city";
import { useMemo, useState } from "react";
import { formatLocationString, parseLocationString } from "@/lib/location-data";
import { pickText } from "@/lib/i18n";
import type { UILanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

const CUSTOM_COUNTRY = "__custom_country__";
const CUSTOM_REGION = "__custom_region__";
const MAX_CITY_SUGGESTIONS = 140;

type CountryOption = {
  isoCode: string;
  name: string;
};

function findCountryFromValue(value: string, countries: CountryOption[]) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    countries.find((country) => country.isoCode.toLowerCase() === normalized) ??
    countries.find((country) => country.name.toLowerCase() === normalized) ??
    null
  );
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function LocationField({
  name,
  label,
  defaultValue,
  uiLanguage,
  helperText,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  uiLanguage: UILanguage;
  helperText?: string;
  className?: string;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const countries = useMemo(
    () => sortByName(Country.getAllCountries().map((item) => ({ isoCode: item.isoCode, name: item.name }))),
    [],
  );
  const parsedDefault = useMemo(() => parseLocationString(defaultValue ?? ""), [defaultValue]);
  const initialCountry = useMemo(
    () => findCountryFromValue(parsedDefault.country, countries),
    [countries, parsedDefault.country],
  );

  const [countryValue, setCountryValue] = useState<string>(() =>
    parsedDefault.country && !initialCountry ? CUSTOM_COUNTRY : (initialCountry?.isoCode ?? ""),
  );
  const [customCountry, setCustomCountry] = useState<string>(() =>
    parsedDefault.country && !initialCountry ? parsedDefault.country : "",
  );

  const countryCode = countryValue === CUSTOM_COUNTRY ? "" : countryValue;
  const regionOptions = useMemo(
    () => (countryCode ? sortByName(State.getStatesOfCountry(countryCode)) : []),
    [countryCode],
  );
  const initialRegion = useMemo(() => {
    const normalized = parsedDefault.region.trim().toLowerCase();
    if (!normalized || regionOptions.length === 0) {
      return null;
    }
    return (
      regionOptions.find((item) => item.isoCode.toLowerCase() === normalized) ??
      regionOptions.find((item) => item.name.toLowerCase() === normalized) ??
      null
    );
  }, [parsedDefault.region, regionOptions]);

  const [regionValue, setRegionValue] = useState<string>(() =>
    parsedDefault.region && !initialRegion ? CUSTOM_REGION : (initialRegion?.isoCode ?? ""),
  );
  const [customRegion, setCustomRegion] = useState<string>(() =>
    parsedDefault.region && !initialRegion ? parsedDefault.region : "",
  );
  const [city, setCity] = useState<string>(parsedDefault.city);

  const selectedCountry = countries.find((item) => item.isoCode === countryCode) ?? null;
  const selectedRegion =
    regionValue && regionValue !== CUSTOM_REGION
      ? regionOptions.find((item) => item.isoCode === regionValue) ?? null
      : null;

  const citySuggestions = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    const cities =
      selectedRegion && selectedRegion.isoCode
        ? (City.getCitiesOfState(selectedCountry.isoCode, selectedRegion.isoCode) ?? [])
        : (City.getCitiesOfCountry(selectedCountry.isoCode) ?? []);

    return sortByName(cities)
      .map((item) => item.name.trim())
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, MAX_CITY_SUGGESTIONS);
  }, [selectedCountry, selectedRegion]);

  const finalCountry = countryValue === CUSTOM_COUNTRY ? customCountry : (selectedCountry?.name ?? "");
  const finalRegion =
    regionValue === CUSTOM_REGION ? customRegion : (selectedRegion?.name ?? "");
  const hiddenLocation = formatLocationString({
    country: finalCountry,
    region: finalRegion,
    city,
  });

  const fieldClass =
    "h-11 w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-500";
  const helperActionClass =
    "inline-flex h-8 items-center rounded-full border border-slate-500/55 bg-slate-900/75 px-3 text-xs font-medium text-slate-200 hover:border-cyan-300/65 hover:text-cyan-100";

  return (
    <div className={cn("space-y-2", className)}>
      <span className="block text-sm font-medium text-slate-200">{label}</span>
      <input name={name} type="hidden" value={hiddenLocation} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">{t("Country", "国家/地区")}</span>
          <select
            className={fieldClass}
            onChange={(event) => {
              const nextCountry = event.target.value;
              setCountryValue(nextCountry);
              if (nextCountry === CUSTOM_COUNTRY) {
                setRegionValue(CUSTOM_REGION);
              } else if (!nextCountry) {
                setRegionValue("");
              } else {
                const nextRegionOptions = State.getStatesOfCountry(nextCountry);
                setRegionValue(nextRegionOptions.length > 0 ? "" : CUSTOM_REGION);
              }
              setCustomRegion("");
              setCity("");
              if (nextCountry !== CUSTOM_COUNTRY) {
                setCustomCountry("");
              }
            }}
            value={countryValue}
          >
            <option value="">{t("Select country", "选择国家/地区")}</option>
            {countries.map((country) => (
              <option key={country.isoCode} value={country.isoCode}>
                {country.name}
              </option>
            ))}
            <option value={CUSTOM_COUNTRY}>{t("Other (type manually)", "其他（手动输入）")}</option>
          </select>
        </label>

        {countryValue === CUSTOM_COUNTRY ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">{t("Custom country", "自定义国家/地区")}</span>
              <input
                className={fieldClass}
                onChange={(event) => setCustomCountry(event.target.value)}
                placeholder={t("Type country/region", "请输入国家/地区")}
                type="text"
                value={customCountry}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">{t("State / Province", "州 / 省")}</span>
              <input
                className={fieldClass}
                onChange={(event) => {
                  setRegionValue(CUSTOM_REGION);
                  setCustomRegion(event.target.value);
                }}
                placeholder={t("Type region/state/province", "输入州/省/区域")}
                type="text"
                value={customRegion}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">{t("City", "城市")}</span>
              <input
                className={fieldClass}
                onChange={(event) => setCity(event.target.value)}
                placeholder={t("Type city", "输入城市")}
                type="text"
                value={city}
              />
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">
                {selectedCountry?.isoCode === "CN" ? t("Province", "省份") : t("State / Province", "州 / 省")}
              </span>
              {regionOptions.length > 0 && regionValue !== CUSTOM_REGION ? (
                <select
                  className={fieldClass}
                  onChange={(event) => {
                    setRegionValue(event.target.value);
                    setCustomRegion("");
                    setCity("");
                  }}
                  value={regionValue}
                >
                  <option value="">{t("Select region", "选择区域")}</option>
                  {regionOptions.map((region) => (
                    <option key={region.isoCode} value={region.isoCode}>
                      {region.name}
                    </option>
                  ))}
                  <option value={CUSTOM_REGION}>{t("Not listed (type manually)", "没有找到（手动输入）")}</option>
                </select>
              ) : (
                <>
                  <input
                    className={fieldClass}
                    onChange={(event) => setCustomRegion(event.target.value)}
                    placeholder={t("Type region/state/province", "输入州/省/区域")}
                    type="text"
                    value={customRegion}
                  />
                  {regionOptions.length > 0 ? (
                    <button
                      className={cn(helperActionClass, "mt-2")}
                      onClick={() => {
                        setRegionValue("");
                        setCustomRegion("");
                      }}
                      type="button"
                    >
                      {t("Choose from list", "改为列表选择")}
                    </button>
                  ) : null}
                </>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">{t("City", "城市")}</span>
              <input
                className={fieldClass}
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
          </>
        )}
      </div>

      {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : null}
    </div>
  );
}
