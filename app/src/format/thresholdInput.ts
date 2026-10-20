// Leest wat de gebruiker invult bij een drempel en maakt er een Threshold van voor
// UpdateThreshold. De Pi controleert ook, maar zo krijgt de gebruiker meteen een duidelijke
// melding. Pure functies, zonder Lynx of netwerk.
import { create } from '@bufbuild/protobuf';

import {
  ThresholdSchema,
  type Threshold,
} from '../generated/restwell/v1/restwell_pb.js';

export type ThresholdInput = {
  min: string;
  max: string;
  durationSec: string;
};

export type ParseResult =
  { ok: true; threshold: Threshold } | { ok: false; error: string };

// Leeg = geen grens. Een komma mag ook als decimaalteken (Nederlands toetsenbord).
function parseOptionalNumber(text: string): number | undefined | 'invalid' {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : 'invalid';
}

export function formatInputNumber(value?: number): string {
  return value === undefined ? '' : String(value).replace('.', ',');
}

export function toThresholdInput(threshold: Threshold): ThresholdInput {
  return {
    min: formatInputNumber(threshold.minValue),
    max: formatInputNumber(threshold.maxValue),
    durationSec: formatInputNumber(threshold.maxDurationSec),
  };
}

/** Een volledige nieuwe drempel: een leeg veld betekent "geen grens", niet "ongewijzigd". */
export function parseThresholdInput(
  current: Threshold,
  input: ThresholdInput,
): ParseResult {
  const min = parseOptionalNumber(input.min);
  const max = parseOptionalNumber(input.max);
  const duration = parseOptionalNumber(input.durationSec);

  if (min === 'invalid') return { ok: false, error: 'Minimum is geen getal' };
  if (max === 'invalid') return { ok: false, error: 'Maximum is geen getal' };
  if (duration === 'invalid') return { ok: false, error: 'Duur is geen getal' };
  if (min === undefined && max === undefined) {
    return { ok: false, error: 'Vul een minimum of een maximum in' };
  }
  if (min !== undefined && max !== undefined && min > max) {
    return {
      ok: false,
      error: 'Het minimum mag niet boven het maximum liggen',
    };
  }
  if (duration !== undefined && (duration < 0 || !Number.isInteger(duration))) {
    return {
      ok: false,
      error: 'Duur is een geheel aantal seconden (0 of meer)',
    };
  }

  return {
    ok: true,
    threshold: create(ThresholdSchema, {
      roomId: current.roomId,
      metric: current.metric,
      minValue: min,
      maxValue: max,
      maxDurationSec: duration,
    }),
  };
}
