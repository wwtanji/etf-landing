"use client";

import { useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  AMOUNT_CHIPS_CZK,
  AMOUNT_MAX_CZK,
  AMOUNT_MIN_CZK,
  DEFAULT_AMOUNT_CZK,
  DEFAULT_YEARS,
  YEARS_CHIPS,
  isValidAmount,
  totalFeeCzk,
} from "@/lib/fees";
import { formatCzk, formatInteger, formatTer } from "@/lib/format";
import { GROUP_LABELS, groupEtfs, type EtfGroupSection } from "@/lib/labels";
import type { UsEtfView } from "@/lib/landing-data";
import { useUnlocked } from "@/lib/ui-store";
import { useLanding, twinsOf } from "@/components/landing-provider";
import { ScrollLink } from "@/components/scroll-cta";
import { SECTION_IDS } from "@/lib/sections";
import { SectionLabel } from "@/components/section-label";

const CALC_RESULT_DELAY_MS = 1000;
const CALC_RESULT_MAX_EVENTS = 10;
const AMOUNT_MAX_DIGITS = 12;

type CalcControl = "amount_chip" | "amount_input" | "years" | "etf_a" | "etf_b";
type CalcState = { amount: number; years: number; etfA: string; etfB: string };

export function Calculator() {
  const { etfs, ucitsByIsin, etfByTicker, etfA, etfB, setEtfA, setEtfB } = useLanding();
  const unlocked = useUnlocked();
  const amountId = useId();
  const etfAId = useId();
  const etfBId = useId();

  const [amount, setAmount] = useState(DEFAULT_AMOUNT_CZK);
  const [amountText, setAmountText] = useState(formatInteger(DEFAULT_AMOUNT_CZK));
  const [amountError, setAmountError] = useState(false);
  const [years, setYears] = useState(DEFAULT_YEARS);

  const interacted = useRef(new Set<CalcControl>());
  const resultTimer = useRef<number | undefined>(undefined);
  const resultEvents = useRef(0);

  useEffect(() => () => window.clearTimeout(resultTimer.current), []);

  function markInteract(control: CalcControl) {
    if (interacted.current.has(control)) return;
    interacted.current.add(control);
    track("calc_interact", { control });
  }

  function scheduleResult(next: CalcState) {
    window.clearTimeout(resultTimer.current);
    resultTimer.current = window.setTimeout(() => {
      if (resultEvents.current >= CALC_RESULT_MAX_EVENTS) return;
      const a = etfByTicker.get(next.etfA);
      const b = etfByTicker.get(next.etfB);
      if (!a || !b) return;
      resultEvents.current += 1;
      const diff = Math.abs(
        totalFeeCzk(next.amount, a.ter_pct, next.years) -
          totalFeeCzk(next.amount, b.ter_pct, next.years),
      );
      track("calc_result", {
        amount_czk: next.amount,
        years: next.years,
        etf_a: next.etfA,
        etf_b: next.etfB,
        fee_diff_czk: Math.round(diff),
      });
    }, CALC_RESULT_DELAY_MS);
  }

  const current: CalcState = { amount, years, etfA, etfB };

  function applyAmount(value: number, control: "amount_chip" | "amount_input") {
    markInteract(control);
    if (!isValidAmount(value)) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    if (value !== amount) {
      setAmount(value);
      scheduleResult({ ...current, amount: value });
    }
  }

  const a = etfByTicker.get(etfA);
  const b = etfByTicker.get(etfB);
  if (!a || !b) throw new Error(`Calculator: unknown ticker ${etfA}/${etfB}`);
  const feeA = totalFeeCzk(amount, a.ter_pct, years);
  const feeB = totalFeeCzk(amount, b.ter_pct, years);
  const diff = Math.round(Math.abs(feeA - feeB));
  const twins = twinsOf([etfA, etfB], etfByTicker, ucitsByIsin);
  const groups = groupEtfs(etfs);
  const cheaper = feeA === feeB ? null : feeA < feeB ? "a" : "b";

  return (
    <section
      id={SECTION_IDS.calc}
      data-testid="calc"
      data-section="calc"
      className="scroll-mt-4 px-5 pt-10 pb-12"
    >
      <div className="mx-auto max-w-xl">
        <SectionLabel index="01">Kalkulačka poplatků</SectionLabel>
        <h2 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight">
          Kolik vás stojí roční poplatek?
        </h2>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor={amountId} className="field-label">
              Investovaná částka
            </label>
            <div className="amount-field">
              <input
                id={amountId}
                data-testid="calc-amount-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amountText}
                aria-invalid={amountError}
                aria-describedby={amountError ? `${amountId}-error` : undefined}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, AMOUNT_MAX_DIGITS);
                  const value = digits === "" ? Number.NaN : Number(digits);
                  setAmountText(digits === "" ? "" : formatInteger(value));
                  applyAmount(value, "amount_input");
                }}
              />
              <span aria-hidden="true">Kč</span>
            </div>
            {amountError && (
              <p
                id={`${amountId}-error`}
                data-testid="calc-amount-error"
                role="alert"
                className="mt-2 text-sm font-medium text-stamp"
              >
                Zadejte částku {formatInteger(AMOUNT_MIN_CZK)} – {formatInteger(AMOUNT_MAX_CZK)} Kč
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Rychlá volba částky">
              {AMOUNT_CHIPS_CZK.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  data-testid={`calc-amount-chip-${chip}`}
                  className="chip"
                  aria-pressed={!amountError && amount === chip}
                  onClick={() => {
                    setAmountText(formatInteger(chip));
                    applyAmount(chip, "amount_chip");
                  }}
                >
                  {formatCzk(chip)}
                </button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="field-label">Jak dlouho</legend>
            <div className="grid grid-cols-4 gap-2">
              {YEARS_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  data-testid={`calc-years-chip-${chip}`}
                  className="chip"
                  aria-pressed={years === chip}
                  onClick={() => {
                    markInteract("years");
                    if (chip === years) return;
                    setYears(chip);
                    scheduleResult({ ...current, years: chip });
                  }}
                >
                  {chip} let
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <EtfSelect
              id={etfAId}
              label="ETF A"
              testId="calc-etf-a"
              value={etfA}
              groups={groups}
              onChange={(ticker) => {
                markInteract("etf_a");
                setEtfA(ticker);
                scheduleResult({ ...current, etfA: ticker });
              }}
            />
            <EtfSelect
              id={etfBId}
              label="ETF B"
              testId="calc-etf-b"
              value={etfB}
              groups={groups}
              onChange={(ticker) => {
                markInteract("etf_b");
                setEtfB(ticker);
                scheduleResult({ ...current, etfB: ticker });
              }}
            />
          </div>
          {a.group !== b.group && (
            <p data-testid="calc-group-hint" className="hint">
              Férové srovnání je mezi ETF se stejným indexem.
            </p>
          )}
        </div>

        <div data-testid="calc-result" className="receipt mt-7">
          <div className="receipt-head">
            <span>Náklady (TER)</span>
            <span>
              {formatCzk(amount)} · {years} let
            </span>
          </div>
          <FeeRow testId="calc-fee-a" etf={a} fee={feeA} cheaper={cheaper === "a"} />
          <FeeRow testId="calc-fee-b" etf={b} fee={feeB} cheaper={cheaper === "b"} />
          <p data-testid="calc-diff" className="receipt-total" aria-live="polite">
            <span className="receipt-total-label">Rozdíl za {years} let:</span>{" "}
            <span className="receipt-total-value">{formatCzk(diff)}</span>
          </p>
          <div data-testid="calc-unlock" className="receipt-unlock">
            {twins.length === 0 ? (
              <p>Pro tento index nemáme v přehledu evropský protějšek.</p>
            ) : unlocked ? (
              <>
                <p className="font-semibold">Evropský protějšek se stejným indexem:</p>
                <ul className="mt-1.5 space-y-1">
                  {twins.map((twin) => (
                    <li key={twin.isin} className="flex justify-between gap-3">
                      <span className="font-semibold">{twin.ticker}</span>
                      <span>TER {formatTer(twin.ter_pct)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p>
                  Evropský protějšek se stejným indexem:{" "}
                  <span aria-hidden="true">🔒</span> ISIN a TER po odemčení
                </p>
                <ScrollLink
                  target={SECTION_IDS.form}
                  location="calc_unlock"
                  testId="calc-unlock-cta"
                  className="btn btn-ink mt-3 w-full"
                >
                  Odemknout zdarma
                </ScrollLink>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
          Výpočet: poplatek = částka × (1 − (1 − TER)^roky). Bez zhodnocení, poplatků brokera, daní
          a kurzových rozdílů. Ilustrace nákladů, ne předpověď výnosu. TER a zdroje u každého ETF
          najdete ve <a href={`#${SECTION_IDS.table}`} className="link">srovnání níže</a>.
        </p>
      </div>
    </section>
  );
}

function FeeRow({
  testId,
  etf,
  fee,
  cheaper,
}: {
  testId: string;
  etf: UsEtfView;
  fee: number;
  cheaper: boolean;
}) {
  return (
    <p data-testid={testId} className="receipt-row" data-cheaper={cheaper || undefined}>
      <span className="receipt-ticker">{etf.ticker}</span>
      <span className="receipt-ter"> · {formatTer(etf.ter_pct)} · </span>
      <span className="receipt-leader" aria-hidden="true" />
      <span className="receipt-fee">{formatCzk(fee)}</span>
    </p>
  );
}

function EtfSelect({
  id,
  label,
  testId,
  value,
  groups,
  onChange,
}: {
  id: string;
  label: string;
  testId: string;
  value: string;
  groups: EtfGroupSection[];
  onChange: (ticker: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        data-testid={testId}
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {groups.map(({ group, etfs }) => (
          <optgroup key={group} label={GROUP_LABELS[group]}>
            {etfs.map((etf) => (
              <option key={etf.ticker} value={etf.ticker}>
                {etf.ticker} · {formatTer(etf.ter_pct)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
