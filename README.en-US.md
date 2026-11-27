# OpenAI Images

Describe the image you want in a sentence to generate it, or attach a reference image to edit it. Generated images can be used directly in chat, documents, and whiteboards, and are stored according to your **Resource Storage** settings.

## Getting Started

1. Install **OpenAI Images** from the **Plugin Center**, then turn it on under the **Installed** tab on the Plugins page. No restart is required.
2. Open this plugin's **Settings**, add an account, enter the **Model URL**, **API Key**, and model name, and save.
3. Go to **Settings → Image Generation** and set this account as active to start generating images. On mobile, go to **Me → AI → Image Generation**.

In mobile chat, you can ask directly to generate images; attach a reference image to edit it, or ask for follow-up edits to an image you just generated. Generated results are saved to the upload destination configured under **Images & Attachments**.

Enter the service URL up to `/v1`, such as `https://api.openai.com/v1`. If you use another provider, enter its endpoint URL. You can add multiple accounts and switch between them at any time.

Five preset image models are provided: `gpt-image-2`, `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare`, `gpt-image-2.6-sunburst`, and `gpt-image-2.6-flare`. You can also open the model dropdown, type a model name provided by your service, press Enter or click **Use** to confirm, and save the account. Both image generation and editing use the saved model name; actual model availability depends on your provider.

## FAQ

**Getting an error when editing with a reference image?** Not all models support image editing. Switch to a model that supports editing and try again.

**Seeing an unsupported model or parameter error?** This error comes from the provider—switch to a model it supports.

**Will I still be charged after canceling?** Possibly. Canceling only stops waiting for the result; a generation already started on the provider's side may still be billed. Each generation waits up to 5 minutes.

## Notes

- Generating and editing images incurs provider fees.
- Keep your API Key safe and never include it in screenshots or bug reports.
