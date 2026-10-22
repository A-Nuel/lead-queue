# Release checklist

- [ ] GitHub Actions CI green on the latest PR head SHA.
- [ ] Unit tests and compileall pass.
- [ ] Smoke-test all dashboard tabs locally.
- [ ] Test provider failure, quota exhaustion, invalid JSON and no-key fallback.
- [ ] Confirm no paid provider is called unless its key and provider order are configured.
- [ ] Verify OpenStreetMap attribution and rate limits; improve caching before repeated searches.
- [ ] Verify website inspector rejects private IPs, unusual ports, unsafe redirects and oversized responses.
- [ ] Audit 20 leads manually against source websites and contact details.
- [ ] Check UI at 375/768/1440 px and keyboard accessibility.
- [ ] Set durable persistent storage before deploying SQLite to ephemeral hosting.
- [ ] Add authentication before public deployment.
- [ ] Set provider spending limits where supported.
- [ ] Document source timestamp and uncertainty for each lead.
