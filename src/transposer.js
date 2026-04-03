'use strict';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const FLAT_ALIASES = {
  'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B'
};

// Keys that prefer flats
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm', 'Gbm']);

const SHARP_TO_FLAT = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

function noteToIndex(note) {
  const normalized = FLAT_ALIASES[note] || note;
  return CHROMATIC.indexOf(normalized);
}

function indexToNote(index, preferFlats) {
  const note = CHROMATIC[((index % 12) + 12) % 12];
  if (preferFlats && SHARP_TO_FLAT[note]) {
    return SHARP_TO_FLAT[note];
  }
  return note;
}

function parseChord(chord) {
  const match = chord.match(/^([A-G][b#]?)(.*)/);
  if (!match) return null;
  return { root: match[1], suffix: match[2] };
}

function transposeChord(chord, semitones, preferFlats) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;

  const rootIndex = noteToIndex(parsed.root);
  if (rootIndex === -1) return chord;

  const newIndex = (rootIndex + semitones + 12) % 12;
  const newRoot = indexToNote(newIndex, preferFlats);
  return newRoot + parsed.suffix;
}

function keyRoot(key) {
  // Strip minor/major suffix — only the root note matters for interval calculation
  const m = key.match(/^([A-G][b#]?)/);
  return m ? m[1] : key;
}

function getSemitones(fromKey, toKey) {
  const fromIndex = noteToIndex(keyRoot(fromKey));
  const toIndex = noteToIndex(keyRoot(toKey));
  if (fromIndex === -1 || toIndex === -1) return 0;
  return (toIndex - fromIndex + 12) % 12;
}

function transposeLines(lines, fromKey, toKey) {
  const semitones = getSemitones(fromKey, toKey);
  const preferFlats = FLAT_KEYS.has(toKey);

  return lines.map(line => {
    if (line.isTabBlock) {
      return {
        isTabBlock: true,
        chordsAbove: line.chordsAbove.map(c => ({
          ...c,
          chord: transposeChord(c.chord, semitones, preferFlats),
        })),
        strings: line.strings.map(str => transposeTabString(str, semitones)),
      };
    }
    return line.map(segment => ({
      chord: segment.chord ? transposeChord(segment.chord, semitones, preferFlats) : null,
      lyric: segment.lyric,
    }));
  });
}

function transposeTabString(str, semitones) {
  if (semitones === 0) return str;
  const pipeIdx = str.indexOf('|');
  if (pipeIdx === -1) return str;
  const prefix = str.slice(0, pipeIdx + 1);
  const body = str.slice(pipeIdx + 1);
  const transposed = body.replace(/\d+/g, match => {
    const newFret = Math.max(0, parseInt(match, 10) + semitones);
    const result = String(newFret);
    return result.length < match.length ? result + '-'.repeat(match.length - result.length) : result;
  });
  return prefix + transposed;
}

module.exports = { transposeLines, getSemitones, parseChord, transposeChord };
