import papi from 'papi-backend';
import type { ExecutionActivationContext } from 'extension-host/extension-types/extension-activation-context.model';
import type {
  GetWebViewOptions,
  SavedWebViewDefinition,
  WebViewDefinition,
} from 'shared/data/web-view.model';
import type { IWebViewProvider } from 'shared/models/web-view-provider.model';
import type { ProjectMetadata } from 'shared/models/project-metadata.model';
import type IDataProviderEngine from 'shared/models/data-provider-engine.model';
import type { WithNotifyUpdate } from 'shared/models/data-provider-engine.model';
import type {
  WordListDataMethods,
  WordListDataTypes,
  WordListEntry,
} from 'paranext-extension-word-list';
import wordListReact from './word-list.web-view?inline';
import wordListReactStyles from './word-list.web-view.scss?inline';

const { logger } = papi;

const wordListDataProviderEngine: IDataProviderEngine<WordListDataTypes> &
  WithNotifyUpdate<WordListDataTypes> &
  WordListDataMethods & {
    wordList: WordListEntry[];
  } = {
  wordList: [
    {
      word: 'hoi',
      scriptureSnippets: ['hallo hoi hee'],
      scrRefs: [{ bookNum: 1, chapterNum: 1, verseNum: 1 }],
    },
  ],

  async getWordList(): Promise<WordListEntry[]> {
    console.log('getting word list');
    return this.wordList;
  },

  async setWordList() {
    console.log('setting word list');
    return false;
  },

  async generateWordList(_projectId, _scope, _scrRef): Promise<boolean> {
    console.log('Generating word list');
    return true;
  },

  notifyUpdate(updateInstructions) {
    logger.info(`Word list data provider engine ran notifyUpdate! ${updateInstructions}`);
  },
};

const WORD_LIST_WEB_VIEW_TYPE = 'paratextWordList.react';

const wordListWebViewProvider: IWebViewProvider = {
  async getWebView(
    savedWebView: SavedWebViewDefinition,
    options: GetWebViewOptions & { projectId: string | undefined },
  ): Promise<WebViewDefinition | undefined> {
    if (savedWebView.webViewType !== WORD_LIST_WEB_VIEW_TYPE)
      throw new Error(
        `${WORD_LIST_WEB_VIEW_TYPE} provider received request to provide a ${savedWebView.webViewType} web view`,
      );

    // Type assert the WebView state since TypeScript doesn't know what type it is
    // TODO: Fix after https://github.com/paranext/paranext-core/issues/585 is done
    const projectId = options.projectId || (savedWebView.state?.projectId as string) || '';

    let projectMetadata: ProjectMetadata | undefined;
    try {
      if (projectId) {
        projectMetadata = await Promise.resolve<ProjectMetadata>(
          papi.projectLookup.getMetadataForProject(projectId),
        );
      }
    } catch (e) {
      logger.error(`Word list web view provider error: Could not get project metadata: ${e}`);
    }

    return {
      title: projectMetadata ? `Word List for project ${projectMetadata.name}` : 'Word List',
      ...savedWebView,
      content: wordListReact,
      styles: wordListReactStyles,
      state: {
        ...savedWebView.state,
        projectId,
      },
    };
  },
};

export async function activate(context: ExecutionActivationContext) {
  logger.info('Word List extension is activating!');

  const WordListDataProviderPromise = papi.dataProvider.registerEngine<WordListDataTypes>(
    'wordList',
    wordListDataProviderEngine,
  );

  const wordListWebViewProviderPromise = papi.webViewProviders.register(
    WORD_LIST_WEB_VIEW_TYPE,
    wordListWebViewProvider,
  );

  papi.webViews.getWebView(WORD_LIST_WEB_VIEW_TYPE, undefined, { existingId: '?' });

  context.registrations.add(
    await papi.commands.registerCommand('paratextWordList.open', async (projectId) => {
      let projectIdForWebView = projectId;

      // If projectIds weren't passed in, get from dialog
      if (!projectIdForWebView) {
        const userProjectIds = await papi.dialogs.showDialog('platform.selectProject', {
          title: 'Open Word List',
          prompt: 'Please select project to open in the word list:',
        });
        if (userProjectIds) projectIdForWebView = userProjectIds;
      }

      // If the user didn't select a project, return null and don't show the word list
      if (!projectIdForWebView) return null;

      return papi.webViews.getWebView(
        WORD_LIST_WEB_VIEW_TYPE,
        { type: 'float', floatSize: { width: 775, height: 815 } },
        {
          projectId: projectIdForWebView,
          // Type assert because GetWebViewOptions is not yet typed to be generic and allow extra inputs
        } as GetWebViewOptions,
      );
    }),
  );

  context.registrations.add(
    await wordListWebViewProviderPromise,
    await WordListDataProviderPromise,
  );

  logger.info('Word List extension is finished activating!');
}

export async function deactivate() {
  logger.info('Word List extension is deactivating!');
  return true;
}
