import papi from 'papi-backend';
import type { ExecutionActivationContext } from 'extension-host/extension-types/extension-activation-context.model';
import type { SavedWebViewDefinition, WebViewDefinition } from 'shared/data/web-view.model';
import type { IWebViewProvider } from 'shared/models/web-view-provider.model';
import wordListReact from './word-list.web-view?inline';
import wordListReactStyles from './word-list.web-view.scss?inline';

const wordListWebViewType = 'paranextExtensionWordList.react';

const wordListWebViewProvider: IWebViewProvider = {
  async getWebView(savedWebView: SavedWebViewDefinition): Promise<WebViewDefinition | undefined> {
    if (savedWebView.webViewType !== wordListWebViewType)
      throw new Error(
        `${wordListWebViewType} provider received request to provide a ${savedWebView.webViewType} web view`,
      );
    return {
      ...savedWebView,
      title: 'Word List',
      content: wordListReact,
      styles: wordListReactStyles,
    };
  },
};

const { logger } = papi;

export async function activate(context: ExecutionActivationContext) {
  logger.info('Word List extension is activating!');

  const reactWebViewProviderPromise = papi.webViewProviders.register(
    wordListWebViewType,
    wordListWebViewProvider,
  );

  papi.webViews.getWebView(
    wordListWebViewType,
    { type: 'float', floatSize: { width: 770, height: 815 } },
    { existingId: '?' },
  );

  context.registrations.add(await reactWebViewProviderPromise);

  logger.info('Word List extension is finished activating!');
}

export async function deactivate() {
  logger.info('Word List extension is deactivating!');
  return true;
}
