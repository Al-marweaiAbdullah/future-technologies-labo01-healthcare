// Past één drempel aan op de Pi. De Pi gebruikt de nieuwe drempel meteen bij de volgende meting.
import type { Threshold } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';

export async function updateThreshold(
  threshold: Threshold,
): Promise<Threshold | undefined> {
  const response = await restWell.updateThreshold({ threshold });
  return response.threshold;
}
