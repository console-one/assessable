export function truncate(toTruncate, prefix='', maxLength = 140) {
  let isTooLong = (toTruncate.length > (maxLength - prefix.length));
  if (isTooLong) {
    let space = (maxLength - prefix.length) - 3;
    let firstSubstringLength = Math.floor(space / 2);
    let secondSubstringLength = space - firstSubstringLength;
    let stringTailStart = toTruncate.length - secondSubstringLength - 1;
    let truncedSubstring = toTruncate.slice(0, firstSubstringLength) + '...' + toTruncate.slice(stringTailStart)
    return prefix + truncedSubstring;
  } else {
    return prefix + toTruncate;
  }
}

export function computeLPSArray(pat) {
  // https://www.geeksforgeeks.org/kmp-algorithm-for-pattern-searching/
  // length of the previous longest prefix suffix
  var len = 0;
  var i = 1;
  let lps = new Array(pat.length);
  lps[0] = 0; // lps[0] is always 0

  // the loop calculates lps[i] for i = 1 to M-1
  while (i < pat.length) {
    if (pat.charAt(i) == pat.charAt(len)) {
      len++;
      lps[i] = len;
      i++;
    }
    else // (pat[i] != pat[len])
    {
      // This is tricky. Consider the example.
      // AAACAAAA and i = 7. The idea is similar
      // to search step.
      if (len != 0) {
        len = lps[len - 1];
      } else {
        lps[i] = len;
        i++;
      }
    }
  }
  return lps;
}