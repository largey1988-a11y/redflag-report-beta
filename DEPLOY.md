# Deploy the private beta

## Render

1. Put the `outputs` folder in a private Git repository.
2. Create a Render Blueprint and select the repository.
3. Render reads `render.yaml` and starts `server.mjs`.
4. Add DVSA secrets in Render's environment settings after approval.
5. Share the generated HTTPS URL with private testers.

## Before sharing

- Replace seed model research with editorially validated sources.
- Add a real privacy policy and terms reviewed for the intended business.
- Add server-side analytics only after deciding what data is necessary.
- Confirm rate limits and API licence requirements before enabling DVSA.
