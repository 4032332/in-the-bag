import { AsyncJob, FlightLookupInput } from '../_shared/types.ts';
import { markJobProcessing, markJobCompleted, markJobFailed } from '../_shared/job-utils.ts';
import { generateContentGrounded } from '../_shared/gemini.ts';

export async function handleJob(job: AsyncJob) {
  try {
    await markJobProcessing(job.id);
    const input = job.input as FlightLookupInput;

    const prompt = `Look up the details for flight ${input.flight_number} on ${input.flight_date}.
Return a JSON object with these fields (use null for any field you cannot confirm):
airline, origin_airport (IATA code), destination_airport (IATA code),
scheduled_departure (ISO 8601 datetime with timezone), scheduled_arrival (ISO 8601 datetime with timezone),
terminal, gate.
Return only the JSON object, no explanation.`;

    const { text } = await generateContentGrounded('gemini-2.5-pro', [{ parts: [{ text: prompt }] }]);
    
    let parsedFlightDetails: any;
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedFlightDetails = JSON.parse(cleanText);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    const {
      airline,
      origin_airport,
      destination_airport,
      scheduled_departure,
      scheduled_arrival
    } = parsedFlightDetails;

    if (!airline || !origin_airport || !destination_airport || !scheduled_departure || !scheduled_arrival) {
      await markJobFailed(job.id, 'Insufficient flight data returned');
      return;
    }

    await markJobCompleted(job.id, parsedFlightDetails);

  } catch (err: any) {
    await markJobFailed(job.id, err.message);
  }
}
