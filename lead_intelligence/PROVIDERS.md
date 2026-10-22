# AI provider configuration

The Streamlit UI defaults to **auto**, attempting configured providers in the order of `LLM_PROVIDER_ORDER`, then returning a transparent local-rules result when none work. The default order is Z.ai, OpenRouter, NVIDIA.

- Z.ai: GLM Flash API, verify free quotas and model availability in your account.
- OpenRouter: `openrouter/free` routes to currently available free models, subject to limits.
- NVIDIA: NIM developer endpoints offer prototyping access; not a blanket license for production use.
- SiliconFlow: specify the exact model ID in `SILICONFLOW_MODEL` after confirming price.
- Alibaba DashScope: specify `DASHSCOPE_MODEL` and verify regional API endpoint and quotas.
- DeepSeek: paid API by default; only opt in knowingly.
- Gemini: verify quotas and billing before opting in.

All calls use an OpenAI-compatible chat-completions payload. Some models reject temperature or other parameters; the router will try the next provider.

## No-key operation
Industry ranking, OpenStreetMap discovery, website inspection, CRM and CSV export work without an AI key. LLM analysis falls back to rule-based drafts.

## Security
Keep keys in server-side environment variables, never browser code or the repository. The app sends public website signals and business name to the chosen provider. Verify provider terms before sending personal information.

## Status
Code is committed but has not yet passed live integration tests or been deployed. Industry rankings are heuristic, not evidence of actual demand. Human review and lawful contact screening remain mandatory.
