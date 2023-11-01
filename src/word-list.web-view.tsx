import papi from 'papi-frontend';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ScrVers, VerseRef } from '@sillsdev/scripture';
import { ComboBox, RefSelector, ScriptureReference, TextField } from 'papi-components';
import { ProjectDataTypes } from 'papi-shared-types';
import type { WebViewProps } from 'shared/data/web-view.model';
import type {
  WordListEntry,
  WordListDataProvider,
  WordListDataTypes,
} from 'paranext-extension-word-list';
import WordContentViewer from './word-content-viewer';
import WordTable from './word-table';

const {
  react: {
    hooks: { useSetting, useDataProvider, useData, useProjectData },
  },
} = papi;

const defaultScrRef: ScriptureReference = {
  bookNum: 1,
  chapterNum: 1,
  verseNum: 1,
};

enum Scope {
  Book = 'Book',
  Chapter = 'Chapter',
  Verse = 'Verse',
}

function compareRefs(a: ScriptureReference, b: ScriptureReference): boolean {
  return a.bookNum === b.bookNum && a.chapterNum === b.chapterNum && a.verseNum === b.verseNum;
}

function getDesiredOccurrence(verseText: string, word: string, occurrence: number): number {
  const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'ig');

  let match = regex.exec(verseText.toLowerCase());
  let occurrenceIndex = 1;

  while (match !== null) {
    if (occurrenceIndex === occurrence) {
      return match.index;
    }
    occurrenceIndex += 1;
    match = regex.exec(verseText.toLowerCase());
  }
  return -1;
}

function getScriptureSnippet(verseText: string, word: string, occurrence: number = 1): string {
  if (!verseText) throw new Error(`No verse text available.`);

  const index = getDesiredOccurrence(verseText, word, occurrence);

  let snippet = '';
  const surroundingCharacters = 40;

  if (index !== -1) {
    let startIndex = Math.max(0, index - surroundingCharacters);
    let endIndex = Math.min(verseText.length, index + word.length + surroundingCharacters);

    while (startIndex > 0 && !/\s/.test(verseText[startIndex - 1])) {
      startIndex -= 1;
    }

    while (endIndex < verseText.length - 1 && !/\s/.test(verseText[endIndex])) {
      endIndex += 1;
    }

    snippet = verseText.substring(startIndex, endIndex);

    const wordStartIndex = index - startIndex;
    const wordEndIndex = wordStartIndex + word.length;
    const beforeWord = snippet.slice(0, wordStartIndex);
    const afterWord = snippet.slice(wordEndIndex);
    const upperCaseWord = snippet.slice(wordStartIndex, wordEndIndex).toUpperCase();

    snippet = beforeWord + upperCaseWord + afterWord;
  }
  return snippet;
}

function processBook(bookText: string, scrRef: ScriptureReference, scope: string) {
  const { bookNum } = scrRef;

  const chapterTexts: string[] = bookText.split(/\\c\s\d+\s/);
  // Delete the first array element, which contains non-scripture-related content
  chapterTexts.shift();

  const wordList: WordListEntry[] = [];
  chapterTexts.forEach((chapterText, chapterId) => {
    const chapterNum = chapterId + 1;
    if (scope !== Scope.Book && scrRef.chapterNum !== chapterNum) {
      return;
    }

    const verseTexts: string[] = chapterText.split(/\\v\s\d+\s/);
    // Delete the first array element, which contains non-scripture-related content
    verseTexts.shift();

    verseTexts.forEach((verseText, verseId) => {
      const verseNum = verseId + 1;
      if (scope === Scope.Verse && scrRef.verseNum !== verseNum) {
        return;
      }

      const wordMatches: RegExpMatchArray | null | undefined =
        verseText?.match(/(?<!\\)\b[a-zA-Z’]+\b/g);

      if (wordMatches) {
        wordMatches.forEach((word) => {
          const newRef: ScriptureReference = {
            bookNum,
            chapterNum,
            verseNum,
          };
          const existingEntry = wordList.find((entry) => entry.word === word.toLocaleLowerCase());
          if (existingEntry) {
            existingEntry.scrRefs.push(newRef);
            const occurrence = existingEntry.scrRefs.reduce(
              (matches, ref) => (compareRefs(ref, newRef) ? matches + 1 : matches),
              0,
            );
            existingEntry.scriptureSnippets.push(getScriptureSnippet(verseText, word, occurrence));
          } else {
            const newEntry: WordListEntry = {
              word: word.toLocaleLowerCase(),
              scrRefs: [newRef],
              scriptureSnippets: [getScriptureSnippet(verseText, word)],
            };
            wordList.push(newEntry);
          }
        });
      }
    });
  });
  return wordList;
}

