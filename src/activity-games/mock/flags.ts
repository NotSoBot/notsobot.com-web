// A few flags drawn as svg for the dev mocks' fake game (the real ones are the api's pngs). Different shapes on
// purpose: wide, square and Nepal's, to check the flag is never stretched


function svg(width: number, height: number, body: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width * 640 / Math.max(width, height)}' height='${height * 640 / Math.max(width, height)}'>${body}</svg>`)}`;
}

function vertical(colors: Array<string>, width = 3, height = 2): string {
  const part = width / colors.length;
  return svg(width, height, colors.map((color, index) => `<rect x='${index * part}' width='${part + 0.01}' height='${height}' fill='${color}'/>`).join(''));
}

function horizontal(colors: Array<string>, width = 3, height = 2, weights?: Array<number>): string {
  const total = (weights ?? colors.map(() => 1)).reduce((sum, value) => sum + value, 0);
  let y = 0;
  return svg(width, height, colors.map((color, index) => {
    const part = height * (weights?.[index] ?? 1) / total;
    const rect = `<rect y='${y}' width='${width}' height='${part + 0.01}' fill='${color}'/>`;
    y += part;
    return rect;
  }).join(''));
}


export interface MockCountry {
  code: string,
  name: string,
  region: string,
  aliases?: Array<string>,
  flag: string,
}

export const MOCK_COUNTRIES: Array<MockCountry> = [
  {code: 'fr', name: 'France', region: 'Europe', flag: vertical(['#002654', '#ffffff', '#ce1126'])},
  {code: 'it', name: 'Italy', region: 'Europe', flag: vertical(['#009246', '#ffffff', '#ce2b37'])},
  {code: 'de', name: 'Germany', region: 'Europe', flag: horizontal(['#000000', '#dd0000', '#ffce00'], 5, 3)},
  {code: 'ua', name: 'Ukraine', region: 'Europe', flag: horizontal(['#0057b7', '#ffd700'])},
  {code: 'at', name: 'Austria', region: 'Europe', flag: horizontal(['#c8102e', '#ffffff', '#c8102e'])},
  {code: 'co', name: 'Colombia', region: 'South America', flag: horizontal(['#fcd116', '#003893', '#ce1126'], 3, 2, [2, 1, 1])},
  {code: 'id', name: 'Indonesia', region: 'Asia', flag: horizontal(['#ce1126', '#ffffff'])},
  {
    code: 'jp', name: 'Japan', region: 'Asia',
    flag: svg(3, 2, `<rect width='3' height='2' fill='#ffffff'/><circle cx='1.5' cy='1' r='0.6' fill='#bc002d'/>`),
  },
  {
    code: 'bd', name: 'Bangladesh', region: 'Asia',
    flag: svg(5, 3, `<rect width='5' height='3' fill='#006a4e'/><circle cx='2.25' cy='1.5' r='1' fill='#f42a41'/>`),
  },
  {
    code: 'ch', name: 'Switzerland', region: 'Europe',
    flag: svg(1, 1, `<rect width='1' height='1' fill='#da291c'/><rect x='0.4' y='0.19' width='0.2' height='0.62' fill='#fff'/><rect x='0.19' y='0.4' width='0.62' height='0.2' fill='#fff'/>`),
  },
  {
    code: 'se', name: 'Sweden', region: 'Europe',
    flag: svg(16, 10, `<rect width='16' height='10' fill='#006aa7'/><rect x='5' width='2' height='10' fill='#fecc00'/><rect y='4' width='16' height='2' fill='#fecc00'/>`),
  },
  {
    code: 'qa', name: 'Qatar', region: 'Asia',
    flag: svg(28, 11, `<rect width='28' height='11' fill='#8a1538'/><path d='M0 0h8l2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61 2 0.61-2 0.61-2 0.02H0z' fill='#fff'/>`),
  },
  {
    code: 'np', name: 'Nepal', region: 'Asia', aliases: ['Federal Democratic Republic of Nepal'],
    flag: svg(4, 5, `<path d='M0.1 0.1 3.7 2.4H1.4L3.7 4.9H0.1z' fill='#dc143c' stroke='#003893' stroke-width='0.2'/><circle cx='1.2' cy='3.6' r='0.45' fill='#fff'/><circle cx='1.2' cy='1.5' r='0.35' fill='#fff'/>`),
  },
  {
    code: 'gb', name: 'United Kingdom', region: 'Europe', aliases: ['UK', 'Britain', 'Great Britain'],
    flag: svg(2, 1, `<rect width='2' height='1' fill='#012169'/><path d='M0 0 2 1M2 0 0 1' stroke='#fff' stroke-width='0.2'/><path d='M0 0 2 1M2 0 0 1' stroke='#c8102e' stroke-width='0.07'/><path d='M1 0v1M0 0.5h2' stroke='#fff' stroke-width='0.33'/><path d='M1 0v1M0 0.5h2' stroke='#c8102e' stroke-width='0.2'/>`),
  },
];
