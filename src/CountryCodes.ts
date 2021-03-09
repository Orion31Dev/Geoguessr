const countryCodes = require('./country-codes.json');

const cArr: {[key: string]: any}= [];

for (let c of countryCodes) {
  let cc = c as any;

  cArr[cc["Alpha-3 code"]] = cc["Alpha-2 code"];
}

export function isoA3ToA2(a3: string) {
  return cArr[a3];
}