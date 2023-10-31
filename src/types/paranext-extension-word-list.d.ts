import { ScriptureReference } from 'papi-components';
declare module 'paranext-extension-word-list' {
  // Add extension types exposed on the papi for other extensions to use here
  // More instructions can be found in the README
  export type WordListEntry = {
    word: string;
    scrRefs: ScriptureReference[];
    scriptureSnippets: string[];
  };
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
