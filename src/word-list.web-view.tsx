import papi from 'papi-frontend';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ComboBox, RefSelector, ScriptureReference, TextField } from 'papi-components';
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
    hooks: { useSetting, useDataProvider, useData },
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

globalThis.webViewComponent = function WordListWebView({ useWebViewState }: WebViewProps) {
  const [scrRef, setScrRef] = useSetting('platform.verseRef', defaultScrRef);
  const [scope, setScope] = useWebViewState<Scope>('scope', Scope.Book);
  const [wordFilter, setWordFilter] = useState<string>('');
  const [projectId] = useWebViewState<string>('projectId', '');
  const [shownWordList, setShownWordList] = useState<WordListEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordListEntry>();

  const wordListDataProvider = useDataProvider<WordListDataProvider>('wordList');

  const [wordList, , loadingWordList] = useData.WordList<WordListDataTypes, 'WordList'>(
    wordListDataProvider,
    useMemo(
      () => ({
        projectId,
        scope,
        scrRef,
      }),
      [projectId, scope, scrRef],
    ),
    [],
  );

  useEffect(() => {
    setWordFilter('');
    setSelectedWord(undefined);
  }, [projectId, scope, scrRef]);

  useEffect(() => {
    if (!wordList) return;
    setSelectedWord(undefined);
    if (wordFilter === '') {
      setShownWordList(wordList);
      return;
    }
    setShownWordList(
      wordList.filter((entry) => entry.word.toLowerCase().includes(wordFilter.toLowerCase())),
    );
  }, [wordList, loadingWordList, wordFilter]);

  function findSelectedWordEntry(word: string) {
    const clickedEntry = shownWordList.find((entry) => entry.word === word);
    if (clickedEntry) setSelectedWord(clickedEntry);
  }

  function onChangeWordFilter(event: ChangeEvent<HTMLInputElement>) {
    setWordFilter(event.target.value);
  }

  return (
    <div className="word-list">
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
      {loadingWordList ? (
        <p>Generating word list</p>
      ) : (
        wordList &&
        shownWordList.length > 0 && (
          <WordTable
            wordList={shownWordList}
            fullWordCount={wordList.length}
            onWordClick={(word: string) => findSelectedWordEntry(word)}
          />
        )
      )}
      {selectedWord && <WordContentViewer selectedWord={selectedWord} />}
    </div>
  );
};
