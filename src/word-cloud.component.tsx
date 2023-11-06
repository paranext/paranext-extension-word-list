import { useMemo } from 'react';
import type { WordListEntry } from 'paranext-extension-word-list';
import { Wordcloud } from '@visx/wordcloud';
import { Text } from '@visx/text';
import { scaleLog } from '@visx/scale';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

type WordCloudProps = {
  wordList: WordListEntry[];
};

export interface CloudData {
  text: string;
  value: number;
}

const colors = ['#143059', '#2F6B9A', '#82a6c2'];

export default function WordCloud({ wordList }: WordCloudProps) {
  const cloudData = useMemo(() => {
    const cloudDataArray: CloudData[] = [];
    wordList.forEach((word) => {
      cloudDataArray.push({ text: word.word, value: word.scrRefs.length });
    });
    return cloudDataArray;
  }, [wordList]);

  const fontScale = scaleLog({
    domain: [
      Math.min(...cloudData.map((w) => w.value)),
      Math.max(...cloudData.map((w) => w.value)),
    ],
    range: [10, 100],
  });
  const fontSizeSetter = (data: CloudData) => fontScale(data.value);

  return (
    <ParentSize>
      {({ width }) => (
        <Wordcloud
          height={500}
          rotate={0}
          width={width}
          fontSize={fontSizeSetter}
          font="Impact"
          padding={2}
          spiral="archimedean"
          random={() => {
            return 0.5;
          }}
          words={cloudData}
        >
          {(cloudWords) =>
            cloudWords.map((w, i) => (
              <Text
                key={w.text}
                fill={colors[i % colors.length]}
                rotate={0}
                textAnchor="middle"
                transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                fontSize={w.size}
                fontFamily={w.font}
              >
                {w.text}
              </Text>
            ))
          }
        </Wordcloud>
      )}
    </ParentSize>
  );
}
