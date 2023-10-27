import papi from 'papi-frontend';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrVers, VerseRef } from '@sillsdev/scripture';
import { Button, RefSelector, ScriptureReference } from 'papi-components';
import { ProjectDataTypes } from 'papi-shared-types';
import { WordListEntry } from './word-list-types';
import WordContentViewer from './word-content-viewer';
import WordTable from './word-table';

const {
  react: {
    hooks: { useSetting, useDialogCallback, useProjectData },
  },
} = papi;

const defaultScrRef: ScriptureReference = {
  bookNum: 1,
  chapterNum: 1,
  verseNum: 1,
};

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

function processBook(bookText: string, bookNum: number) {
  console.log(bookText);
  const chapterTexts: string[] = bookText.split(/\\c\s\d+\s/);
  // Delete the first array element, which contains non-scripture-related content
  chapterTexts.shift();

  const wordList: WordListEntry[] = [];
  chapterTexts.forEach((chapterText, chapterId) => {
    const verseTexts: string[] = chapterText.split(/\\v\s\d+\s/);

    verseTexts.forEach((verseText, verseId) => {
      const wordMatches: RegExpMatchArray | null | undefined =
        verseText?.match(/(?<!\\)\b[a-zA-Z’]+\b/g);

      if (wordMatches) {
        wordMatches.forEach((word) => {
          const newRef: ScriptureReference = {
            bookNum,
            chapterNum: chapterId + 1,
            verseNum: verseId + 1,
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

globalThis.webViewComponent = function WordList() {
  const [scrRef, setScrRef] = useSetting('platform.verseRef', defaultScrRef);
  const [project, selectProject] = useDialogCallback(
    'platform.selectProject',
    useRef({
      prompt: 'Please select a project for Hello World WebView:',
      iconUrl: 'papi-extension://hello-world/assets/offline.svg',
      title: 'Select Hello World Project',
    }).current,
  );
  const [bookText, , isBookTextLoading] = useProjectData.BookUSFM<
    ProjectDataTypes['ParatextStandard'],
    'BookUSFM'
  >(
    project ?? undefined,
    useMemo(() => new VerseRef(scrRef.bookNum, 1, 1, ScrVers.English), [scrRef.bookNum]),
    'Loading chapter',
  );
  const [wordList, setWordList] = useState<WordListEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordListEntry>();

  useEffect(() => {
    if (isBookTextLoading || !bookText) return;
    setSelectedWord(undefined);
    setWordList(processBook(bookText, scrRef.bookNum));
  }, [isBookTextLoading, bookText, project, scrRef.bookNum]);

  function findSelectedWordEntry(word: string) {
    const clickedEntry = wordList.find((entry) => entry.word === word);
    if (clickedEntry) setSelectedWord(clickedEntry);
  }

  return (
    <div className="word-list">
      <RefSelector
        scrRef={scrRef}
        handleSubmit={(newScrRef) => {
          setScrRef(newScrRef);
        }}
      />
      <Button onClick={selectProject}>Select Project</Button>
      {project && <p>Selected Project: {project}</p>}
      {wordList.length > 0 && (
        <WordTable
          wordList={wordList}
          onWordClick={(word: string) => findSelectedWordEntry(word)}
        />
      )}
      {selectedWord && <WordContentViewer selectedWord={selectedWord} />}
    </div>
  );
};
