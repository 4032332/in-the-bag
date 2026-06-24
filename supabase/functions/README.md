# Local Testing Setup for Edge Functions

## Commands

```bash
# Start local Supabase
supabase start

# Serve all functions locally
supabase functions serve --env-file supabase/functions/.env.local

# Test dispatcher with a pending job (replace JOB_ID)
curl -i --location --request POST 'http://localhost:54321/functions/v1/dispatcher' \
  --header 'Authorization: Bearer <anon key>' \
  --header 'Content-Type: application/json' \
  --data '{"jobId":"<JOB_ID>"}'

# Test vision-scan directly
curl -i --location --request POST 'http://localhost:54321/functions/v1/vision-scan' \
  --header 'Authorization: Bearer <anon key>' \
  --header 'Content-Type: application/json' \
  --data '{"image_base64":"<base64 string>","mime_type":"image/jpeg","document_type":"boarding_pass"}'
```