globalThis.webViewComponent = function WordListWebView({ useWebViewState }: WebViewProps) {
  const [scrRef, setScrRef] = useSetting('platform.verseRef', defaultScrRef);
  const [scope, setScope] = useWebViewState<string>('scope', 'Book');
  const [wordFilter, setWordFilter] = useState<string>('');
  const [projectId] = useWebViewState<string>('projectId', '');
  const [bookText, , isBookTextLoading] = useProjectData.BookUSFM<
    ProjectDataTypes['ParatextStandard'],
    'BookUSFM'
  >(
    projectId ?? undefined,
    useMemo(() => new VerseRef(scrRef.bookNum, 1, 1, ScrVers.English), [scrRef.bookNum]),
    'Loading chapter',
  );
  const [wordList, setWordList] = useState<WordListEntry[]>([]);
  const [shownWordList, setShownWordList] = useState<WordListEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordListEntry>();

  const wordListDataProvider = useDataProvider<WordListDataProvider>('wordList');

  const [wordListDP, , loadingWordListDP] = useData.WordList<WordListDataTypes, 'WordList'>(
    wordListDataProvider,
    undefined,
    [],
  );

  useEffect(() => {
    if (isBookTextLoading || !bookText) return;
    setWordFilter('');
    setSelectedWord(undefined);
    setWordList(processBook(bookText, scrRef, scope));
    wordListDataProvider?.generateWordList(bookText, scrRef, scope);
  }, [isBookTextLoading, bookText, projectId, scope, scrRef]);

  useEffect(() => {
    setSelectedWord(undefined);
    if (wordFilter === '') {
      setShownWordList(wordList);
      return;
    }
    setShownWordList(
      wordList.filter((entry) => entry.word.toLowerCase().includes(wordFilter.toLowerCase())),
    );
  }, [wordList, wordFilter]);

  function findSelectedWordEntry(word: string) {
    const clickedEntry = shownWordList.find((entry) => entry.word === word);
    if (clickedEntry) setSelectedWord(clickedEntry);
  }

  function onChangeWordFilter(event: ChangeEvent<HTMLInputElement>) {
    setWordFilter(event.target.value);
  }

  return (
    <div className="word-list">
      {wordListDP && wordListDP.length > 0 && wordListDP[0].word}
      {loadingWordListDP && <p>loading</p>}
      <RefSelector
        scrRef={scrRef}
        handleSubmit={(newScrRef) => {
          setScrRef(newScrRef);
        }}
      />
      <div className="filters">
        <ComboBox
          title="Scope"
          value={scope}
          onChange={(_event, value) => setScope(value as Scope)}
          options={Object.values(Scope)}
          isClearable={false}
          width={150}
        />
        <TextField
          label="Word filter"
          value={wordFilter}
          onChange={(event) => onChangeWordFilter(event)}
          isFullWidth
        />
      </div>
      {shownWordList.length > 0 && (
        <WordTable
          wordList={shownWordList}
          fullWordCount={wordList.length}
          onWordClick={(word: string) => findSelectedWordEntry(word)}
        />
      )}
      {selectedWord && <WordContentViewer selectedWord={selectedWord} />}
    </div>
  );
};
