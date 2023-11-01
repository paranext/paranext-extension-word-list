import { ScriptureReference } from 'papi-components';
import type IDataProvider from 'shared/models/data-provider.interface';
import type { DataProviderDataType } from 'shared/models/data-provider.model';

declare module 'paranext-extension-word-list' {
  export type WordListEntry = {
    word: string;
    scrRefs: ScriptureReference[];
    scriptureSnippets: string[];
  };

  export enum Scope {
    Book = 'Book',
    Chapter = 'Chapter',
    Verse = 'Verse',
  }

  export type WordListDataTypes = {
    WordList: DataProviderDataType<
      undefined,
      WordListEntry[] | undefined,
      WordListEntry[] | undefined
    >;
  };

  export type WordListDataMethods = {
    generateWordList(bookText: string, scrRef: ScriptureReference, scope: string): Promise<boolean>;
  };

  export type WordListDataProvider = IDataProvider<WordListDataTypes> & WordListDataMethods;
}

declare module 'papi-shared-types' {
  export interface CommandHandlers {
    /**
     * Opens a new word list WebView and returns the WebView id
     * @param projectId Project ID to open with the word list. Prompts the user to
     * select project if not provided
     * @returns WebView id for new word list WebView or `null` if the user canceled the dialog
     */
    'paratextWordList.open': (projectId?: string) => Promise<string | null | undefined>;
  }
}
